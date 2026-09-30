import crypto from "node:crypto";
import nodemailer from "nodemailer";

/**
 * O webhook da Hotmart: é ele que libera o acesso de quem comprou.
 *
 * Faz o mesmo que o stripe-webhook.mjs — cria a conta, sorteia a senha e manda no
 * e-mail do comprador —, trocando só as duas pontas:
 *
 *   · a autenticação, que na Hotmart é um token fixo no cabeçalho (hottok), e não
 *     uma assinatura HMAC do corpo;
 *   · a leitura da venda, porque o corpo da Hotmart não se parece em nada com o do
 *     Stripe: o e-mail mora em data.buyer.email e o estado em data.purchase.status.
 *
 * O miolo está duplicado do stripe-webhook de propósito, e não extraído para um
 * módulo comum: o arquivo do Stripe está no ar recebendo dinheiro de verdade, e mexer
 * nele para acomodar a Hotmart seria arriscar a venda que já funciona por causa da
 * que ainda não existe. Quando o Stripe sair, a duplicação sai junto com ele.
 *
 * O PURCHASE DO META NÃO SAI DAQUI POR PADRÃO
 *
 * A Hotmart tem a integração dela com o Pixel e manda o Purchase sozinha. Se esta
 * função mandasse também, a mesma venda entraria duas vezes no Gerenciador de Eventos
 * — os dois lados geram event_id diferente e o Meta não teria como juntá-los. Só
 * ligue HOTMART_ENVIA_PURCHASE_AO_META=1 se você TIVER desligado o Pixel na Hotmart,
 * e configure também META_PIXEL_ID e META_CAPI_ACCESS_TOKEN.
 *
 * Quando ligado, o envio acontece DEPOIS do e-mail de acesso e com prazo curto: aqui
 * o que não pode falhar é a entrega ao comprador, não o rastreamento do anúncio.
 */

const HOTTOK = process.env.HOTMART_HOTTOK;

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || `Wagner Gois <${GMAIL_USER}>`;
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || GMAIL_USER;

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_CAPI_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // só para a aba "Testar eventos"
// Desligado por padrão: ligar só depois de desligar o Pixel na Hotmart (veja o topo).
const META_LIGADO = /^(1|true|sim)$/i.test(process.env.HOTMART_ENVIA_PURCHASE_AO_META ?? "");
const META_API_VERSION = "v21.0";
const META_PRAZO_MS = 4000;
const PAGINA_DE_VENDAS = "https://www.manualcompletodesobrevivencia.com/";

const SITE_URL = "https://appmanualcompleto.com";
const IDENTITY = "https://identitytoolkit.googleapis.com/v1/accounts";

/** Os eventos que liberam acesso. O resto é reconhecido e ignorado. */
const EVENTOS_DE_LIBERACAO = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);

/*
 * NÃO EXISTE LISTA DOS EVENTOS DE REEMBOLSO AQUI, E ISSO É DE PROPÓSITO.
 *
 * A tela da Hotmart mostra rótulos ("Refund Request", "Chargeback", "Purchased
 * canceled"), não os nomes que chegam no corpo do POST. Escrever esses nomes de
 * memória já deu errado uma vez, e um nome errado numa lista é pior do que lista
 * nenhuma: o evento cai silenciosamente no "ignorado" e ninguém percebe.
 *
 * Então a regra é por exclusão: o que não libera acesso é registrado no log com o
 * nome exato que veio, o e-mail e a transação. O log passa a ser a fonte da verdade
 * sobre os nomes, em vez do meu palpite.
 *
 * Tirar o acesso continua sendo manual: decidir o que fazer com a conta de quem pediu
 * reembolso (apagar? bloquear? manter e marcar?) é decisão de negócio, não de código.
 */

