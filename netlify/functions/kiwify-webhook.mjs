import crypto from "node:crypto";

// Reused from the Netlify env vars already set for the frontend build. The web
// API key is public by design (it ships in the browser bundle); the only secret
// added specifically for this function is KIWIFY_WEBHOOK_SECRET.
const WEBHOOK_SECRET = process.env.KIWIFY_WEBHOOK_SECRET;
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

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
 * Netlify hands us event.body unparsed, which is precisely what we need — parsing
 * and re-serializing would change the bytes (spacing, unicode) and never match.
 * Kiwify does not publish which digest its sales webhook uses, so both are tried;
 * each still requires the shared secret, so accepting both weakens nothing.
 */
function signatureMatches(rawBody, received, secret) {
  return ["sha1", "sha256"].some((algorithm) => {
    const expected = crypto.createHmac(algorithm, secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function extractEmail(body) {
  const raw = body?.Customer?.email ?? body?.customer?.email ?? body?.email;
  return typeof raw === "string" ? raw.trim().toLowerCase() : undefined;
}

async function sendPasswordEmail(email) {
  const res = await fetch(`${IDENTITY}:sendOobCode?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
  });
  return res.ok ? null : await res.text();
}

// Best-effort record of the buyer; never blocks the response. Uses the buyer's
// own token so it obeys the existing Firestore rule (a user may write own doc).
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

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");
  const signature = event.queryStringParameters?.signature;

  if (!WEBHOOK_SECRET) {
    console.error("KIWIFY_WEBHOOK_SECRET não configurado; recusando o webhook.");
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook não configurado" }) };
  }

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

  // Kiwify nests the whole payload under `order`; fall back to the root in case
  // a different/flat format is ever sent.
  const order = body?.order ?? body;

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
    // Create the account with a throwaway password. The buyer never sees it —
    // the email below lets them set their own. A repeat purchase returns
    // EMAIL_EXISTS, which is fine: we still send the access email.
    const signUp = await fetch(`${IDENTITY}:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: crypto.randomBytes(32).toString("hex"),
        returnSecureToken: true,
      }),
    });
    const signUpData = await signUp.json();

    if (!signUp.ok && signUpData?.error?.message !== "EMAIL_EXISTS") {
      console.error("Falha ao criar conta:", signUpData?.error?.message);
      return { statusCode: 500, body: JSON.stringify({ error: "Falha ao criar conta" }) };
    }

    if (signUp.ok) {
      await recordPurchase(signUpData.idToken, signUpData.localId, email, orderStatus);
    }

    const emailError = await sendPasswordEmail(email);
    if (emailError) {
      console.error("Falha ao enviar e-mail de senha:", emailError);
      return { statusCode: 500, body: JSON.stringify({ error: "Conta pronta, mas o e-mail falhou" }) };
    }

    console.log(`Acesso liberado para ${email} (status: ${orderStatus})`);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Erro ao processar o webhook:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno" }) };
  }
};
