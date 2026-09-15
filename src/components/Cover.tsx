import { useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { ArrowRight, ClipboardCheck, LogIn, Shield } from "lucide-react";
import hero480 from "../assets/images/hero-casa-protegida-480.webp";
import hero720 from "../assets/images/hero-casa-protegida-720.webp";
import hero1024 from "../assets/images/hero-casa-protegida-1024.webp";

interface CoverProps {
  onStartReading: () => void;
  onGoToWorkbook: () => void;
  onGoToPrintable: () => void;
  onGoToEbook: () => void;
  userEmail: string | null;
  onOpenLogin: () => void;
}

const HERO_SRCSET = `${hero480} 480w, ${hero720} 720w, ${hero1024} 1024w`;
// Rendered width of the art frame at each breakpoint — keep in sync with the frame's width classes.
const HERO_SIZES =
  "(min-width: 1280px) 380px, (min-width: 1024px) 340px, (min-width: 768px) 270px, min(340px, calc(100vw - 40px))";

const BENEFITS = [
  { icon: Shield, title: "Simuladores Táticos", text: "Avalie cenários reais em tempo real." },
  { icon: ClipboardCheck, title: "Listas de Recursos", text: "Controle de suprimentos essenciais." },
];

const TRUST_ITEMS = ["Acesso protegido", "Progresso sincronizado", "Conteúdo completo"];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function Cover({ onGoToWorkbook, userEmail, onOpenLogin }: CoverProps) {
  const [heroFailed, setHeroFailed] = useState(false);

  return (
    // reducedMotion="user" drops transform animations when the OS asks for reduced motion
    <MotionConfig reducedMotion="user">
      <div
        id="book-cover-page"
        className="relative flex min-h-svh w-full flex-col overflow-x-clip bg-bunker-bg font-sans text-bunker-cream antialiased"
      >
        {/* Faint top light so the black ground has depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_100%_at_30%_0%,rgba(245,241,234,0.045),transparent_70%)]"
        />

        <header className="relative z-10 border-b border-bunker-cream/[0.08]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-bunker-amber/25 bg-bunker-amber/[0.07] min-[440px]:flex">
                <Shield className="size-[18px] text-bunker-amber" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="font-condensed text-xs font-semibold uppercase leading-none tracking-[0.22em] text-bunker-amber">
                  Método 5P
                </p>
                <p className="mt-1 font-condensed text-[15px] font-semibold leading-tight text-bunker-cream sm:text-[17px]">
                  Manual Completo de Sobrevivência
                </p>
              </div>
            </div>

            {userEmail ? (
              <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="max-w-[110px] truncate text-[13px] text-bunker-cream/85 sm:max-w-[200px]">
                  {userEmail}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-bunker-cream/15 bg-bunker-surface px-3 text-[13px] font-medium text-bunker-cream transition-colors duration-200 hover:border-bunker-amber/40 hover:text-bunker-amber-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bunker-amber sm:px-3.5 motion-reduce:transition-none"
              >
                <LogIn className="size-4" />
                <span>Sincronizar</span>
              </button>
            )}
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10 md:py-14 lg:gap-20 lg:py-16">
            {/* Copy — first on mobile, right column from md up */}
            <div className="flex flex-col items-start">
              <p className="flex items-center gap-3 font-condensed text-[13px] font-semibold uppercase tracking-[0.28em] text-bunker-amber">
                <span aria-hidden className="h-px w-8 bg-bunker-amber/60" />
                Método 5P
              </p>

              <h1 className="mt-4 font-condensed text-[2.5rem] font-bold uppercase leading-[0.95] text-bunker-cream sm:text-5xl md:text-[2.75rem] lg:text-[3.5rem]">
                Manual Completo de{" "}
                <span className="block text-bunker-amber">Sobrevivência Apocalíptica</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-bunker-muted lg:text-[17px]">
                Bem-vindo ao portal oficial de simuladores do Método 5P de Wagner Gois.
                Acesse ferramentas táticas interativas, calculadoras de suprimentos essenciais,
                mapeamento dinâmico de riscos e planos de comunicação integrados.
              </p>

              <ul className="mt-7 grid w-full max-w-xl grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {BENEFITS.map(({ icon: Icon, title, text }) => (
                  <li
                    key={title}
                    className="flex items-start gap-3 rounded-xl border border-bunker-cream/[0.08] bg-bunker-surface px-4 py-3.5"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-bunker-amber/10 text-bunker-amber">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.06em] text-bunker-cream">
                        {title}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-bunker-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onGoToWorkbook}
                  className="group flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] bg-bunker-amber px-7 py-3 text-[15px] font-semibold text-bunker-bg shadow-[0_10px_30px_-12px_rgba(243,179,64,0.55)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-bunker-amber-light hover:shadow-[0_14px_34px_-12px_rgba(255,200,92,0.6)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-bunker-amber-light active:translate-y-px sm:w-auto sm:text-base motion-reduce:transition-none"
                >
                  <span>Entrar e Acessar Todo o Conteúdo</span>
                  <ArrowRight className="size-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </button>
                <ul className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-bunker-muted lg:gap-x-2">
                  {TRUST_ITEMS.map((item, i) => (
                    <li key={item} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden className="hidden text-bunker-amber/60 lg:inline">•</span>}
                      <span aria-hidden className="size-1 rounded-full bg-bunker-amber/60 lg:hidden" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cover art — below the copy on mobile, left column from md up */}
            <motion.figure
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
              className="relative mx-auto w-full max-w-[340px] md:order-first md:mx-0 md:w-[270px] md:max-w-none lg:w-[340px] xl:w-[380px]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 -inset-y-12 rounded-full bg-[radial-gradient(closest-side,rgba(243,179,64,0.22),transparent)] blur-2xl motion-safe:animate-cover-glow"
              />

              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bunker-surface after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:ring-1 after:ring-inset after:ring-bunker-cream/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),0_18px_40px_-24px_rgba(243,179,64,0.25)]">
                {heroFailed ? (
                  <div className="flex size-full items-center justify-center p-8 text-center font-condensed text-2xl font-semibold uppercase leading-tight text-bunker-cream/70">
                    Manual Completo de Sobrevivência Apocalíptica
                  </div>
                ) : (
                  <img
                    src={hero720}
                    srcSet={HERO_SRCSET}
                    sizes={HERO_SIZES}
                    width={1024}
                    height={1536}
                    alt="Arte do Manual Completo de Sobrevivência Apocalíptica: casa iluminada durante uma tempestade e, em primeiro plano, rádio, lanterna, cantil, kit de primeiros socorros, bússola, mapa e corda sobre uma mesa."
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onError={() => setHeroFailed(true)}
                    className="size-full object-cover"
                  />
                )}
              </div>

              <span
                aria-hidden
                className="absolute -bottom-3.5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-bunker-amber/30 bg-bunker-raised px-3.5 py-1.5 font-condensed text-xs font-semibold uppercase tracking-[0.22em] text-bunker-amber shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)]"
              >
                <span className="size-1.5 rounded-full bg-bunker-amber" />
                Método 5P
              </span>
            </motion.figure>
          </div>
        </main>

        <footer className="relative z-10 border-t border-bunker-cream/[0.08]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-5 py-5 text-center text-[13px] text-bunker-muted sm:flex-row sm:justify-between sm:px-8 sm:text-left">
            <p>© 2026 Wagner Gois. Todos os direitos reservados.</p>
            <p className="flex flex-wrap items-center justify-center gap-x-2 font-condensed text-[13px] font-medium uppercase tracking-[0.12em] sm:tracking-[0.18em]">
              <span className="whitespace-nowrap text-bunker-cream/70">Manual de Sobrevivência Apocalíptica</span>
              <span aria-hidden className="text-bunker-amber/60">•</span>
              <span className="whitespace-nowrap text-bunker-amber/80">Método 5P</span>
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
