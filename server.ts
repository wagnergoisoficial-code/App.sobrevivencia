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
