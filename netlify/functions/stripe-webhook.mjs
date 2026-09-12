import crypto from "node:crypto";
import nodemailer from "nodemailer";

/**
 * Libera o acesso à plataforma quando o Stripe confirma um pagamento, e avisa o Meta
 * de que a venda aconteceu.
 *
 * Três coisas acontecem aqui, nesta ordem e por este motivo:
 *
 *   1. A assinatura do Stripe é conferida sobre os bytes crus do corpo. Sem isso,
 *      qualquer pessoa que descubra a URL cria contas de graça.
 *   2. O Purchase vai para a Conversions API do Meta. O comprador termina a compra no
 *      domínio do Stripe, onde não existe pixel — este é o único lugar de onde a
 *      campanha pode ficar sabendo da venda.
 *   3. A conta é criada e a senha é enviada por e-mail.
 *
 * O passo 2 vem antes do 3 de propósito: o dinheiro já entrou, então a venda é real
 * mesmo que a criação da conta falhe e o Stripe reenvie o webhook depois.
 */

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || `Wagner Gois <${GMAIL_USER}>`;
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || GMAIL_USER;

const SITE_URL = "https://appmanualcompleto.com";
const IDENTITY = "https://identitytoolkit.googleapis.com/v1/accounts";

/**
 * Conversions API do Meta.
 *
 * O Purchase não pode mais nascer no navegador: o comprador termina a compra no
 * domínio do Stripe, onde é impossível instalar pixel. Sem este envio, a venda
 * simplesmente não existe para a campanha — o anúncio aparece sem resultado mesmo
 * tendo vendido.
 *
 * A URL de origem é a página de vendas, não esta plataforma: é de lá que a pessoa
 * saiu para pagar, e é essa origem que o Meta precisa reconhecer.
 */
const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_CAPI_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // só para a aba "Testar eventos"
const META_API_VERSION = "v21.0";
const PAGINA_DE_VENDAS = "https://www.manualcompletodesobrevivencia.com/";

/** Moedas sem centavos: nelas o valor do Stripe já vem na unidade cheia. */
const MOEDAS_SEM_CENTAVOS = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw",
  "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

/** Janela aceita entre o carimbo do Stripe e agora, contra reenvio de requisição gravada. */
const TOLERANCIA_SEGUNDOS = 60 * 5;

/**
 * Os dois eventos que significam dinheiro confirmado.
 *
 * No cartão, o checkout.session.completed já chega pago. No Pix não: a sessão fecha
 * com payment_status "unpaid" enquanto o comprador ainda vai pagar, e a confirmação
 * chega depois, em async_payment_succeeded. Tratar os dois como "pago" liberaria
 * acesso para quem só abriu o QR Code e foi embora — por isso quem decide é sempre o
 * payment_status, nunca o nome do evento.
 */
const EVENTOS_DE_PAGAMENTO = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

/**
 * Confere a assinatura do Stripe sobre os BYTES CRUS do corpo.
 *
 * O cabeçalho vem no formato "t=<carimbo>,v1=<hmac>" e o que é assinado é a
 * concatenação "<carimbo>.<corpo>". Qualquer reserialização do JSON — um JSON.parse
 * seguido de JSON.stringify, por exemplo — muda os bytes e invalida tudo.
 */
function assinaturaConfere(corpoCru, cabecalho, segredo) {
  if (!cabecalho) return { ok: false, motivo: "cabeçalho ausente" };

  const partes = Object.fromEntries(
    cabecalho.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );

  const carimbo = Number(partes.t);
  if (!Number.isFinite(carimbo)) return { ok: false, motivo: "carimbo inválido" };

  const idade = Math.abs(Math.floor(Date.now() / 1000) - carimbo);
  if (idade > TOLERANCIA_SEGUNDOS) return { ok: false, motivo: `carimbo velho (${idade}s)` };

  const esperado = crypto
    .createHmac("sha256", segredo)
    .update(Buffer.concat([Buffer.from(`${carimbo}.`, "utf8"), corpoCru]))
    .digest("hex");

  // O Stripe pode mandar mais de uma v1 durante rotação de segredo.
  const recebidas = cabecalho
    .split(",")
    .filter((p) => p.trim().startsWith("v1="))
    .map((p) => p.trim().slice(3));

  const confere = recebidas.some((recebida) => {
    const a = Buffer.from(esperado, "utf8");
    const b = Buffer.from(recebida, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });

  return confere ? { ok: true } : { ok: false, motivo: "hmac não confere" };
}

function extrairEmail(sessao) {
  const bruto = sessao?.customer_details?.email ?? sessao?.customer_email;
  return typeof bruto === "string" ? bruto.trim().toLowerCase() : undefined;
}

// Senha única por comprador. Alfabeto legível (sem 0/O/1/l), com dígito e maiúscula
// garantidos para satisfazer qualquer política.
function gerarSenha() {
  const minusculas = "abcdefghijkmnpqrstuvwxyz";
  const maiusculas = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digitos = "23456789";
  const todos = minusculas + maiusculas + digitos;
  const sortear = (conjunto) => conjunto[crypto.randomInt(conjunto.length)];
  let senha = sortear(maiusculas) + sortear(digitos);
  for (let i = 0; i < 8; i++) senha += sortear(todos);
  return senha.split("").sort(() => crypto.randomInt(3) - 1).join("");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

async function entregar({ to, subject, html, text }) {
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], reply_to: MAIL_REPLY_TO, subject, html, text }),
    });
    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return;
  }
  await transporter.sendMail({ from: MAIL_FROM, replyTo: MAIL_REPLY_TO, to, subject, html, text });
}

