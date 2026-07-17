import crypto from "crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const kiwifyWebhookSecret = defineSecret("KIWIFY_WEBHOOK_SECRET");
const firebaseApiKey = defineSecret("FIREBASE_WEB_API_KEY");

initializeApp();

const APPROVED_STATUSES = new Set([
  "paid",
  "approved",
  "completed",
  "pago",
  "faturado",
  "ativado",
]);

/**
 * Kiwify signs the bytes it sent, so the signature must be checked against
 * rawBody. Re-serializing req.body produces different bytes (escaping, spacing)
 * and never matches. Kiwify does not publish which digest the sales webhook
 * uses, so both are accepted; each still requires the shared secret.
 */
function signatureMatches(rawBody: Buffer, received: string, secret: string): boolean {
  return ["sha1", "sha256"].some((algorithm) => {
    const expected = crypto.createHmac(algorithm, secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(received, "utf8");
    return (
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf)
    );
  });
}

function extractEmail(body: any): string | undefined {
  const raw =
    body?.Customer?.email ?? body?.customer?.email ?? body?.email;
  return typeof raw === "string" ? raw.trim().toLowerCase() : undefined;
}

export const kiwifyWebhook = onRequest(
  { region: "southamerica-east1", secrets: [kiwifyWebhookSecret, firebaseApiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido" });
      return;
    }

    const secret = kiwifyWebhookSecret.value();
    if (!secret) {
      logger.error("KIWIFY_WEBHOOK_SECRET não configurado; recusando o webhook.");
      res.status(500).json({ error: "Webhook não configurado" });
      return;
    }

    const signature = req.query.signature;
    if (typeof signature !== "string" || !signature) {
      logger.warn("Webhook recusado: assinatura ausente.");
      res.status(401).json({ error: "Assinatura ausente" });
      return;
    }

    if (!req.rawBody || !signatureMatches(req.rawBody, signature, secret)) {
      logger.warn("Webhook recusado: assinatura inválida.");
      res.status(401).json({ error: "Assinatura inválida" });
      return;
    }

    const orderStatus: string | undefined =
      req.body?.order_status ?? req.body?.status;
    const email = extractEmail(req.body);

    if (!orderStatus || !APPROVED_STATUSES.has(orderStatus.toLowerCase())) {
      logger.info(`Pedido ignorado, status: ${orderStatus}`);
      res.status(200).json({ message: "Status ignorado" });
      return;
    }

    if (!email) {
      logger.error("E-mail ausente no payload do webhook.");
      res.status(400).json({ error: "E-mail não fornecido" });
      return;
    }

    try {
      const auth = getAuth();
      let userRecord;
      try {
        userRecord = await auth.createUser({
          email,
          emailVerified: true,
          password: crypto.randomBytes(32).toString("hex"),
        });
        logger.info(`Usuário criado: ${userRecord.uid}`);
      } catch (authError: any) {
        if (authError.code === "auth/email-already-exists") {
          userRecord = await auth.getUserByEmail(email);
          logger.info(`Usuário já existia: ${userRecord.uid}`);
        } else {
          throw authError;
        }
      }

      await getFirestore()
        .collection("users")
        .doc(userRecord.uid)
        .set(
          {
            uid: userRecord.uid,
            email,
            createdAt: new Date().toISOString(),
            role: "user",
            kiwifyPurchase: true,
            purchaseStatus: orderStatus,
          },
          { merge: true },
        );

      // Firebase only sends links, never plaintext passwords, so the buyer gets
      // a link to set their own password and then logs in with it.
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey.value()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
        },
      );

      if (!response.ok) {
        logger.error(`Falha ao enviar e-mail de senha: ${await response.text()}`);
        res.status(500).json({ error: "Conta criada, mas o e-mail falhou" });
        return;
      }

      logger.info(`E-mail de definição de senha enviado para ${email}`);
      res.status(200).json({ success: true, uid: userRecord.uid });
    } catch (err: any) {
      logger.error("Erro ao processar o webhook:", err);
      res.status(500).json({ error: "Erro interno", details: err.message });
    }
  },
);
