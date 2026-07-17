import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Attempt to read Firebase configuration from environment or firebase-applet-config.json
let firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
let firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID;

try {
  if (!firebaseApiKey || !firebaseProjectId) {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      firebaseApiKey = firebaseApiKey || config.apiKey;
      firebaseProjectId = firebaseProjectId || config.projectId;
    }
  }
} catch (e) {
  console.error("Erro ao ler fallback firebase-applet-config.json no servidor:", e);
}

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseProjectId || "limpeza-pro-autopilot"
  });
}

const app = express();
const PORT = 3000;

// Express middleware for JSON parsing
app.use(express.json());

// API route for Kiwify Webhook
app.post("/api/kiwify-webhook", async (req, res) => {
  console.log("Kiwify Webhook recebido!");
  const signature = req.query.signature as string;
  const webhookSecret = process.env.KIWIFY_WEBHOOK_SECRET || "kiwify-secret-key-123";

  if (!signature) {
    console.error("Webhook recusado: Assinatura ausente.");
    res.status(401).json({ error: "Assinatura ausente" });
    return;
  }

  // Verify the payload signature from Kiwify
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("Assinatura inválida recebida do webhook. Esperada:", expectedSignature, "Recebida:", signature);
    res.status(401).json({ error: "Assinatura inválida" });
    return;
  }

  // Signature valid! Let's check the purchase status
  const orderStatus = req.body?.order_status || req.body?.status;
  const email = req.body?.Customer?.email || req.body?.customer?.email || req.body?.email;

  console.log(`Webhook validado com sucesso. Status do pedido: ${orderStatus}, E-mail: ${email}`);

  // Only proceed if status is approved/paid/pago/completed
  const approvedStatuses = ["paid", "approved", "completed", "pago", "faturado", "ativado"];
  if (!orderStatus || !approvedStatuses.includes(orderStatus.toLowerCase())) {
    console.log(`Pedido ignorado pois o status é: ${orderStatus}`);
    res.status(200).json({ message: "Status ignorado" });
    return;
  }

  if (!email) {
    console.error("E-mail não encontrado no payload do webhook");
    res.status(400).json({ error: "E-mail não fornecido" });
    return;
  }

  try {
    const formattedEmail = email.trim().toLowerCase();
    
    // 1. Create user in Firebase Auth
    let userRecord;
    const authAdmin = getAuth();
    try {
      userRecord = await authAdmin.createUser({
        email: formattedEmail,
        emailVerified: true,
        password: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      });
      console.log(`Usuário criado com sucesso no Firebase Auth: ${userRecord.uid}`);
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        userRecord = await authAdmin.getUserByEmail(formattedEmail);
        console.log(`Usuário já existe no Firebase Auth, utilizando UID existente: ${userRecord.uid}`);
      } else {
        throw authError;
      }
    }

    // 2. Synchronize user in Firestore users collection
    try {
      const db = getFirestore();
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: formattedEmail,
        createdAt: new Date().toISOString(),
        role: "user",
        kiwifyPurchase: true,
        purchaseStatus: orderStatus
      }, { merge: true });
      console.log(`Registro do usuário sincronizado no Firestore.`);
    } catch (firestoreError) {
      console.error("Erro ao registrar usuário no Firestore:", firestoreError);
    }

    // 3. Trigger native Firebase password reset email to let the user set their password
    if (firebaseApiKey) {
      const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;
      const response = await fetch(resetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: formattedEmail,
        }),
      });

      if (response.ok) {
        console.log(`E-mail nativo de redefinição de senha enviado para ${formattedEmail}`);
      } else {
        const errText = await response.text();
        console.error(`Erro ao disparar e-mail nativo de senha pelo REST API: ${errText}`);
      }
    } else {
      console.warn("VITE_FIREBASE_API_KEY não configurada no servidor, impossível disparar e-mail de redefinição nativo");
    }

    res.status(200).json({ 
      success: true, 
      uid: userRecord.uid,
      message: "Usuário cadastrado com sucesso e e-mail de senha disparado." 
    });
  } catch (err: any) {
    console.error("Erro ao processar criação de conta via webhook:", err);
    res.status(500).json({ error: "Erro interno do servidor", details: err.message });
  }
});

// Vite middleware setup (development vs production) and server startup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const htmlPath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(htmlPath)) {
          let template = fs.readFileSync(htmlPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          res.status(404).send("index.html not found");
        }
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