async function enviarEmailDeAcesso(to, senha, ehNovo) {
  const acesso = ehNovo
    ? `<p style="margin:0 0 6px"><strong>E-mail:</strong> ${to}</p>
       <p style="margin:0 0 6px"><strong>Senha:</strong> <span style="font-family:monospace;font-size:18px;color:#b45309">${senha}</span></p>
       <p style="margin:12px 0 0;font-size:13px;color:#64748b">Recomendamos trocar a senha depois de entrar.</p>`
    : `<p style="margin:0">Você já tem acesso. Entre com o e-mail <strong>${to}</strong> e a senha que enviamos na sua primeira compra. Esqueceu? Use a opção "Esqueceu a senha?" no site.</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#0f172a;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
      <div style="background:#0f172a;padding:20px 24px;border-bottom:3px solid #f59e0b">
        <span style="color:#f59e0b;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px">Manual de Sobrevivência • Método 5P</span>
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">Seu acesso foi liberado</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.5">Obrigado pela sua compra! Aqui estão seus dados de acesso ao Manual Completo de Sobrevivência Apocalíptica:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;color:#0f172a;font-size:15px">${acesso}</div>
        <a href="${SITE_URL}" style="display:inline-block;margin:20px 0 6px;background:#f59e0b;color:#0f172a;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">Acessar o Manual</a>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Este e-mail foi enviado porque a sua compra do Manual Completo de Sobrevivência Apocalíptica foi aprovada. Em caso de dúvida, basta responder esta mensagem.</p>
      </div>
    </div>
  </body></html>`;

  const text = ehNovo
    ? `Seu acesso foi liberado!\n\nE-mail: ${to}\nSenha: ${senha}\n\nAcesse: ${SITE_URL}\n(recomendamos trocar a senha depois de entrar)`
    : `Você já tem acesso. Entre em ${SITE_URL} com o e-mail ${to} e sua senha. Esqueceu? Use "Esqueceu a senha?" no site.`;

  await entregar({ to, subject: "Seu acesso ao Manual Completo de Sobrevivência", html, text });
}

/**
 * Registro do comprador. Nunca bloqueia a resposta.
 *
 * O clientReference guarda os identificadores do clique no anúncio, empacotados pela
 * página de vendas. Não são usados ainda: existem para que a Conversions API do Meta
 * possa, mais tarde, disparar o Purchase já atribuído ao anúncio que gerou a venda.
 * Jogá-los fora agora tornaria essa atribuição irrecuperável depois.
 */
async function registrarCompra(idToken, uid, email, sessao) {
  if (!idToken || !PROJECT_ID) return;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: uid },
        email: { stringValue: email },
        createdAt: { stringValue: new Date().toISOString() },
        role: { stringValue: "user" },
        stripePurchase: { booleanValue: true },
        stripeSessionId: { stringValue: sessao?.id ?? "" },
        purchaseStatus: { stringValue: sessao?.payment_status ?? "" },
        amountTotal: { integerValue: String(sessao?.amount_total ?? 0) },
        currency: { stringValue: sessao?.currency ?? "" },
        clientReference: { stringValue: sessao?.client_reference_id ?? "" },
        utmSource: { stringValue: sessao?.metadata?.utm_source ?? "" },
        utmCampaign: { stringValue: sessao?.metadata?.utm_campaign ?? "" },
      },
    }),
  }).catch(() => {});
}

