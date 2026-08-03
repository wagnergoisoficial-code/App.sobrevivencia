import React from "react";
import { ArrowLeft, BookOpen, Download, ExternalLink, Shield } from "lucide-react";

interface EbookReaderProps {
  onBackToCover: () => void;
}

export default function EbookReader({ onBackToCover }: EbookReaderProps) {
  return (
    <div className="flex-grow flex flex-col h-screen max-h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans" id="ebook-reader-container">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToCover}
            className="flex items-center space-x-2 text-xs font-mono text-amber-500 hover:text-amber-400 transition-colors uppercase font-bold cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg"
            id="btn-ebook-back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>
          
          <div className="h-6 w-px bg-slate-800 hidden sm:block" />
          
          <div>
            <h2 className="text-sm font-serif font-bold text-slate-100 flex items-center gap-1.5 leading-none">
              <BookOpen className="h-4 w-4 text-amber-500" />
              <span>Manual de Sobrevivência</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">
              Edição Completa &bull; Método 5P
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
            <Shield className="h-3 w-3 animate-pulse" />
            <span>Acesso Autorizado</span>
          </div>
          <a
            href="/ebook/manual-sobrevivencia.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-[10px] text-amber-500 hover:text-amber-400 hover:underline font-bold uppercase tracking-wider cursor-pointer"
            id="link-ebook-new-tab"
          >
            <span>Nova Aba</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Prominent primary action: download the full PDF */}
      <div className="px-4 md:px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <a
          href="/ebook/manual-sobrevivencia.pdf"
          download="Manual Completo de Sobrevivencia Apocaliptica - Edicao 3.0 Premium.pdf"
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold px-6 sm:px-10 py-3.5 rounded-xl text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer"
          id="btn-ebook-download-primary"
        >
          <Download className="h-5 w-5" />
          <span>Baixar Manual Completo em PDF</span>
        </a>
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center">
          Salve no seu dispositivo &bull; Acesso vitalício
        </p>
      </div>

      {/* Main Content Area: PDF Visualizer */}
      <main className="flex-grow p-4 md:p-6 bg-slate-950 flex flex-col overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none z-0" />
        
        <div className="w-full h-full flex-grow relative rounded-xl border border-slate-800 bg-slate-900 overflow-hidden z-10 shadow-2xl">
          <object
            data="/ebook/manual-sobrevivencia.pdf"
            type="application/pdf"
            className="w-full h-full border-0"
          >
            <iframe
              src="/ebook/manual-sobrevivencia.pdf"
              className="w-full h-full border-0"
              title="Manual Completo de Sobrevivência Apocalíptica"
            >
              <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-slate-900">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4">
                  <BookOpen className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-serif font-bold text-slate-100 mb-2">Visualizador de PDF não suportado</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Seu navegador ou dispositivo não consegue exibir o manual diretamente na página. 
                  Use o botão abaixo para abrir o arquivo completo com segurança em uma nova guia.
                </p>
                <a
                  href="/ebook/manual-sobrevivencia.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors shadow-md shadow-amber-500/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir Manual Completo</span>
                </a>
              </div>
            </iframe>
          </object>
        </div>
      </main>
    </div>
  );
}
