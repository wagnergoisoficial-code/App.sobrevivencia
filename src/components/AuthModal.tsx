/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Loader2,
  LockKeyhole,
  UserPlus
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

    if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!auth) {
      setError("O Firebase não está configurado. Para habilitar a sincronização em nuvem em produção, cadastre as variáveis VITE_FIREBASE_... no painel de controle do Netlify e refaça o deploy.");
      return;
    }

    // Validate inputs
    if (!email) {
      setError("Por favor, insira seu endereço de e-mail.");
      return;
    }

    if (mode !== "forgot" && !password) {
      setError("Por favor, insira sua senha.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update user record in users Firestore collection
        if (db) {
          try {
            await setDoc(doc(db, "users", userCredential.user.uid), {
              uid: userCredential.user.uid,
              email: userCredential.user.email || email,
              lastLogin: new Date().toISOString()
            }, { merge: true });
          } catch (firestoreErr) {
            console.error("Erro ao atualizar login do usuário no Firestore:", firestoreErr);
          }
        }

        setSuccessMsg("Acesso autorizado! Carregando seu bunker digital...");
        setTimeout(() => {
          onAuthSuccess(userCredential.user.email || email);
          onClose();
        }, 1200);
      } else if (mode === "forgot") {
        // Password Reset
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg("E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.");
        setMode("login");
      }
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      // Translate common Firebase errors
      let msg = "Acesso liberado apenas para quem adquiriu o produto. Verifique o e-mail usado na compra.";
      if (err.code === "auth/invalid-email") {
        msg = "Formato de e-mail inválido.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "Erro de conexão. Verifique sua internet.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        
        {/* Backdrop clickable closing */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col"
        >
          {/* Header Accent Line */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 mb-1">
                {mode === "login" ? (
                  <LockKeyhole className="h-6 w-6 text-amber-500" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-amber-500" />
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-100">
                {mode === "login" && "Acesso ao Bunker Digital"}
                {mode === "forgot" && "Recuperar Credenciais"}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {mode === "login" && "Entre para salvar seu progresso tático, checklists e inventários em tempo real."}
                {mode === "forgot" && "Informe seu e-mail cadastrado para enviarmos instruções de recuperação."}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400 tracking-wider font-bold">
                  E-mail do Sobrevivente
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@bunker.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password - Hidden in "forgot" mode */}
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 tracking-wider font-bold">
                      Senha de Segurança
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[10px] font-mono text-amber-500 hover:text-amber-400 uppercase tracking-wider font-bold"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-10 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-3 px-4 rounded-lg font-mono text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Iniciando Protocolo...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === "login" && "Autenticar Entrada"}
                      {mode === "forgot" && "Enviar Recuperação"}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Mode Switcher Footer */}
            <div className="pt-4 border-t border-slate-800/50 text-center">
              {mode === "forgot" && (
                <p className="text-xs text-slate-400">
                  Lembrou suas credenciais?{" "}
                  <button
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-amber-500 hover:text-amber-400 font-bold transition-colors cursor-pointer"
                  >
                    Fazer Login
                  </button>
                </p>
              )}

              <button
                onClick={onClose}
                className="mt-4 text-[10px] font-mono text-slate-500 hover:text-slate-400 uppercase tracking-widest block mx-auto hover:underline"
              >
                Continuar sem sincronização
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