/** O Meta exige os dados pessoais em SHA-256; fbc e fbp vão crus, de propósito. */
function hashSha256(valor) {
  return crypto.createHash("sha256").update(valor, "utf8").digest("hex");
}

/**
 * Desempacota o client_reference_id do checkout hospedado.
 *
 * Só entra em ação no caminho de contingência: a sessão criada pelo nosso servidor traz
 * os mesmos dados em metadata, sem limite de 200 caracteres e sem codificação.
 *
 * Formato "fb1-<base64url(fbc|fbp)>". O prefixo é a versão: se um dia o conteúdo
 * mudar, o prefixo muda junto e este código continua sabendo ler o formato antigo.
 * Qualquer coisa fora do esperado devolve vazio — perder a atribuição é ruim, mas
 * derrubar o envio inteiro por causa dela seria pior.
 */
function desempacotarReferencia(bruto) {
  if (typeof bruto !== "string" || !bruto.startsWith("fb1-")) return {};
  try {
    const b64 = bruto.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    const [fbc, fbp] = Buffer.from(b64, "base64").toString("utf8").split("|");
    return { fbc: fbc || undefined, fbp: fbp || undefined };
  } catch {
    return {};
  }
}

function valorNaUnidadeCheia(quantia, moeda) {
  if (typeof quantia !== "number") return undefined;
  return MOEDAS_SEM_CENTAVOS.has(String(moeda).toLowerCase()) ? quantia : quantia / 100;
}

/**
 * Envia o Purchase ao Meta. Nunca lança: uma falha aqui não pode custar o acesso de
 * quem pagou.
 *
 * O event_id é o id da sessão do Stripe. Se o Stripe reenviar o webhook — e ele
 * reenvia —, o Meta reconhece o mesmo evento e não conta a venda duas vezes.
 *
 * Não enviamos IP nem user-agent: quem chama este endpoint é o servidor do Stripe,
 * então os dados de conexão disponíveis aqui são DELE, não do comprador. Mandá-los
 * sujaria a qualidade da correspondência em vez de melhorá-la.
 */
