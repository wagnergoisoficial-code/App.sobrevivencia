/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Cover from "./components/Cover";
import Sidebar from "./components/Sidebar";
import Workbook from "./components/Workbook";
import AuthModal from "./components/AuthModal";
import Author from "./components/Author";
import EbookReader from "./components/EbookReader";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";

import { UserProgress } from "./types";

const INITIAL_PROGRESS: UserProgress = {
  readChapters: [],
  readProtocols: [],
  completedChecklists: [],
  waterCalc: {
    people: 4,
    days: 3,
    customReserve: 15
  },
  foodCalc: [
    {
      id: "food-1",
      item: "Sardinha em Lata (Gomes da Costa)",
      qty: 8,
      calories: 320,
      expiry: "11/2028",
      familyLikes: true,
      needsCooking: false
    },
    {
      id: "food-2",
      item: "Arroz Parboilizado (Tio João 1kg)",
      qty: 3,
      calories: 1600,
      expiry: "04/2027",
      familyLikes: true,
      needsCooking: true
    },
    {
      id: "food-3",
      item: "Pasta de Amendoim Integral (1kg)",
      qty: 2,
      calories: 2800,
      expiry: "09/2027",
      familyLikes: true,
      needsCooking: false
    },
    {
      id: "food-4",
      item: "Água Mineral Envasada (Galão 5L)",
      qty: 6,
      calories: 0,
      expiry: "12/2026",
      familyLikes: true,
      needsCooking: false
    }
  ],
  medicationList: [
    {
      id: "med-1",
      name: "Losartana Potássica",
      person: "Avô Joaquim",
      dose: "50mg",
      schedule: "1x ao dia (Manhã)",
      reserveDays: 30
    },
    {
      id: "med-2",
      name: "Bombinha de Asma (Salbutamol)",
      person: "Felipe (Filho)",
      dose: "100mcg",
      schedule: "Se necessário",
      reserveDays: 15
    }
  ],
  commContacts: [
    {
      id: "contact-1",
      name: "Tio Marcos (Curitiba)",
      relation: "Tio Materno / Ancoragem Externa",
      phone: "(41) 98888-7777",
      message: "Tudo seguro. Família reunida, seguindo para o ponto de encontro.",
      point1: "Praça do Coreto (Bairro)",
      point2: "Paróquia de São José (Fora do Bairro)"
    }
  ],
  riskMapping: [
    {
      id: "risk-1",
      threat: "Vendavais e Tempestades Severas",
      probability: "Alta",
      impact: "Alto",
      notes: "Proteger janelas térreas e desconectar disjuntores se houver raios."
    },
    {
      id: "risk-2",
      threat: "Apagão de Energia Elétrica Prolongado",
      probability: "Alta",
      impact: "Alto",
      notes: "Acionar Protocolo 2, racionalizar luz e fechar geladeira."
    }
  ],
  diagnosticScores: {
    agua: 2,
    comida: 3,
    energia: 2,
    comunicacao: 1,
    higiene: 2,
    saude: 2,
    abrigo: 1,
    seguranca: 2,
    evacuacao: 1,
    financas: 2,
    documentos: 2,
    psicologia: 3
  }
};

type ActiveTabType = "diagnostic" | "water" | "food" | "medical" | "comm" | "risk" | "scenarios";