/** Compara sem dar pista pelo tempo de resposta. */
function tokenConfere(recebido, esperado) {
  if (typeof recebido !== "string" || !esperado) return false;
  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalizarEmail(bruto) {
  return typeof bruto === "string" && bruto.trim() ? bruto.trim().toLowerCase() : undefined;
}

/**
 * Traduz o corpo da Hotmart para o mesmo formato que o resto do arquivo usa.
 *
 * Cada campo é lido por mais de um caminho de propósito. A Hotmart versiona o formato
 * (esta função foi escrita para a 2.0.0) e move campo de lugar entre versões; uma
 * venda que chega e não é lida custa o acesso de um cliente que já pagou. Melhor
 * tentar dois lugares e acertar do que ler um só e derrubar a entrega.
 */
function vendaDoEvento(corpo) {
  const dados = corpo?.data ?? {};
  const compra = dados.purchase ?? {};
  const comprador = dados.buyer ?? {};
  const preco = compra.price ?? compra.full_price ?? {};
  const origem = compra.origin ?? {};

  return {
    id: compra.transaction ?? corpo?.id ?? "",
    situacao: compra.status ?? "",
    carimbo: carimboValido(compra.approved_date ?? compra.order_date ?? corpo?.creation_date),
    email: normalizarEmail(comprador.email ?? dados.subscriber?.email),
    nome: typeof comprador.name === "string" ? comprador.name.trim() : "",
    valor: typeof preco.value === "number" ? preco.value : undefined,
    moeda: preco.currency_value ?? preco.currency_code ?? "BRL",
    metodo: compra.payment?.type ?? "",
    produto: dados.product?.name ?? "",
    // O sck é o campo livre da Hotmart. É por ele que a página de vendas passa os
    // identificadores do clique no anúncio, quando ela é ajustada para isso.
    sck: typeof origem.sck === "string" ? origem.sck : "",
    src: typeof origem.src === "string" ? origem.src : "",
  };
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

function hashSha256(valor) {
  return crypto.createHash("sha256").update(valor, "utf8").digest("hex");
}

/**
 * Desempacota fbc e fbp do campo livre da Hotmart (sck), no mesmo formato
 * "fb1-<base64url(fbc|fbp)>" que a página de vendas usa no checkout próprio. Sem eles
 * o Purchase ainda vale — só casa com menos precisão.
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

/**
 * O Meta recusa evento com mais de 7 dias. Um carimbo fora dessa janela (ou ausente,
 * ou em milissegundos de uma versão futura do formato) vira "agora".
 */
function carimboValido(bruto) {
  const agora = Math.floor(Date.now() / 1000);
  const segundos = typeof bruto === "number" ? (bruto > 1e11 ? Math.floor(bruto / 1000) : bruto) : NaN;
  if (!Number.isFinite(segundos)) return agora;
  return segundos > agora - 6 * 24 * 60 * 60 && segundos <= agora + 60 ? segundos : agora;
}

/**
 * Envia o Purchase à Conversions API. Nunca lança: uma falha aqui não pode custar o
 * acesso de quem pagou — por isso quem chama já mandou o e-mail antes.
 *
 * O event_id é a transação da Hotmart, o que desduplica o reenvio do próprio webhook.
 * Ele NÃO desduplica contra o Pixel da Hotmart, que gera id próprio: é justamente por
 * isso que este envio fica atrás de uma chave, e não ligado por padrão.
 *
 * Não mandamos IP nem user-agent: quem chama este endpoint é o servidor da Hotmart,
 * então esses dados são DELE, não do comprador, e sujariam a correspondência.
 */
async function enviarPurchaseAoMeta(venda, email) {
  if (!META_LIGADO) return;
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
    console.warn("HOTMART_ENVIA_PURCHASE_AO_META está ligado, mas falta META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN: Purchase não enviado.");
    return;
  }

  const { fbc, fbp } = desempacotarReferencia(venda.sck);
  const dadosDoUsuario = { em: [hashSha256(email)] };
  if (fbc) dadosDoUsuario.fbc = fbc;
  if (fbp) dadosDoUsuario.fbp = fbp;

  const corpo = {
    data: [
      {
        event_name: "Purchase",
        event_time: venda.carimbo,
        event_id: venda.id || `hotmart-${email}-${venda.carimbo}`,
        action_source: "website",
        event_source_url: PAGINA_DE_VENDAS,
        user_data: dadosDoUsuario,
        custom_data: {
          currency: String(venda.moeda || "BRL").toUpperCase(),
          // A Hotmart já manda o preço na unidade cheia (47.9), sem centavos separados.
          value: venda.valor,
          content_name: venda.produto || "Método 5P — Manual Completo de Sobrevivência",
        },
      },
    ],
    // No corpo, e não na querystring: assim o token não vaza em log de acesso.
    access_token: META_CAPI_TOKEN,
  };
  if (META_TEST_EVENT_CODE) corpo.test_event_code = META_TEST_EVENT_CODE;

  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(META_PRAZO_MS),
  });

  const resposta = await res.text();
  if (!res.ok) {
    throw new Error(`Meta ${res.status}: ${resposta.slice(0, 300)}`);
  }
  console.log(`Purchase enviado ao Meta (transação ${venda.id}, fbc:${!!fbc} fbp:${!!fbp}): ${resposta.slice(0, 160)}`);
}

