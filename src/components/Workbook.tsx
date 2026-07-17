import React, { useState } from "react";
import { UserProgress } from "../types";
import { scenariosData } from "../data/scenarios";
import {
  Calculator,
  Plus,
  Trash2,
  Printer,
  Droplet,
  Coffee,
  HeartPulse,
  Users,
  AlertTriangle,
  Award,
  Sparkles,
  ClipboardList,
  Save,
  HelpCircle,
  FileSpreadsheet,
  ShieldAlert,
  CheckCircle2
} from "lucide-react";

interface WorkbookProps {
  progress: UserProgress;
  onUpdateProgress: (updater: (prev: UserProgress) => UserProgress) => void;
  activeTab: "diagnostic" | "water" | "food" | "medical" | "comm" | "risk" | "scenarios";
  setActiveTab: (tab: "diagnostic" | "water" | "food" | "medical" | "comm" | "risk" | "scenarios") => void;
}

export default function Workbook({ progress, onUpdateProgress, activeTab, setActiveTab }: WorkbookProps) {

  // Local helper states for creating entries
  const [newFood, setNewFood] = useState({ item: "", qty: 1, calories: 1500, expiry: "", familyLikes: true, needsCooking: false });
  const [newMed, setNewMed] = useState({ name: "", person: "", dose: "", schedule: "", reserveDays: 7 });
  const [newContact, setNewContact] = useState({ name: "", relation: "", phone: "", message: "", point1: "", point2: "" });
  const [newRisk, setNewRisk] = useState<{
    threat: string;
    probability: "Alta" | "Baixa";
    impact: "Alto" | "Baixo";
    notes: string;
  }>({ threat: "", probability: "Alta", impact: "Alto", notes: "" });

  const areas = [
    { key: "agua", label: "Água & Hidratação", desc: "Estoque de água de grau alimentício e pastilhas/métodos de purificação." },
    { key: "comida", label: "Alimentação & Despensa", desc: "Estoque rotativo de alimentos secos e conservas caloricamente densas." },
    { key: "energia", label: "Energia & Iluminação", desc: "Baterias portáteis, gerador solar e suprimentos térmicos." },
    { key: "comunicacao", label: "Comunicações", desc: "Contato de segurança externa, ponto de encontro e rádios analógicos." },
    { key: "higiene", label: "Sanitarismo & Higiene", desc: "Estações de lavagem sem água encanada e descarte seguro de dejetos." },
    { key: "saude", label: "Suporte Médico", desc: "Kit médico tático, remédios essenciais de uso contínuo e treinamento." },
    { key: "abrigo", label: "Climatização & Abrigo", desc: "Estruturas térmicas de isolamento e bloqueio térmico de calor/frio." },
    { key: "seguranca", label: "Defesa & Discrição", desc: "Reforço físico mecânico de portas e discrição de estoques residenciais." },
    { key: "evacuacao", label: "Evacuação & Malas", desc: "Mochilas de emergência de 72 horas prontas e rotas rodoviárias." },
    { key: "financas", label: "Blindagem Financeira", desc: "Dinheiro vivo fracionado de reserva discreta e cópias de seguros." },
    { key: "documentos", label: "Dados & Vida Digital", desc: "Pasta de documentos civis e backup digital na nuvem criptografado." },
    { key: "psicologia", label: "Mentalidade Familiar", desc: "Liderança de crise estável e rotinas de manutenção ocupacional." }
  ];

  // Calculators dynamic values
  // 1. Water calculations
  const totalWaterRequired = progress.waterCalc.people * progress.waterCalc.days * 4; // 4 liters/person/day
  const calculatedWaterReserves = progress.foodCalc.reduce((acc, curr) => {
    if (curr.item.toLowerCase().includes("água") || curr.item.toLowerCase().includes("agua")) {
      return acc + (curr.qty * 1.5); // assuming standard water bottle items in list as 1.5 liters
    }
    return acc;
  }, 0) + (progress.waterCalc.customReserve || 0);

  const waterSecurityPct = totalWaterRequired > 0 ? Math.min(Math.round((calculatedWaterReserves / totalWaterRequired) * 100), 100) : 0;

  // 2. Food calculations
  const totalCaloriesRequired = progress.waterCalc.people * progress.waterCalc.days * 2200; // 2200 kcal/person/day
  const totalCaloriesAvailable = progress.foodCalc.reduce((acc, curr) => acc + (curr.qty * curr.calories), 0);
  const foodSecurityPct = totalCaloriesRequired > 0 ? Math.min(Math.round((totalCaloriesAvailable / totalCaloriesRequired) * 100), 100) : 0;
  const foodSurvivalDays = progress.waterCalc.people > 0 ? Math.round(totalCaloriesAvailable / (progress.waterCalc.people * 2200)) : 0;

  // 3. Overall Diagnostic Score
  const totalDiagnosticScore = Object.values(progress.diagnosticScores).reduce((acc, curr) => acc + curr, 0);
  const totalPossibleScore = areas.length * 5; // 60
  
  // Scoring bracket evaluation
  let tierLabel = "Vulnerável";
  let tierColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  let tierDescription = "Alta vulnerabilidade tática. Sua residência carece de sistemas vitais e de roteiros de emergência. Risco extremo de colapso cognitivo e físico nas primeiras 12 horas.";
  if (totalDiagnosticScore >= 21 && totalDiagnosticScore <= 40) {
    tierLabel = "Base em Formação";
    tierColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    tierDescription = "Sua residência possui suprimentos básicos individuais, mas carece de processos integrados de contingência e de plano de rotas familiares estáveis.";
  } else if (totalDiagnosticScore >= 41 && totalDiagnosticScore <= 55) {
    tierLabel = "Preparado";
    tierColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    tierDescription = "Excelente resiliência e maturidade. Sua casa é capaz de atravessar blefe de redes públicas, intempéries severas e pânico sem assistência primária.";
  } else if (totalDiagnosticScore >= 56) {
    tierLabel = "Elite Resiliente";
    tierColor = "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 bg-amber-500/10 border-amber-500/30";
    tierDescription = "Nível máximo de prontidão militar e familiar. Planejamentos integrados de vizinhança ativa, manutenção regular de rotas e autonomia absoluta.";
  }

  // Handle diagnostic rating changes
  const handleScoreChange = (areaKey: string, score: number) => {
    onUpdateProgress((prev) => ({
      ...prev,
      diagnosticScores: {
        ...prev.diagnosticScores,
        [areaKey]: score
      }
    }));
  };

  // Add / Delete array entries
  const addFoodItem = () => {
    if (!newFood.item) return;
    onUpdateProgress((prev) => ({
      ...prev,
      foodCalc: [...prev.foodCalc, { ...newFood, id: `food-${Date.now()}` }]
    }));
    setNewFood({ item: "", qty: 1, calories: 1500, expiry: "", familyLikes: true, needsCooking: false });
  };

  const deleteFoodItem = (id: string) => {
    onUpdateProgress((prev) => ({
      ...prev,
      foodCalc: prev.foodCalc.filter((item) => item.id !== id)
    }));
  };

  const addMedItem = () => {
    if (!newMed.name) return;
    onUpdateProgress((prev) => ({
      ...prev,
      medicationList: [...prev.medicationList, { ...newMed, id: `med-${Date.now()}` }]
    }));
    setNewMed({ name: "", person: "", dose: "", schedule: "", reserveDays: 7 });
  };

  const deleteMedItem = (id: string) => {
    onUpdateProgress((prev) => ({
      ...prev,
      medicationList: prev.medicationList.filter((item) => item.id !== id)
    }));
  };

  const addContactItem = () => {
    if (!newContact.name) return;
    onUpdateProgress((prev) => ({
      ...prev,
      commContacts: [...prev.commContacts, { ...newContact, id: `contact-${Date.now()}` }]
    }));
    setNewContact({ name: "", relation: "", phone: "", message: "", point1: "", point2: "" });
  };

  const deleteContactItem = (id: string) => {
    onUpdateProgress((prev) => ({
      ...prev,
      commContacts: prev.commContacts.filter((item) => item.id !== id)
    }));
  };

  const addRiskItem = () => {
    if (!newRisk.threat) return;
    onUpdateProgress((prev) => ({
      ...prev,
      riskMapping: [...prev.riskMapping, { ...newRisk, id: `risk-${Date.now()}` }]
    }));
    setNewRisk({ threat: "", probability: "Alta", impact: "Alto", notes: "" });
  };

  const deleteRiskItem = (id: string) => {
    onUpdateProgress((prev) => ({
      ...prev,
      riskMapping: prev.riskMapping.filter((item) => item.id !== id)
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-grow flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans" id="workbook-pane">
      {/* Tab Selector Toolbar - Hidden on Print */}
      <div className="p-4 border-b border-slate-900 bg-slate-950 flex flex-wrap gap-2 items-center justify-between shrink-0 print:hidden z-10">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "diagnostic"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Diagnóstico 5P</span>
          </button>
          
          <button
            onClick={() => setActiveTab("water")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "water"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Droplet className="h-3.5 w-3.5" />
            <span>Calculadora de Água</span>
          </button>

          <button
            onClick={() => setActiveTab("food")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "food"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>Inventário de Comida</span>
          </button>

          <button
            onClick={() => setActiveTab("medical")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "medical"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Ficha de Remédios</span>
          </button>

          <button
            onClick={() => setActiveTab("comm")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "comm"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Plano de Contatos</span>
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "risk"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Mapa de Risco</span>
          </button>

          <button
            onClick={() => setActiveTab("scenarios")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border ${
              activeTab === "scenarios"
                ? "bg-amber-500 text-slate-950 border-transparent"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Cenários de Crise</span>
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-1.5 text-xs font-mono border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded transition-colors text-slate-300 cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Imprimir Fichas</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto p-6 md:p-8 print:p-0 print:overflow-visible">
        <div className="max-w-4xl mx-auto space-y-8 print:max-w-full">
          
          {/* TAB: DIAGNOSTIC PANEL */}
          {activeTab === "diagnostic" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <ClipboardList className="h-4.5 w-4.5" />
                  <span>Módulo de Gestão de Risco</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Diagnóstico Geral 5P</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Atribua uma nota de 0 a 5 de acordo com a sua maturidade real de preparação em cada pilar. O sistema calculará o seu índice consolidado de resiliência.
                </p>
              </div>

              {/* Dynamic Preparedness Scoreboard */}
              <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-900 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 text-center md:border-r md:border-slate-800 py-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Sua Pontuação Total</span>
                  <div className="text-5xl font-serif font-black text-amber-500 mt-1">{totalDiagnosticScore} <span className="text-sm font-sans text-slate-500">/ 60</span></div>
                  <div className={`mt-3 inline-block px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border ${tierColor}`}>
                    {tierLabel}
                  </div>
                </div>
                <div className="md:col-span-8 space-y-2.5">
                  <h4 className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">Parecer Técnico de Resiliência</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{tierDescription}</p>
                  
                  {/* Dynamic Meter */}
                  <div className="space-y-1 pt-2">
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(totalDiagnosticScore / 60) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>Vulnerável (0)</span>
                      <span>Resiliente (60)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slider Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {areas.map((area) => {
                  const areaScore = progress.diagnosticScores[area.key] || 0;
                  return (
                    <div key={area.key} className="bg-slate-900/20 p-4 rounded-lg border border-slate-900 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-slate-200">{area.label}</h4>
                          <span className="bg-slate-900 border border-slate-800 text-amber-500 font-mono text-xs px-2 py-0.5 rounded font-black">
                            {areaScore} / 5
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-normal">{area.desc}</p>
                      </div>
                      <div className="flex items-center space-x-3 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="1"
                          value={areaScore}
                          onChange={(e) => handleScoreChange(area.key, parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((idx) => (
                            <div
                              key={idx}
                              className={`h-2.5 w-1.5 rounded-full ${
                                idx <= areaScore ? "bg-amber-500" : "bg-slate-800"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: WATER CALCULATOR */}
          {activeTab === "water" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <Droplet className="h-4.5 w-4.5" />
                  <span>Soberania de Ingestão</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Calculadora de Estoque de Água</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Insira o tamanho da sua família e os dias de autonomia desejados. O sistema fará o dimensionamento automático.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Inputs */}
                <div className="bg-slate-900/30 p-5 rounded-lg border border-slate-900 space-y-4">
                  <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">Parâmetros Iniciais</h3>
                  
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 block font-mono uppercase">Pessoas da Casa:</label>
                    <input
                      type="number"
                      min="1"
                      value={progress.waterCalc.people}
                      onChange={(e) =>
                        onUpdateProgress((prev) => ({
                          ...prev,
                          waterCalc: { ...prev.waterCalc, people: Math.max(1, parseInt(e.target.value) || 1) }
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 block font-mono uppercase">Dias de Autonomia:</label>
                    <input
                      type="number"
                      min="1"
                      value={progress.waterCalc.days}
                      onChange={(e) =>
                        onUpdateProgress((prev) => ({
                          ...prev,
                          waterCalc: { ...prev.waterCalc, days: Math.max(1, parseInt(e.target.value) || 1) }
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 block font-mono uppercase">Reserva Customizada (Litros):</label>
                    <input
                      type="number"
                      min="0"
                      value={progress.waterCalc.customReserve}
                      onChange={(e) =>
                        onUpdateProgress((prev) => ({
                          ...prev,
                          waterCalc: { ...prev.waterCalc, customReserve: Math.max(0, parseInt(e.target.value) || 0) }
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Outputs Panel */}
                <div className="md:col-span-2 bg-slate-900/60 p-5 rounded-lg border border-slate-900 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">Relatório Técnico do Estoque</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded border border-slate-900">
                        <span className="text-[10px] text-slate-500 font-mono block uppercase">Volume Mínimo Obrigatório</span>
                        <span className="text-2xl font-serif font-black text-amber-500 mt-1">{totalWaterRequired} Litros</span>
                      </div>
                      <div className="bg-slate-950 p-4 rounded border border-slate-900">
                        <span className="text-[10px] text-slate-500 font-mono block uppercase">Seu Estoque Atual Real</span>
                        <span className="text-2xl font-serif font-black text-emerald-500 mt-1">{calculatedWaterReserves} Litros</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Nível de Cobertura de Segurança</span>
                        <span className={`${waterSecurityPct >= 100 ? "text-emerald-500" : "text-amber-500"} font-bold`}>{waterSecurityPct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${waterSecurityPct >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${waterSecurityPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-950/80 p-3 rounded border border-slate-900 leading-relaxed font-sans mt-4 space-y-2">
                    <div>
                      <strong className="text-amber-500 block font-medium mb-1 font-mono uppercase text-[10px]">Metrologia de Água & Segurança Biológica</strong>
                      As diretrizes técnicas da <strong>FEMA (EUA)</strong> e do <strong>CDC</strong> estabelecem o estoque mínimo absoluto de <strong>1 galão por pessoa ao dia (aproximadamente 3,8 litros)</strong> para necessidades biológicas e de higiene. O Método 5P adota operacionalmente a métrica de <strong>4 litros</strong> como uma margem preventiva arredondada que facilita a logística de cálculos e estocagem familiar.
                    </div>
                    <div>
                      Armazene esse volume em bombonas plásticas de polietileno de alta densidade (HDPE) de grau alimentício. Separe rigorosamente a água de ingestão da água cinza (para banho e descargas secundárias).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FOOD INVENTORY */}
          {activeTab === "food" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <Coffee className="h-4.5 w-4.5" />
                  <span>Soberania Alimentar</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Inventário do Estoque de Comida</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Registre seus suprimentos. O sistema somará as calorias brutas disponíveis e estimará a autonomia real em dias.
                </p>
              </div>

              {/* Food Stats Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-900">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Calorias Disponíveis Totais</span>
                  <span className="text-2xl font-serif font-black text-amber-500 mt-0.5">{totalCaloriesAvailable.toLocaleString()} Kcal</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-900">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Autonomia Estimada Bruta</span>
                  <span className="text-2xl font-serif font-black text-emerald-500 mt-0.5">{foodSurvivalDays} Dias</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-900">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Status da Despensa</span>
                  <span className={`text-sm font-mono font-bold uppercase tracking-wider mt-1.5 block ${foodSurvivalDays >= progress.waterCalc.days ? "text-emerald-500" : "text-amber-500"}`}>
                    {foodSurvivalDays >= progress.waterCalc.days ? "Despensa Segura" : "Estoque Insuficiente"}
                  </span>
                </div>
              </div>

              {/* Add New Item Form - Hidden on Print */}
              <div className="bg-slate-900/30 p-5 rounded-lg border border-slate-900 space-y-4 print:hidden">
                <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">Registrar Novo Item na Prateleira</h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Nome do Alimento:</label>
                    <input
                      type="text"
                      placeholder="Ex: Sardinha em Lata, Arroz..."
                      value={newFood.item}
                      onChange={(e) => setNewFood({ ...newFood, item: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Quantidade:</label>
                    <input
                      type="number"
                      min="1"
                      value={newFood.qty}
                      onChange={(e) => setNewFood({ ...newFood, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Calorias (Unidade):</label>
                    <input
                      type="number"
                      min="0"
                      value={newFood.calories}
                      onChange={(e) => setNewFood({ ...newFood, calories: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Validade:</label>
                    <input
                      type="text"
                      placeholder="Ex: 12/2027"
                      value={newFood.expiry}
                      onChange={(e) => setNewFood({ ...newFood, expiry: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      onClick={addFoodItem}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Registrar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/10">
                <table className="w-full border-collapse text-left text-xs text-slate-300 font-sans">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 font-mono text-slate-400 text-[10px] uppercase">
                      <th className="p-3">Alimento</th>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Kcal Un.</th>
                      <th className="p-3">Total Kcal</th>
                      <th className="p-3">Validade</th>
                      <th className="p-3 text-right print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {progress.foodCalc.map((food) => (
                      <tr key={food.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">{food.item}</td>
                        <td className="p-3">{food.qty}</td>
                        <td className="p-3">{food.calories.toLocaleString()} Kcal</td>
                        <td className="p-3 text-amber-500 font-mono font-bold">{(food.qty * food.calories).toLocaleString()} Kcal</td>
                        <td className="p-3 text-slate-400">{food.expiry || "N/D"}</td>
                        <td className="p-3 text-right print:hidden">
                          <button
                            onClick={() => deleteFoodItem(food.id)}
                            className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {progress.foodCalc.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-600 italic font-mono">
                          Nenhum alimento registrado no inventário da despensa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: MEDICAL LOG */}
          {activeTab === "medical" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <HeartPulse className="h-4.5 w-4.5" />
                  <span>Suporte Médico</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Ficha de Remédios Essenciais</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Registre as fórmulas clínicas de uso contínuo da família, dosagens, horários de ingestão e dias de cobertura ativa.
                </p>
              </div>

              {/* Form - Hidden on Print */}
              <div className="bg-slate-900/30 p-5 rounded-lg border border-slate-900 space-y-4 print:hidden">
                <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">Registrar Nova Fórmula Crítica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Medicamento:</label>
                    <input
                      type="text"
                      placeholder="Ex: Insulina, Losartana..."
                      value={newMed.name}
                      onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Paciente:</label>
                    <input
                      type="text"
                      placeholder="Ex: Avô, Maria..."
                      value={newMed.person}
                      onChange={(e) => setNewMed({ ...newMed, person: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Dose:</label>
                    <input
                      type="text"
                      placeholder="Ex: 50mg..."
                      value={newMed.dose}
                      onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Horário:</label>
                    <input
                      type="text"
                      placeholder="Ex: 12 em 12h..."
                      value={newMed.schedule}
                      onChange={(e) => setNewMed({ ...newMed, schedule: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Dias Estoque:</label>
                    <input
                      type="number"
                      min="1"
                      value={newMed.reserveDays}
                      onChange={(e) => setNewMed({ ...newMed, reserveDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      onClick={addMedItem}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded text-xs transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/10">
                <table className="w-full border-collapse text-left text-xs text-slate-300 font-sans">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 font-mono text-slate-400 text-[10px] uppercase">
                      <th className="p-3">Medicamento</th>
                      <th className="p-3">Integrante</th>
                      <th className="p-3">Dose</th>
                      <th className="p-3">Horário</th>
                      <th className="p-3">Dias de Reserva</th>
                      <th className="p-3 text-right print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {progress.medicationList.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">{med.name}</td>
                        <td className="p-3">{med.person}</td>
                        <td className="p-3">{med.dose}</td>
                        <td className="p-3">{med.schedule}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            med.reserveDays >= 30 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {med.reserveDays} Dias
                          </span>
                        </td>
                        <td className="p-3 text-right print:hidden">
                          <button
                            onClick={() => deleteMedItem(med.id)}
                            className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {progress.medicationList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-600 italic font-mono">
                          Nenhum remédio de uso contínuo registrado na ficha médica.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: COMMUNICATION PLAN */}
          {activeTab === "comm" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <Users className="h-4.5 w-4.5" />
                  <span>Canais de Conexão</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Plano de Contatos de Emergência</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Registre as pessoas âncoras fora da sua região geográfica e defina os pontos físicos de reunião familiar automática.
                </p>
              </div>

              {/* Form - Hidden on Print */}
              <div className="bg-slate-900/30 p-5 rounded-lg border border-slate-900 space-y-4 print:hidden">
                <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">Registrar Novo Contato de Apoio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Nome:</label>
                    <input
                      type="text"
                      placeholder="Ex: Tio João..."
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Relação/Cidade:</label>
                    <input
                      type="text"
                      placeholder="Ex: Primo, Curitiba..."
                      value={newContact.relation}
                      onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Telefone:</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block font-mono text-[9px]">Encontro Perto:</label>
                    <input
                      type="text"
                      placeholder="Praça da esquina..."
                      value={newContact.point1}
                      onChange={(e) => setNewContact({ ...newContact, point1: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block font-mono text-[9px]">Encontro Longe:</label>
                    <input
                      type="text"
                      placeholder="Posto Km 45..."
                      value={newContact.point2}
                      onChange={(e) => setNewContact({ ...newContact, point2: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      onClick={addContactItem}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded text-xs transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/10">
                <table className="w-full border-collapse text-left text-xs text-slate-300 font-sans">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 font-mono text-slate-400 text-[10px] uppercase">
                      <th className="p-3">Nome</th>
                      <th className="p-3">Vínculo/Cidade</th>
                      <th className="p-3">Telefone</th>
                      <th className="p-3">Encontro Perto</th>
                      <th className="p-3">Encontro Longe</th>
                      <th className="p-3 text-right print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {progress.commContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">{contact.name}</td>
                        <td className="p-3 text-slate-300">{contact.relation}</td>
                        <td className="p-3 font-mono text-amber-500 font-bold">{contact.phone}</td>
                        <td className="p-3 text-slate-400">{contact.point1 || "Não def."}</td>
                        <td className="p-3 text-slate-400">{contact.point2 || "Não def."}</td>
                        <td className="p-3 text-right print:hidden">
                          <button
                            onClick={() => deleteContactItem(contact.id)}
                            className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {progress.commContacts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-600 italic font-mono">
                          Nenhum contato ou ponto de encontro registrado no plano de comunicação.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: RISK MAPPING */}
          {activeTab === "risk" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  <span>Matriz de Vulnerabilidade</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Mapa de Risco da Região</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Mapeie as interrupções urbanas e intempéries mais frequentes no seu CEP. Priorize recursos com base na probabilidade matemática.
                </p>
              </div>

              {/* Form - Hidden on Print */}
              <div className="bg-slate-900/30 p-5 rounded-lg border border-slate-900 space-y-4 print:hidden">
                <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">Registrar Nova Ameaça Local</h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Ameaça / Desastre:</label>
                    <input
                      type="text"
                      placeholder="Ex: Alagamento no portão, Vendaval..."
                      value={newRisk.threat}
                      onChange={(e) => setNewRisk({ ...newRisk, threat: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Probabilidade:</label>
                    <select
                      value={newRisk.probability}
                      onChange={(e) => setNewRisk({ ...newRisk, probability: e.target.value as "Alta" | "Baixa" })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Alta">Alta</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Impacto Estrutural:</label>
                    <select
                      value={newRisk.impact}
                      onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value as "Alto" | "Baixo" })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Alto">Alto</option>
                      <option value="Baixo">Baixo</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 block">Notas de Contingência:</label>
                    <input
                      type="text"
                      placeholder="Ex: Desligar disjuntor pátio..."
                      value={newRisk.notes}
                      onChange={(e) => setNewRisk({ ...newRisk, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      onClick={addRiskItem}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded text-xs transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/10">
                <table className="w-full border-collapse text-left text-xs text-slate-300 font-sans">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 font-mono text-slate-400 text-[10px] uppercase">
                      <th className="p-3">Ameaça Registrada</th>
                      <th className="p-3">Probabilidade</th>
                      <th className="p-3">Impacto Dano</th>
                      <th className="p-3">Ação de Resposta Tática</th>
                      <th className="p-3 text-right print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {progress.riskMapping.map((risk) => (
                      <tr key={risk.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">{risk.threat}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            risk.probability === "Alta" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-800 text-slate-400"
                          }`}>
                            {risk.probability}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            risk.impact === "Alto" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-800 text-slate-400"
                          }`}>
                            {risk.impact}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{risk.notes || "Nenhuma nota inserida."}</td>
                        <td className="p-3 text-right print:hidden">
                          <button
                            onClick={() => deleteRiskItem(risk.id)}
                            className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {progress.riskMapping.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-600 italic font-mono">
                          Nenhuma ameaça cadastrada no mapa de riscos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CRISIS SCENARIOS */}
          {activeTab === "scenarios" && (
            <div className="space-y-6">
              <div className="border-b border-slate-950 pb-4">
                <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
                  <ShieldAlert className="h-4.5 w-4.5" />
                  <span>Mapeamento & Resiliência em Cenários de Pânico</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Simulador de Cenários de Crise</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Avalie a preparação prática de sua família contra os 6 piores cenários de colapso urbano. Marque cada ação preventiva realizada para calcular seu índice de prontidão.
                </p>
              </div>

              {/* Scenarios Grid */}
              <div className="grid grid-cols-1 gap-6">
                {scenariosData.map((scenario) => {
                  // Calculate preparedness for this scenario
                  const scenarioCompletedKeys = scenario.steps.map((_, idx) => `scenario-${scenario.id}-chk-${idx}`);
                  const completedCount = scenarioCompletedKeys.filter((key) => progress.completedChecklists.includes(key)).length;
                  const pct = Math.round((completedCount / scenario.steps.length) * 100);

                  let scenarioStatusLabel = "Iniciado";
                  let scenarioStatusColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
                  if (pct === 100) {
                    scenarioStatusLabel = "Blindado e Preparado";
                    scenarioStatusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                  } else if (pct >= 40) {
                    scenarioStatusLabel = "Estrutura Intermediária";
                    scenarioStatusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                  }

                  return (
                    <div key={scenario.id} className="bg-slate-900/40 p-5 md:p-6 rounded-xl border border-slate-900 space-y-4">
                      {/* Scenario Title and Description */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-1.5 flex-grow">
                          <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                            <span className="text-amber-500 font-mono text-sm">{scenario.id.toUpperCase()}</span>
                            <span>{scenario.title}</span>
                          </h3>
                          <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-sans text-justify">
                            {scenario.description}
                          </p>
                        </div>
                        <div className="shrink-0 text-left md:text-right space-y-1.5">
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Prontidão Tática</span>
                          <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${scenarioStatusColor}`}>
                            {scenarioStatusLabel} ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Preparedness Meter */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct === 100 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-500">
                          <span>Não Preparado (0%)</span>
                          <span>Ações Tomadas: {completedCount} de {scenario.steps.length}</span>
                          <span>Totalmente Seguro (100%)</span>
                        </div>
                      </div>

                      {/* Interactive Action Steps */}
                      <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-900/60 space-y-2.5">
                        <span className="font-mono text-[10px] uppercase text-amber-500/80 tracking-wider font-bold block mb-1">
                          Plano de Ações Críticas e Práticas
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {scenario.steps.map((step, idx) => {
                            const key = `scenario-${scenario.id}-chk-${idx}`;
                            const isChecked = progress.completedChecklists.includes(key);
                            const parts = step.split(":");
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  onUpdateProgress((prev) => {
                                    const hasIt = prev.completedChecklists.includes(key);
                                    const completedChecklists = hasIt
                                      ? prev.completedChecklists.filter((k) => k !== key)
                                      : [...prev.completedChecklists, key];
                                    return { ...prev, completedChecklists };
                                  });
                                }}
                                className={`flex items-start space-x-3 p-2 rounded cursor-pointer transition-colors border select-none ${
                                  isChecked
                                    ? "bg-amber-500/5 border-amber-500/10 text-amber-400"
                                    : "bg-slate-900/20 border-transparent text-slate-400 hover:bg-slate-900/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // handled by wrapper click
                                  className="mt-0.5 rounded border-slate-800 text-amber-500 focus:ring-amber-500/30 shrink-0 h-4 w-4 cursor-pointer"
                                />
                                <span className="text-xs font-sans leading-tight">
                                  {parts.length > 1 ? (
                                    <>
                                      <strong className="text-amber-500/90 font-medium">{parts[0]}:</strong>
                                      {parts.slice(1).join(":")}
                                    </>
                                  ) : (
                                    step
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