async function enviarPurchaseAoMeta(sessao, email, carimboDoEvento) {
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
    console.warn("Conversions API não configurada (META_PIXEL_ID / META_CAPI_ACCESS_TOKEN): Purchase não enviado.");
    return;
  }

  // Duas origens, por ordem de riqueza.
  //
  // O checkout embutido cria a sessão pelo nosso servidor e escreve tudo em metadata —
  // inclusive o IP e o user-agent do comprador, que ali são autênticos porque quem
  // chamou a função foi o navegador dele.
  //
  // O link hospedado do Stripe (a rede de segurança, usada se a sessão embutida falhar)
  // não tem metadata: ele só consegue carregar o client_reference_id, com fbc e fbp
  // espremidos em 200 caracteres. Vale menos, mas é melhor que nada — e enquanto esse
  // caminho existir, este código precisa entender os dois.
  const meta = sessao?.metadata ?? {};
  const doReference = desempacotarReferencia(sessao?.client_reference_id);

  const fbc = meta.fbc || doReference.fbc;
  const fbp = meta.fbp || doReference.fbp;

  const dadosDoUsuario = { em: [hashSha256(email)] };
  if (fbc) dadosDoUsuario.fbc = fbc;
  if (fbp) dadosDoUsuario.fbp = fbp;
  if (meta.client_ip) dadosDoUsuario.client_ip_address = meta.client_ip;
  if (meta.client_user_agent) dadosDoUsuario.client_user_agent = meta.client_user_agent;

  const corpo = {
    data: [
      {
        event_name: "Purchase",
        event_time: carimboDoEvento,
        event_id: sessao?.id,
        action_source: "website",
        event_source_url: PAGINA_DE_VENDAS,
        user_data: dadosDoUsuario,
        custom_data: {
          currency: String(sessao?.currency || "brl").toUpperCase(),
          value: valorNaUnidadeCheia(sessao?.amount_total, sessao?.currency),
          content_name: "Método 5P — Manual Completo de Sobrevivência",
        },
      },
    ],
    // No corpo, e não na querystring: assim o token não vaza em log de acesso.
    access_token: META_CAPI_TOKEN,
  };
  if (META_TEST_EVENT_CODE) corpo.test_event_code = META_TEST_EVENT_CODE;

  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) },
  );

  const resposta = await res.text();
  if (!res.ok) {
    throw new Error(`Meta ${res.status}: ${resposta.slice(0, 300)}`);
  }
  console.log(
    `Purchase enviado ao Meta (sessão ${sessao?.id}, fbc:${!!fbc} fbp:${!!fbp} ` +
    `ip:${!!meta.client_ip} ua:${!!meta.client_user_agent}): ${resposta.slice(0, 160)}`,
  );
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  const podeEnviarEmail = !!RESEND_API_KEY || !!(GMAIL_USER && GMAIL_APP_PASSWORD);
  if (!WEBHOOK_SECRET || !podeEnviarEmail) {
    console.error("Webhook mal configurado: falta STRIPE_WEBHOOK_SECRET ou um canal de envio (RESEND_API_KEY ou credenciais Gmail).");
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook não configurado" }) };
  }

  const corpoCru = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");

  const cabecalho =
    event.headers?.["stripe-signature"] ?? event.headers?.["Stripe-Signature"];

  const veredito = assinaturaConfere(corpoCru, cabecalho, WEBHOOK_SECRET);
  if (!veredito.ok) {
    console.warn(`Webhook recusado: ${veredito.motivo}`);
    return { statusCode: 401, body: JSON.stringify({ error: "Assinatura inválida" }) };
  }

  let evento;
  try {
    evento = JSON.parse(corpoCru.toString("utf8"));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Corpo inválido" }) };
  }

  if (!EVENTOS_DE_PAGAMENTO.has(evento?.type)) {
    // Responder 200 impede o Stripe de ficar reenviando o que não nos interessa.
    return { statusCode: 200, body: JSON.stringify({ message: `Evento ignorado: ${evento?.type}` }) };
  }

  const sessao = evento?.data?.object;

  // Quem manda é o payment_status, não o nome do evento: no Pix a sessão fecha antes
  // de o dinheiro entrar.
  if (sessao?.payment_status !== "paid") {
    console.log(`Sessão ${sessao?.id} ainda não paga (${sessao?.payment_status}) — aguardando confirmação.`);
    return { statusCode: 200, body: JSON.stringify({ message: "Pagamento pendente" }) };
  }

  const email = extrairEmail(sessao);
  if (!email) {
    console.error(`Sessão ${sessao?.id} paga, mas sem e-mail do comprador.`);
    return { statusCode: 400, body: JSON.stringify({ error: "E-mail não fornecido" }) };
  }

  // O dinheiro entrou: para a campanha, a venda aconteceu — independentemente do que
  // vier depois. Por isso o Purchase é enviado antes de criar a conta, e não no fim:
  // se a criação falhar e o Stripe reenviar, o event_id repetido faz o Meta reconhecer
  // o mesmo evento em vez de contar duas vendas.
  try {
    await enviarPurchaseAoMeta(sessao, email, evento?.created ?? Math.floor(Date.now() / 1000));
  } catch (erroMeta) {
    console.error(`Falha ao enviar Purchase ao Meta (sessão ${sessao?.id}):`, erroMeta?.message || erroMeta);
  }

  try {
    const senha = gerarSenha();
    const signUp = await fetch(`${IDENTITY}:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
    });
    const dadosSignUp = await signUp.json();

    const ehNovo = signUp.ok;
    if (!ehNovo && dadosSignUp?.error?.message !== "EMAIL_EXISTS") {
      console.error("Falha ao criar conta:", dadosSignUp?.error?.message);
      return { statusCode: 500, body: JSON.stringify({ error: "Falha ao criar conta" }) };
    }

    if (ehNovo) {
      await registrarCompra(dadosSignUp.idToken, dadosSignUp.localId, email, sessao);
    }

    try {
      await enviarEmailDeAcesso(email, senha, ehNovo);
    } catch (erroEmail) {
      // A conta já existe neste ponto. Uma retentativa do Stripe só cairia em
      // EMAIL_EXISTS e mandaria o texto de "você já tem acesso" — sem nunca entregar a
      // senha. Melhor confirmar o recebimento e deixar o comprador usar "Esqueceu a
      // senha?" do que provocar uma enxurrada de retentativas.
      console.error(`Falha ao enviar e-mail de acesso para ${email}:`, erroEmail?.message || erroEmail);
      return { statusCode: 200, body: JSON.stringify({ success: true, mailFailed: true }) };
    }

    console.log(`Acesso liberado para ${email} (novo: ${ehNovo}, sessão: ${sessao?.id})`);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Erro ao processar o webhook:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno" }) };
  }
};