export default function App() {
  const [view, setView] = useState<"cover" | "workbook" | "author" | "ebook">(() => {
    if (window.location.pathname === "/ebook") {
      return "ebook";
    }
    if (window.location.pathname === "/workbook") {
      return "workbook";
    }
    return "cover";
  });
  
  // Selection states
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    if (window.location.pathname === "/ebook") {
      return "ebook";
    }
    return "workbook";
  });
  const [selectedItemType, setSelectedItemType] = useState<"workbook" | "author" | "ebook">(() => {
    if (window.location.pathname === "/ebook") {
      return "ebook";
    }
    return "workbook";
  });

  // Active Workbook Tab state
  const [activeTab, setActiveTab] = useState<ActiveTabType>("diagnostic");

  // User progress persistent states
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);

  // Auth and Sync States
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [pendingView, setPendingView] = useState<"workbook" | "ebook" | null>(null);

  // Load progress from Firestore on Login or localStorage on mount
  useEffect(() => {
    if (!auth || !db) {
      // Local fallback mode when Firebase isn't configured
      const saved = localStorage.getItem("sobrevivencia_5p_progress");
      if (saved) {
        try {
          setProgress(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar progresso salvo:", e);
        }
      }
      setAuthChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        
        try {
          const docRef = doc(db, "userProgress", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProgress(docSnap.data() as UserProgress);
          } else {
            // First login: upload local progress to Firestore so they don't lose it
            const localSaved = localStorage.getItem("sobrevivencia_5p_progress");
            let progressToUpload = INITIAL_PROGRESS;
            if (localSaved) {
              try {
                progressToUpload = JSON.parse(localSaved);
              } catch (e) {}
            }
            await setDoc(docRef, progressToUpload);
            setProgress(progressToUpload);
          }
        } catch (e) {
          console.error("Erro ao carregar do Firestore:", e);
        }
      } else {
        setUserId(null);
        setUserEmail(null);
        // Load from localStorage if logged out
        const saved = localStorage.getItem("sobrevivencia_5p_progress");
        if (saved) {
          try {
            setProgress(JSON.parse(saved));
          } catch (e) {
            console.error("Erro ao carregar progresso salvo:", e);
          }
        } else {
          setProgress(INITIAL_PROGRESS);
        }
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Synchronize path and protect /ebook and /workbook routes
  useEffect(() => {
    if (view === "ebook") {
      if (window.location.pathname !== "/ebook") {
        window.history.pushState({}, "", "/ebook");
      }
      if (authChecked && !userId) {
        // Redirect to cover/home if not authenticated
        setView("cover");
        setAuthModalOpen(true);
      }
    } else if (view === "workbook") {
      if (window.location.pathname !== "/workbook") {
        window.history.pushState({}, "", "/workbook");
      }
      if (authChecked && !userId) {
        // Redirect to cover/home if not authenticated
        setView("cover");
        setAuthModalOpen(true);
      }
    } else if (view === "cover") {
      if (window.location.pathname !== "/") {
        window.history.pushState({}, "", "/");
      }
    } else {
      if (window.location.pathname !== "/workbook") {
        window.history.pushState({}, "", "/workbook");
      }
    }
  }, [view, userId, authChecked]);

  // Save progress changes
  const updateProgress = (updater: (prev: UserProgress) => UserProgress) => {
    setProgress((prev) => {
      const updated = updater(prev);
      localStorage.setItem("sobrevivencia_5p_progress", JSON.stringify(updated));
      
      if (userId && db) {
        setDoc(doc(db, "userProgress", userId), updated).catch((err) => {
          console.error("Erro ao sincronizar com Firestore:", err);
        });
      }
      
      return updated;
    });
  };

  // Sign out handler
  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

  // Selection Callback
  const handleSelectItem = (id: string, type: "workbook" | "author" | "ebook") => {
    setSelectedItemId(id);
    setSelectedItemType(type);
    if (type === "workbook") {
      setView("workbook");
    } else if (type === "author") {
      setView("author");
    } else if (type === "ebook") {
      setView("ebook");
    }
  };

  // Diagnostic Score Calculation for Sidebar Progress Ring
  const diagnosticScore = Object.values(progress.diagnosticScores).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className={`bg-slate-950 font-sans select-none animate-fade-in ${
      view === "cover" ? "min-h-screen w-full overflow-y-auto" : "h-screen max-h-screen overflow-hidden flex flex-col md:flex-row"
    }`}>
      
      {/* 1. Cover View Layer */}
      {view === "cover" && (
        <Cover
          onStartReading={() => {
            if (userId) {
              setSelectedItemId("workbook");
              setSelectedItemType("workbook");
              setView("workbook");
            } else {
              setPendingView("workbook");
              setAuthModalOpen(true);
            }
          }}
          onGoToWorkbook={() => {
            if (userId) {
              setSelectedItemId("workbook");
              setSelectedItemType("workbook");
              setView("workbook");
            } else {
              setPendingView("workbook");
              setAuthModalOpen(true);
            }
          }}
          onGoToPrintable={() => {
            if (userId) {
              setSelectedItemId("workbook");
              setSelectedItemType("workbook");
              setView("workbook");
            } else {
              setPendingView("workbook");
              setAuthModalOpen(true);
            }
          }}
          onGoToEbook={() => {
            if (userId) {
              setSelectedItemId("ebook");
              setSelectedItemType("ebook");
              setView("ebook");
            } else {
              setPendingView("ebook");
              setAuthModalOpen(true);
            }
          }}
          userEmail={userEmail}
          onOpenLogin={() => setAuthModalOpen(true)}
        />
      )}

      {/* 2. Main Worksheet Workspace */}
      {view !== "cover" && (
        <div className="flex-grow flex h-screen max-h-screen overflow-hidden relative">
          
          {/* Collapsible/Responsive Table of Contents Sidebar */}
          <Sidebar
            selectedItemId={selectedItemId}
            selectedItemType={selectedItemType}
            onSelectItem={handleSelectItem}
            onBackToCover={() => setView("cover")}
            userEmail={userEmail}
            onLogout={handleLogout}
            onOpenLogin={() => setAuthModalOpen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            diagnosticScore={diagnosticScore}
          />

          {/* Panel Loader */}
          {view === "workbook" && (
            <Workbook
              progress={progress}
              onUpdateProgress={updateProgress}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
          {view === "author" && <Author />}
          {view === "ebook" && (
            <EbookReader onBackToCover={() => setView("cover")} />
          )}

        </div>
      )}

      {/* Auth Modal Overlay */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingView(null);
        }}
        onAuthSuccess={(email) => {
          setUserEmail(email);
          if (pendingView) {
            setView(pendingView);
            setSelectedItemId(pendingView);
            setSelectedItemType(pendingView);
            setPendingView(null);
          }
        }}
      />
    </div>
  );
}
