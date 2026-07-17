import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

// Validate that variables are fully configured and are not placeholders
const isConfigured = 
  !!apiKey && 
  !!projectId && 
  apiKey !== "YOUR_API_KEY" && 
  projectId !== "YOUR_PROJECT_ID" &&
  !apiKey.startsWith("<") &&
  apiKey.trim() !== "";

let app: any = null;
let auth: any = null;
let db: any = null;
let isFirebaseValid = false;

if (isConfigured) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    };
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, databaseId || undefined);
    isFirebaseValid = true;

    // Enable Offline Persistence for offline survival scenarios
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Persistência offline do Firebase falhou: múltiplas abas abertas.");
      } else if (err.code === "unimplemented") {
        console.warn("Persistência offline do Firebase não suportada neste navegador.");
      } else {
        console.error("Erro ao ativar persistência offline:", err);
      }
    });
  } catch (err) {
    console.error("Falha ao inicializar Firebase. O app usará o modo local (offline). Erro:", err);
    auth = null;
    db = null;
    isFirebaseValid = false;
  }
} else {
  console.warn("Firebase não está configurado ou possui valores inválidos. O app funcionará em modo local (sem sincronização de nuvem).");
}

export { auth, db, isFirebaseValid };
