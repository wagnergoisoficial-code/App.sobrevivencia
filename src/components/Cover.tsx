import { motion } from "motion/react";
import { BookOpen, Shield, ClipboardCheck, LogIn, Printer } from "lucide-react";
import coverImg from "../assets/images/cover_image.png";

interface CoverProps {
  onStartReading: () => void;
  onGoToWorkbook: () => void;
  onGoToPrintable: () => void;
  onGoToEbook: () => void;
  userEmail: string | null;
  onOpenLogin: () => void;
}

export default function Cover({ onStartReading, onGoToWorkbook, onGoToPrintable, onGoToEbook, userEmail, onOpenLogin }: CoverProps) {
  // Use the imported image which Vite automatically hashes and cache-busts on build
   const coverImgSrc = coverImg;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto relative select-none" id="book-cover-page">
      {/* Intense atmospheric amber back-light centered behind the book */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 pointer-events-none z-0" />

      {/* Header bar */}
      <header className="px-4 py-4 sm:px-6 flex justify-between items-center border-b border-slate-900 bg-slate-950/80 backdrop-blur-md z-20 flex-shrink-0">
        <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
          <Shield className="h-4 w-4 text-amber-500" />
          <span className="tracking-widest uppercase font-bold text-[10px] sm:text-xs">MÉTODO 5P &bull; Wagner Gois</span>
        </div>
        
        <div>
          {userEmail ? (
            <div className="flex items-center space-x-2 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs text-slate-300 max-w-[120px] sm:max-w-[180px] truncate">{userEmail}</span>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 text-xs font-mono border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-1.5 rounded text-amber-500 transition-all cursor-pointer font-bold uppercase tracking-wider shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sincronizar</span>
            </button>
          )}
        </div>
      </header>

      {/* Centered Cover Showcase */}
      <main className="flex-grow flex items-center justify-center px-4 py-6 sm:py-10 md:py-12 z-10 relative">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center px-2">
          
          {/* Left Column: Cover Image Showcase */}
          <div className="md:col-span-5 flex justify-center md:justify-end flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="relative w-[240px] sm:w-[280px] md:w-[260px] lg:w-[320px] xl:w-[360px] aspect-[2/3] rounded-2xl shadow-[0_20px_40px_-15px_rgba(245,158,11,0.25)] md:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.35)] overflow-hidden group bg-slate-950 border border-slate-800 transition-all duration-300 hover:border-amber-500/30 flex-shrink-0"
            >
              {/* Subtle glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/5 z-10 pointer-events-none" />
              
              <img
                src={coverImgSrc}
                alt="Manual Completo de Sobrevivência Apocalíptica"
                className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col justify-between p-6 text-center border-l-4 border-slate-800">
                        <div class="border border-amber-500/20 rounded p-1 bg-amber-500/5 inline-block mx-auto">
                          <span class="font-mono text-[9px] sm:text-[10px] tracking-widest text-amber-500 uppercase font-bold">Edição 3.0 Premium</span>
                        </div>
                        <div class="space-y-3 my-auto">
                          <h2 class="font-serif text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-slate-100">MANUAL COMPLETO</h2>
                          <h1 class="font-serif text-2xl sm:text-3xl font-black text-amber-500 tracking-wider">SOBREVIVÊNCIA APOCALÍPTICA</h1>
                          <p class="font-sans text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest mt-1">MÉTODO 5P &bull; WAGNER GOIS</p>
                        </div>
                        <div class="border-t border-slate-800/80 pt-3 font-mono text-[9px] text-slate-500 flex justify-between uppercase">
                          <span>Resiliência</span>
                          <span>Soberania</span>
                          <span>Tática</span>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </motion.div>
          </div>

          {/* Right Column: Title and CTA content */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left space-y-4 sm:space-y-6 md:space-y-8">
            <div className="space-y-2 sm:space-y-3">
              <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-amber-500 font-bold uppercase block">
                Edição Premium
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl font-serif font-black tracking-tight leading-tight sm:leading-none text-slate-100 uppercase">
                Manual Completo de <br className="hidden md:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500">
                  Sobrevivência Apocalíptica
                </span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-400 font-sans max-w-sm sm:max-w-md md:max-w-xl leading-relaxed mt-2">
                Bem-vindo ao portal oficial de simuladores do Método 5P de Wagner Gois. 
                Acesse ferramentas táticas interativas, calculadoras de suprimentos essenciais, 
                mapeamento dinâmico de riscos e planos de comunicação integrados.
              </p>
            </div>

            {/* Core features list - visible on desktop and tablet */}
            <div className="hidden sm:grid grid-cols-2 gap-4 w-full max-w-lg">
              <div className="flex items-start space-x-3 bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Simuladores Táticos</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Avalie cenários reais em tempo real.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Listas de Recursos</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Controle de suprimentos essenciais.</p>
                </div>
              </div>
            </div>

            {/* Actions Block - very direct, compact, high-contrast and zero-scroll */}
            <div className="w-full max-w-xs sm:max-w-sm space-y-3 px-2 sm:px-0">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={onGoToWorkbook}
                className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-sans font-bold px-5 py-3 sm:py-3.5 rounded-xl shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
              >
                <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-slate-950 animate-pulse" />
                <span>Entrar no Painel e Simuladores</span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                onClick={onGoToEbook}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-amber-500 border border-amber-500/20 font-sans font-bold px-5 py-3 sm:py-3.5 rounded-xl transition-all cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
              >
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                <span>Ler Manual Completo (Ebook)</span>
              </motion.button>
            </div>
          </div>

        </div>
      </main>

      {/* Simplified, premium footer info */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-3 sm:py-4 text-center text-[9px] sm:text-xs font-mono text-slate-500 z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-1">
          <p>© 2026 Wagner Gois. Todos os direitos reservados.</p>
          <div className="flex space-x-3">
            <span className="text-amber-500/70 font-bold uppercase">Manual de Sobrevivência Apocalíptica</span>
            <span>MÉTODO 5P</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
