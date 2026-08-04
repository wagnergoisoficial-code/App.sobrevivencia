import crypto from "node:crypto";
import nodemailer from "nodemailer";

// The web API key is public by design (it ships in the browser bundle). The real
// secrets — the Kiwify token and the Gmail app password — are set only here.
const WEBHOOK_SECRET = process.env.KIWIFY_WEBHOOK_SECRET;
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const SITE_URL = "https://appmanualcompleto.com";
const IDENTITY = "https://identitytoolkit.googleapis.com/v1/accounts";

const APPROVED_STATUSES = new Set([
  "paid",
  "approved",
  "completed",
  "pago",
  "faturado",
  "ativado",
]);

/**
 * Kiwify signs the exact bytes it POSTs, so the HMAC must run over the raw body.
 * Netlify hands us event.body unparsed, which is precisely what we need. Kiwify
 * does not publish which digest its sales webhook uses, so both are tried; each
 * still requires the shared secret, so accepting both weakens nothing.
 */
function signatureMatches(rawBody, received, secret) {
  return ["sha1", "sha256"].some((algorithm) => {
    const expected = crypto.createHmac(algorithm, secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

// Kiwify sends the order fields flat at the top level; some views wrap them in
// `order`, so fall back to that.
function getOrder(body) {
  return body?.order ?? body;
}

function extractEmail(order) {
  const raw = order?.Customer?.email ?? order?.customer?.email ?? order?.email;
  return typeof raw === "string" ? raw.trim().toLowerCase() : undefined;
}

// A fresh, unique password per buyer. Readable alphabet (no 0/O/1/l ambiguity),
// guaranteed to contain a digit and an uppercase letter to satisfy any policy.
function generatePassword() {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = lower + upper + digits;
  const pick = (set) => set[crypto.randomInt(set.length)];
  let pwd = pick(upper) + pick(digits);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  // shuffle so the guaranteed chars aren't always first
  return pwd
    .split("")
    .sort(() => crypto.randomInt(3) - 1)
    .join("");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

async function sendAccessEmail(to, password, isNew) {
  const access = isNew
    ? `<p style="margin:0 0 6px"><strong>E-mail:</strong> ${to}</p>
       <p style="margin:0 0 6px"><strong>Senha:</strong> <span style="font-family:monospace;font-size:18px;color:#b45309">${password}</span></p>
       <p style="margin:12px 0 0;font-size:13px;color:#64748b">Recomendamos trocar a senha depois de entrar.</p>`
    : `<p style="margin:0">Você já tem acesso. Entre com o e-mail <strong>${to}</strong> e a senha que enviamos na sua primeira compra. Esqueceu? Use a opção "Esqueceu a senha?" no site.</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#0f172a;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
      <div style="background:#0f172a;padding:20px 24px;border-bottom:3px solid #f59e0b">
        <span style="color:#f59e0b;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px">Manual de Sobrevivência • Método 5P</span>
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">Seu acesso foi liberado 🎉</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.5">Obrigado pela sua compra! Aqui estão seus dados de acesso ao Manual Completo de Sobrevivência Apocalíptica:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;color:#0f172a;font-size:15px">${access}</div>
        <a href="${SITE_URL}" style="display:inline-block;margin:20px 0 6px;background:#f59e0b;color:#0f172a;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">Acessar o Manual</a>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Se você não fez esta compra, ignore este e-mail.</p>
      </div>
    </div>
  </body></html>`;

  const text = isNew
    ? `Seu acesso foi liberado!\n\nE-mail: ${to}\nSenha: ${password}\n\nAcesse: ${SITE_URL}\n(recomendamos trocar a senha depois de entrar)`
    : `Você já tem acesso. Entre em ${SITE_URL} com o e-mail ${to} e sua senha. Esqueceu? Use "Esqueceu a senha?" no site.`;

  await transporter.sendMail({
    from: `"Manual de Sobrevivência" <${GMAIL_USER}>`,
    to,
    subject: "Seu acesso ao Manual Completo de Sobrevivência",
    html,
    text,
  });
}

// Best-effort record of the buyer; never blocks the response.
async function recordPurchase(idToken, uid, email, orderStatus) {
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
        kiwifyPurchase: { booleanValue: true },
        purchaseStatus: { stringValue: orderStatus },
      },
    }),
  }).catch(() => {});
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  // TEMP: isolated Gmail send test, triggerable without Kiwify. Remove later.
  if (event.queryStringParameters?.diag === "mail-test-9x2") {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return { statusCode: 200, body: JSON.stringify({ mailTest: "no-creds", hasUser: !!GMAIL_USER, hasPass: !!GMAIL_APP_PASSWORD, passLen: (GMAIL_APP_PASSWORD || "").length }) };
    }
    const to = event.queryStringParameters?.to || GMAIL_USER;
    try {
      await sendAccessEmail(to, "SenhaDeTeste123", true);
      return { statusCode: 200, body: JSON.stringify({ mailTest: "OK", to }) };
    } catch (e) {
      return { statusCode: 200, body: JSON.stringify({ mailTest: "FAIL", error: String(e?.message || e).slice(0, 500) }) };
    }
  }

  if (!WEBHOOK_SECRET || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("Webhook mal configurado: falta KIWIFY_WEBHOOK_SECRET ou credenciais Gmail.");
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook não configurado" }) };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");
  const signature = event.queryStringParameters?.signature;

  // TEMP diagnostic — capture EVERY POST so the flow is visible. Remove later.
  let _sigValid = false;
  try { _sigValid = !!(signature && signatureMatches(rawBody, signature, WEBHOOK_SECRET)); } catch {}
  const _diag = async (fields) => {
    try {
      await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/_diag/last?key=${API_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { at: { stringValue: new Date().toISOString() }, ...fields } }),
      });
    } catch {}
  };
  await _diag({
    hasSignature: { booleanValue: !!signature },
    signatureValid: { booleanValue: _sigValid },
    bodyStart: { stringValue: rawBody.toString("utf8").slice(0, 120) },
  });

  if (!signature) {
    return { statusCode: 401, body: JSON.stringify({ error: "Assinatura ausente" }) };
  }
  if (!signatureMatches(rawBody, signature, WEBHOOK_SECRET)) {
    console.warn("Webhook recusado: assinatura inválida.");
    return { statusCode: 401, body: JSON.stringify({ error: "Assinatura inválida" }) };
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Corpo inválido" }) };
  }

  const order = getOrder(body);
  const orderStatus = order?.order_status ?? order?.status;
  const isApproved =
    (!!orderStatus && APPROVED_STATUSES.has(String(orderStatus).toLowerCase())) ||
    order?.webhook_event_type === "order_approved";
  const email = extractEmail(order);

  if (!isApproved) {
    return { statusCode: 200, body: JSON.stringify({ message: "Status ignorado" }) };
  }
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "E-mail não fornecido" }) };
  }

  try {
    // Unique password for THIS buyer.
    const password = generatePassword();
    const signUp = await fetch(`${IDENTITY}:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const signUpData = await signUp.json();

    const isNew = signUp.ok;
    if (!isNew && signUpData?.error?.message !== "EMAIL_EXISTS") {
      console.error("Falha ao criar conta:", signUpData?.error?.message);
      return { statusCode: 500, body: JSON.stringify({ error: "Falha ao criar conta" }) };
    }

    if (isNew) {
      await recordPurchase(signUpData.idToken, signUpData.localId, email, orderStatus);
    }

    // Send the access email from the seller's Gmail (good inbox delivery).
    try {
      await sendAccessEmail(email, password, isNew);
      await _diag({ step: { stringValue: "email_ok" }, isNew: { booleanValue: isNew }, emailTo: { stringValue: email } });
    } catch (mailErr) {
      console.error("Falha ao enviar e-mail:", mailErr?.message || mailErr);
      await _diag({ step: { stringValue: "email_fail" }, mailError: { stringValue: String(mailErr?.message || mailErr).slice(0, 400) } });
      return { statusCode: 500, body: JSON.stringify({ error: "Conta pronta, mas o e-mail falhou" }) };
    }

    console.log(`Acesso liberado para ${email} (novo: ${isNew})`);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Erro ao processar o webhook:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno" }) };
  }
};
