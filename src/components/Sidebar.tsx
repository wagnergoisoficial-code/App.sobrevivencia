import React, { useState } from "react";
import {
  ShieldAlert,
  ClipboardCheck,
  Menu,
  X,
  Compass,
  ArrowLeft,
  LogIn,
  User,
  Droplet,
  Coffee,
  HeartPulse,
  Users,
  AlertTriangle,
  ClipboardList,
  BookOpen
} from "lucide-react";

interface SidebarProps {
  selectedItemId: string;
  selectedItemType: "workbook" | "author" | "ebook";
  onSelectItem: (id: string, type: "workbook" | "author" | "ebook") => void;
  onBackToCover: () => void;
  userEmail: string | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  activeTab: "diagnostic" | "water" | "food" | "medical" | "comm" | "risk" | "scenarios";
  setActiveTab: (tab: "diagnostic" | "water" | "food" | "medical" | "comm" | "risk" | "scenarios") => void;
  diagnosticScore: number;
}

export default function Sidebar({
  selectedItemId,
  selectedItemType,
  onSelectItem,
  onBackToCover,
  userEmail,
  onLogout,
  onOpenLogin,
  activeTab,
  setActiveTab,
  diagnosticScore
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Resilience score evaluation
  const totalPossibleScore = 60;
  const resiliencePercentage = Math.round((diagnosticScore / totalPossibleScore) * 100);

  let tierLabel = "Vulnerável";
  if (diagnosticScore >= 21 && diagnosticScore <= 40) {
    tierLabel = "Em Formação";
  } else if (diagnosticScore >= 41 && diagnosticScore <= 55) {
    tierLabel = "Preparado";
  } else if (diagnosticScore >= 56) {
    tierLabel = "Elite Resiliente";
  }

  const handleItemClick = (tabId: "diagnostic" | "water" | "food" | "medical" | "comm" | "risk" | "scenarios") => {
    onSelectItem("workbook", "workbook");
    setActiveTab(tabId);
    setIsOpen(false); // Auto close sidebar on mobile
  };

  const menuItems = [
    { id: "diagnostic", label: "Diagnóstico Tático", icon: ClipboardList, color: "text-amber-500" },
    { id: "water", label: "Calculadora de Água", icon: Droplet, color: "text-sky-500" },
    { id: "food", label: "Gestão de Alimentos", icon: Coffee, color: "text-orange-500" },
    { id: "medical", label: "Prontuário Médico", icon: HeartPulse, color: "text-rose-500" },
    { id: "comm", label: "Rede de Comunicação", icon: Users, color: "text-emerald-500" },
    { id: "risk", label: "Mapeamento de Riscos", icon: AlertTriangle, color: "text-yellow-500" },
    { id: "scenarios", label: "Simulador de Colapso", icon: ShieldAlert, color: "text-red-500" }
  ] as const;

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <div className="lg:hidden fixed top-3 left-4 z-40 flex items-center space-x-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-slate-900 border border-slate-800 rounded-md text-slate-200 hover:text-white"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* The Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-slate-950 border-r border-slate-900 flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:h-screen lg:max-h-screen`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-900 flex flex-col space-y-3 shrink-0">
          <button
            onClick={onBackToCover}
            className="flex items-center space-x-2 text-xs font-mono text-amber-500 hover:text-amber-400 transition-colors uppercase font-bold text-left cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para a Capa</span>
          </button>
          
          <div>
            <h1 className="font-serif text-lg font-bold text-slate-100 tracking-tight leading-none flex items-center gap-1.5">
              <Compass className="h-5 w-5 text-amber-500" />
              <span>Bunker Virtual</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider">Simuladores & Calculadoras / Método 5P</p>
          </div>

          {/* Resilience Progress Bar */}
          <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">Resiliência Geral</span>
              <span className="text-amber-500 font-bold">{resiliencePercentage}%</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${resiliencePercentage}%` }}
              />
            </div>
            <div className="text-[9px] text-slate-500 text-center font-mono pt-0.5">
              {diagnosticScore} de 60 pontos ({tierLabel})
            </div>
          </div>
        </div>

        {/* Scrollable List Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 font-sans select-none">
          
          {/* Section: Ferramentas */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-2.5 mb-2 font-bold">Ferramentas de Crise</h3>
            
            <div className="space-y-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id && selectedItemType === "workbook";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded flex items-center space-x-2.5 text-xs font-medium cursor-pointer transition-all border ${
                      isActive
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 font-semibold shadow-sm"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 ${isActive ? item.color : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Autor */}
          <div className="space-y-1 pt-3 border-t border-slate-900">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-2.5 mb-2 font-bold">Informações</h3>
            
            <button
              onClick={() => {
                onSelectItem("author", "author");
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded flex items-center space-x-2.5 text-xs font-medium cursor-pointer transition-all border ${
                selectedItemType === "author"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400 font-semibold shadow-sm"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <User className={`h-4 w-4 ${selectedItemType === "author" ? "text-amber-400" : "text-slate-500"}`} />
              <span>Sobre o Autor</span>
            </button>

            <button
              onClick={() => {
                onSelectItem("ebook", "ebook");
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded flex items-center space-x-2.5 text-xs font-medium cursor-pointer transition-all border ${
                selectedItemType === "ebook"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400 font-semibold shadow-sm"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <BookOpen className={`h-4 w-4 ${selectedItemType === "ebook" ? "text-amber-400" : "text-slate-500"}`} />
              <span>Manual</span>
            </button>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-900 bg-slate-950 flex flex-col space-y-2 shrink-0">
          {userEmail ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 flex flex-col space-y-1 text-center">
              <div className="flex items-center justify-center space-x-1.5 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Bunker Sincronizado</span>
              </div>
              <span className="text-[10px] text-slate-300 truncate block font-sans" title={userEmail}>
                {userEmail}
              </span>
              <button
                onClick={onLogout}
                className="text-[9px] font-mono text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider font-bold cursor-pointer pt-1 hover:underline"
              >
                Sair do Sistema
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-500 text-[10px] font-mono font-bold uppercase tracking-wider py-2 px-3 rounded transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sincronizar Nuvem</span>
            </button>
          )}
          <div className="text-center font-mono text-[9px] text-slate-500">
            <p>Bunker Virtual v3.0</p>
            <p className="text-amber-500/60 mt-0.5">MÉTODO 5P &bull; Wagner Gois</p>
          </div>
        </div>
      </aside>

      {/* Mobile background overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 z-20"
        />
      )}
    </>
  );
}
