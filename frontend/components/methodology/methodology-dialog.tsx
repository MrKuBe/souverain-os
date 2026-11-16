"use client";

import { useState } from "react";
import { BookMarked, ExternalLink, Scale, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/format";
import {
  CRITERION_REFERENCES,
  METHODOLOGY_FORMULAS,
  METHODOLOGY_SOURCES,
  SCORE_THRESHOLDS,
} from "@/lib/methodology";

const thresholdStyles = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  blue: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  orange: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
} as const;

export function MethodologyContent({ version }: { version: string }) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Scale className="h-4 w-4" />
          Une lecture de dépendance, pas une certification
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          SouverainOS construit un indice comparatif à partir d’une cartographie applicative.
          Le score oriente la priorisation des audits, mais ne remplace ni l’analyse
          contractuelle, ni l’analyse juridique, ni la décision de la direction.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Les critères et pré-scorings importés restent des hypothèses à valider par un
          auditeur. La source de vérité du calcul est le service backend
          <span className="font-mono"> scoring.py</span>.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Formule officielle
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Score unitaire
            </p>
            <div className="mt-2 space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-200">
              <p>{METHODOLOGY_FORMULAS.base}</p>
              <p>{METHODOLOGY_FORMULAS.factor}</p>
              <p>{METHODOLOGY_FORMULAS.unit}</p>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Facteurs C5 : 1 → 0,6 · 3 → 0,8 · 5 → 1,0. C1 à C4 sont notés de 0 à 5.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Couches et global
            </p>
            <div className="mt-2 space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-200">
              <p>{METHODOLOGY_FORMULAS.layer}</p>
              <p>{METHODOLOGY_FORMULAS.global}</p>
              <p>{METHODOLOGY_FORMULAS.weights}</p>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Les couches vides sont exclues, puis les poids restants sont renormalisés.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Seuils d’interprétation
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SCORE_THRESHOLDS.map((threshold) => (
            <div
              key={threshold.range}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                thresholdStyles[threshold.color],
              )}
            >
              <span className="font-mono text-xs font-bold">{threshold.range}</span>
              <span className="text-right text-[11px] font-semibold">{threshold.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Les cinq critères et leurs sources
        </h3>
        <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {CRITERION_REFERENCES.map((criterion) => (
            <div key={criterion.code} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-500/25 bg-emerald-500/10 font-mono text-emerald-700 dark:text-emerald-300">
                  {criterion.code}
                </Badge>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {criterion.label}
                </p>
                <span className="text-[10px] text-slate-400">{criterion.scale}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {criterion.question}
              </p>
              <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                Références : {criterion.sources.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Bibliographie et référentiels
        </h3>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Ces sources nourrissent les grilles de lecture ; elles ne constituent pas un label
          de conformité automatique.
        </p>
        <div className="mt-3 space-y-2">
          {METHODOLOGY_SOURCES.map((source) => (
            <div
              key={source.short}
              className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {source.title}
                </p>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {source.publisher}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                {source.usage}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Périmètre et imports
        </p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <li>
            Mercator : le besoin de disponibilité <span className="font-mono">security_need_a</span>{" "}
            est converti en C5 : 1 → 1, 2 → 3, 3/4 → 5.
          </li>
          <li>
            Les briques importées sont marquées « À valider ». Le pré-scoring est heuristique
            et doit être revu par un auditeur.
          </li>
          <li>
            Un import ne supprime jamais une brique existante. Les doublons sont normalisés
            par nom et par couche, puis ignorés.
          </li>
          <li>
            La démonstration publique est en lecture seule ; seuls les audits réels suivent
            le RBAC et sont journalisés.
          </li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <ExternalLink className="h-3 w-3" />
          SouverainOS v{version} · Formule et mapping documentés dans AGENTS.md
        </p>
      </section>
    </div>
  );
}

export function MethodologyTrigger({
  compact = false,
  version,
}: {
  compact?: boolean;
  version: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={compact ? "Méthodologie et sources" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
          compact && "h-9 w-9 justify-center px-0",
        )}
      >
        <BookMarked className="h-4 w-4" aria-hidden="true" />
        <span className={compact ? "sr-only" : undefined}>Méthodologie &amp; Sources</span>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Méthodologie & Sources"
        description={`Formule officielle SouverainOS v${version}, critères C1–C5 et référentiels utilisés.`}
        size="xl"
      >
        <MethodologyContent version={version} />
      </Dialog>
    </>
  );
}
