import React from "react";
import { AlertTriangle, BookOpen, CheckCircle2, ShieldAlert, FileText, ExternalLink, HelpCircle, Users, Award, MapPin } from "lucide-react";

export default function Author() {
  return (
    <div className="flex-grow h-screen overflow-y-auto bg-slate-950 text-slate-100 flex flex-col font-sans" id="author-audit-pane">
      {/* Top Header */}
      <div className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-white">Relatório de Auditoria Editorial & Erratas</h1>
            <p className="text-[10px] text-slate-500 font-mono">Edição 3.0 &bull; Parecer de Autocrítica & Correções Clínicas</p>
          </div>
        </div>
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-widest animate-pulse">
          Status: Em Correção Rígida
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto p-6 md:py-10 space-y-8">
        
        {/* Brutal Self-Criticism Callout */}
        <div className="bg-slate-900/40 border border-rose-950/40 rounded-xl p-6 md:p-8 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center space-x-2 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest">Compromisso Ético & Declaração de Autocrítica</h2>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              "A preparação para emergências lida diretamente com a preservação da vida humana. Escrever com excessiva autoconfiança sobre protocolos médicos ou fórmulas matemáticas imprecisas sem o devido embasamento técnico não é apenas um desvio metodológico; é uma negligência que pode levar pessoas comuns ao pânico, à invalidez permanente ou ao óbito."
            </p>
            <p className="text-sm text-slate-400 leading-relaxed font-sans italic">
              Como autor do Método 5P, assumo integral responsabilidade pelos erros identificados pela Direção Editorial na versão anterior. Sobrevivencialismo sério não se faz com marketing de pânico ou falsas promessas de segurança; faz-se com humildade intelectual, rigor metrológico e submissão cega às autoridades de saúde e defesa civil. Esta página serve como errata pública incondicional e registro das correções vitais realizadas nesta edição revisada.
            </p>
            <div className="text-xs text-slate-500 font-mono pt-2">
              &mdash; <strong>Wagner Gois</strong>, São José do Rio Preto (SP) / Sobrevivencialista e Estratégico do Lar.
            </div>
          </div>
        </div>

        {/* Audit Findings and Actions Taken Grid */}
        <div className="space-y-6">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Memorial de Correções Editoriais Realizadas</span>
          </h3>

          <div className="grid grid-cols-1 gap-4">
            
            {/* FINDING 1 */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className="bg-rose-500/10 text-rose-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Erros Críticos Removidos</span>
                <span className="text-[10px] text-slate-500 font-mono">Ref: Cap. 24B (KI)</span>
              </div>
              <h4 className="text-sm font-bold text-slate-200">1. Prescrição de Medicamentos & Riscos à Saúde (Iodeto de Potássio - KI)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>O Erro:</strong> A versão anterior orientava a estocagem e uso de pastilhas de Iodeto de Potássio (KI) com o mesmo tom instrutivo de insumos domésticos comuns, ignorando contraindicações graves (gestantes, tireoidopatas, alérgicos a iodo, nefropatas) e riscos de dosagens baseadas em pânico.
              </p>
              <p className="text-xs text-emerald-400 bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded">
                <strong>A Correção:</strong> Toda e qualquer prescrição ou sugestão de autoadministração de KI foi eliminada do Capítulo 24B. O manual agora deixa claro que o livro não possui autoridade sanitária, condena a automedicação e enfatiza as contraindicações fatais do medicamento (como choque renal ou colapso total glandular), alertando que a dosagem e ingestão do KI dependem estritamente de peso e idade, devendo ocorrer unicamente sob orientação oficial expressa das autoridades médicas de Defesa Civil em emergências ativas.
              </p>
            </div>

            {/* FINDING 2 */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className="bg-rose-500/10 text-rose-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Erros Críticos Removidos</span>
                <span className="text-[10px] text-slate-500 font-mono">Ref: Cap. 24B (7:10)</span>
              </div>
              <h4 className="text-sm font-bold text-slate-200">2. Física de Radiação Residual & Correção da Regra dos 7:10</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>O Erro:</strong> A regra 7:10 foi apresentada de maneira imprecisa, sugerindo erroneamente que representava a 'porcentagem de radiação restante no ambiente', o que poderia induzir o leitor a abandonar o abrigo precocemente sob níveis letais de exposição.
              </p>
              <p className="text-xs text-emerald-400 bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded">
                <strong>A Correção:</strong> O Capítulo 24B foi reescrito cientificamente para elucidar que a regra dos 7:10 descreve estritamente a redução da <em>taxa de exposição horária (dose-rate)</em>, e não a descontaminação do ar ou solo. O texto adverte que mesmo uma redução teórica de 99% ainda pode reter níveis acumulados altamente letais se a intensidade original for catastrófica. O livro agora proíbe expressamente a saída do abrigo sem medição física por dosímetro calibrado e sem a liberação formal e expressa das autoridades públicas.
              </p>
            </div>

            {/* FINDING 3 */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className="bg-rose-500/10 text-rose-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Erros Críticos Removidos</span>
                <span className="text-[10px] text-slate-500 font-mono">Ref: Cap. 6 / Apêndice</span>
              </div>
              <h4 className="text-sm font-bold text-slate-200">3. Empréstimo Indevido de Autoridade (Métrica de Água da FEMA)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>O Erro:</strong> Atribuição inadequada à FEMA de uma recomendação estrita de 4 litros por pessoa/dia de água potável. A FEMA recomenda formalmente 1 galão americano por pessoa/dia (aproximadamente 3,8 litros).
              </p>
              <p className="text-xs text-emerald-400 bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded">
                <strong>A Correção:</strong> Corrigimos a citação no manual (Capítulo 6) e no apêndice. O texto agora documenta com exatidão a recomendação original da FEMA (1 galão/3,8L) e detalha que a adoção da métrica de 4 litros por pessoa/dia é uma decisão deliberada e pragmática do Método 5P para estabelecer uma margem preventiva arredondada que facilita a logística de cálculos familiares.
              </p>
            </div>

            {/* FINDING 4 */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className="bg-rose-500/10 text-rose-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Erros Críticos Removidos</span>
                <span className="text-[10px] text-slate-500 font-mono">Ref: Cap. 20 (Casos)</span>
              </div>
              <h4 className="text-sm font-bold text-slate-200">4. Desconexão Geográfica de Estudos de Caso Estrangeiros</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>O Erro:</strong> O uso de exemplos americanos distantes (como a nevasca do Texas de 2021) como estudos de caso prioritários criava uma barreira cognitiva de afastamento prático para os cenários e realidades de infraestrutura de quem vive e se prepara no Brasil.
              </p>
              <p className="text-xs text-emerald-400 bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded">
                <strong>A Correção:</strong> Reestruturamos integralmente o Capítulo 20 para focar em estudos de caso nacionais de altíssimo impacto tático: o Apagão do Amapá (2020), as Enchentes Históricas no Rio Grande do Sul (2024), a Crise Hídrica do Estado de São Paulo (2014-2015) e os Desastres Tecnológicos das barragens de Mariana e Brumadinho, convertendo as falhas logísticas nacionais reais em aprendizados diretos e tangíveis.
              </p>
            </div>

          </div>
        </div>

        {/* Verifiable References & Evidence Section */}
        <div className="space-y-6">
          <div className="border-b border-slate-900 pb-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span>Seção de Referências Técnicas & Evidências Verificáveis</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">
              Para assegurar que o manual não 'invente credibilidade' ou faça uso indevido de nomes, listamos abaixo as fontes científicas, códigos de documentos oficiais e manuais governamentais que dão lastro rigoroso às nossas recomendações.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Reference 1 */}
            <div className="bg-slate-900/10 border border-slate-900 p-4 rounded space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Metrologia de Hidratação</span>
                <h5 className="text-xs font-bold text-slate-200 mt-1">FEMA - Manual "Are You Ready?"</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Documento de código oficial: <strong>FEMA IS-22.a (Citizen Preparedness Guide)</strong>. Define formalmente a recomendação básica de 1 galão (3,8 litros) por pessoa por dia para necessidades biológicas e de higienização de emergência.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-amber-500">
                <span>Ref: IS-22.a Sec. 3</span>
                <span className="flex items-center gap-1">Verificado <CheckCircle2 className="h-3 w-3 text-emerald-500" /></span>
              </div>
            </div>

            {/* Reference 2 */}
            <div className="bg-slate-900/10 border border-slate-900 p-4 rounded space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Isótopos & Radiação</span>
                <h5 className="text-xs font-bold text-slate-200 mt-1">CDC - Potassium Iodide (KI) Fact Sheet</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Diretrizes do <strong>Centers for Disease Control and Prevention (EUA)</strong> de agosto de 2014. Documenta rigorosamente a seletividade imunológica do KI (apenas Iodo-131), contraindicações graves a nefropatas/alérgicos, e o perigo de danos crônicos.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-amber-500">
                <span>Ref: CDC Radiation CS249216</span>
                <span className="flex items-center gap-1">Verificado <CheckCircle2 className="h-3 w-3 text-emerald-500" /></span>
              </div>
            </div>

            {/* Reference 3 */}
            <div className="bg-slate-900/10 border border-slate-900 p-4 rounded space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Decaimento Físico</span>
                <h5 className="text-xs font-bold text-slate-200 mt-1">IAEA - Radiological Emergency Manual</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Agência Internacional de Energia Atômica: <strong>Manual for First Responders (EPR-First Responder 2006)</strong>. Define a formulação matemática empírica da regra de decaimento do Fallout (Regra de potência do expoente aproximado a -1.2, ou Regra dos 7:10).
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-amber-500">
                <span>Ref: IAEA EPR-FR (Appendix A)</span>
                <span className="flex items-center gap-1">Verificado <CheckCircle2 className="h-3 w-3 text-emerald-500" /></span>
              </div>
            </div>

            {/* Reference 4 */}
            <div className="bg-slate-900/10 border border-slate-900 p-4 rounded space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Saneamento de Ingestão</span>
                <h5 className="text-xs font-bold text-slate-200 mt-1">OMS - Guidelines for Drinking-water Quality</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Organização Mundial da Saúde (4ª Edição + Adendo). Prescreve métricas exatas de desinfecção por diluição de hipoclorito de sódio em dosagens de 2 a 3 gotas por litro para inativar cistos patogênicos microscópicos e contaminações bacteriológicas.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-amber-500">
                <span>Ref: WHO-Water QG-4</span>
                <span className="flex items-center gap-1">Verificado <CheckCircle2 className="h-3 w-3 text-emerald-500" /></span>
              </div>
            </div>

            {/* Reference 5 */}
            <div className="bg-slate-900/10 border border-slate-900 p-4 rounded space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Doutrina Civil Nacional</span>
                <h5 className="text-xs font-bold text-slate-200 mt-1">Defesa Civil Nacional - Manual de Proteção</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Ministério da Integração Nacional (Brasil, 2017). Guia técnico de montagem de abrigos, rotas coletivas de evacuação em áreas de alagamento/deslizamento e protocolos de alertas meteorológicos automatizados de resposta.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-amber-500">
                <span>Ref: M_PROTECAO_CIVIL_BR_17</span>
                <span className="flex items-center gap-1">Verificado <CheckCircle2 className="h-3 w-3 text-emerald-500" /></span>
              </div>
            </div>

            {/* Reference 6 */}
            <div className="bg-slate-900/10 border border-slate-900 p-4 rounded space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Triagem Médica Tática</span>
                <h5 className="text-xs font-bold text-slate-200 mt-1">SAMU / Ministério da Saúde - Protocolos</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Manual de Atendimento Pré-Hospitalar (APH) de urgências e emergências traumáticas do Ministério da Saúde. Estabelece a metodologia de controle de hemorragias externas massivas e imobilização preventiva de coluna em campo de desastre.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-amber-500">
                <span>Ref: MS-Manual-APH-APHU-03</span>
                <span className="flex items-center gap-1">Verificado <CheckCircle2 className="h-3 w-3 text-emerald-500" /></span>
              </div>
            </div>

          </div>
        </div>

        {/* Closing Note */}
        <div className="text-center font-mono text-[10px] text-slate-600 pt-6">
          <p>Manual de Sobrevivência 3.0 &bull; Relatório de Auditoria e Retratação Pública &copy; 2026</p>
          <p className="text-rose-500/40 mt-1">"Auditor não vende. Auditor destrói e deixa o que resiste. A verdade técnica protege vidas."</p>
        </div>
      </div>
    </div>
  );
}