/** Registro do comprador. Nunca bloqueia a resposta. */
async function registrarCompra(idToken, uid, email, venda) {
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
        hotmartPurchase: { booleanValue: true },
        hotmartTransaction: { stringValue: venda.id ?? "" },
        purchaseStatus: { stringValue: venda.situacao ?? "" },
        paymentMethod: { stringValue: venda.metodo ?? "" },
        amountTotal: { doubleValue: venda.valor ?? 0 },
        currency: { stringValue: venda.moeda ?? "" },
        // Guardados crus para não perder a atribuição da campanha, mesmo enquanto
        // ninguém ainda os lê.
        clientReference: { stringValue: venda.sck ?? "" },
        utmSource: { stringValue: venda.src ?? "" },
      },
    }),
  }).catch(() => {});
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  const podeEnviarEmail = !!RESEND_API_KEY || !!(GMAIL_USER && GMAIL_APP_PASSWORD);
  if (!HOTTOK || !podeEnviarEmail) {
    console.error("Webhook mal configurado: falta HOTMART_HOTTOK ou um canal de envio (RESEND_API_KEY ou credenciais Gmail).");
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook não configurado" }) };
  }

  let corpo;
  try {
    corpo = JSON.parse(
      event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64").toString("utf8")
        : event.body || "",
    );
  } catch {
    corpo = null;
  }

  const nomeDoEvento = corpo?.event ?? "";

  /*
    A batida de teste da Hotmart passa sem token, e isso é seguro.

    O hottok só nasce depois de salvar o webhook, mas a Hotmart valida a URL na hora
    de salvar — ou seja, a primeira batida chega necessariamente sem token. Recusá-la
    com 401 impediria o cadastro, e aí nada disto aqui existiria.

    O que passa por esta porta é só o que NÃO traz um evento de venda. Nenhuma conta é
    criada, nenhum e-mail sai, nada é gravado: a resposta é um "estou aqui" e acabou.
    Tudo que traz evento continua obrigado a provar o token, logo abaixo.
  */
  if (!nomeDoEvento) {
    return { statusCode: 200, body: JSON.stringify({ message: "Endpoint ativo" }) };
  }

  // A Hotmart manda o token num cabeçalho. O nome chega em minúsculas na Netlify, mas
  // os dois casos são lidos para não depender disso.
  const recebido =
    event.headers?.["x-hotmart-hottok"] ??
    event.headers?.["X-HOTMART-HOTTOK"] ??
    event.headers?.["x-hotmart-token"];

  if (!tokenConfere(recebido, HOTTOK)) {
    console.warn(`Webhook recusado: hottok não confere (evento ${nomeDoEvento}).`);
    return { statusCode: 401, body: JSON.stringify({ error: "Token inválido" }) };
  }

  if (!EVENTOS_DE_LIBERACAO.has(nomeDoEvento)) {
    // Responder 200 impede a Hotmart de ficar reenviando. O nome vai cru no log: é
    // assim que se descobre como cada rótulo da tela chega de verdade aqui, e é o
    // rastro para tirar o acesso na mão quando for reembolso ou chargeback.
    console.warn(
      `EVENTO SEM LIBERAÇÃO — "${nomeDoEvento}" para ` +
        `${corpo?.data?.buyer?.email ?? "e-mail desconhecido"} ` +
        `(transação ${corpo?.data?.purchase?.transaction ?? "?"}, ` +
        `status ${corpo?.data?.purchase?.status ?? "?"}). ` +
        `Nenhum acesso foi criado nem removido.`,
    );
    return { statusCode: 200, body: JSON.stringify({ message: `Registrado: ${nomeDoEvento}` }) };
  }

  const venda = vendaDoEvento(corpo);

  if (!venda.email) {
    // Sem e-mail não há para quem mandar a senha. O corpo vai para o log com os
    // valores recortados: é a única forma de descobrir que a Hotmart mudou o formato.
    console.error(
      `${nomeDoEvento} sem e-mail do comprador. Chaves recebidas em data: ` +
        `${Object.keys(corpo?.data ?? {}).join(", ") || "(nenhuma)"}`,
    );
    return { statusCode: 400, body: JSON.stringify({ error: "E-mail não fornecido" }) };
  }

  try {
    const senha = gerarSenha();
    const signUp = await fetch(`${IDENTITY}:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: venda.email, password: senha, returnSecureToken: true }),
    });
    const dadosSignUp = await signUp.json();

    const ehNovo = signUp.ok;
    if (!ehNovo && dadosSignUp?.error?.message !== "EMAIL_EXISTS") {
      console.error("Falha ao criar conta:", dadosSignUp?.error?.message);
      return { statusCode: 500, body: JSON.stringify({ error: "Falha ao criar conta" }) };
    }

    if (ehNovo) {
      await registrarCompra(dadosSignUp.idToken, dadosSignUp.localId, venda.email, venda);
    }

    try {
      await enviarEmailDeAcesso(venda.email, senha, ehNovo);
    } catch (erroEmail) {
      // A conta já existe neste ponto. Uma retentativa da Hotmart só cairia em
      // EMAIL_EXISTS e mandaria o texto de "você já tem acesso" — sem nunca entregar a
      // senha. Melhor confirmar o recebimento e deixar o comprador usar "Esqueceu a
      // senha?" do que provocar uma enxurrada de retentativas.
      console.error(`Falha ao enviar e-mail de acesso para ${venda.email}:`, erroEmail?.message || erroEmail);
      return { statusCode: 200, body: JSON.stringify({ success: true, mailFailed: true }) };
    }

    console.log(
      `Acesso liberado para ${venda.email} (novo: ${ehNovo}, transação: ${venda.id}, ${venda.metodo}).`,
    );

    // Por último e sem poder derrubar nada: o acesso já foi entregue acima.
    try {
      await enviarPurchaseAoMeta(venda, venda.email);
    } catch (erroMeta) {
      console.error(`Falha ao enviar Purchase ao Meta (transação ${venda.id}):`, erroMeta?.message || erroMeta);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Erro ao processar o webhook da Hotmart:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno" }) };
  }
};
