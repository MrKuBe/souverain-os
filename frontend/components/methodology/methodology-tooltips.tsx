"use client";

import { MethodologyTooltip } from "@/components/ui/methodology-tooltip";
import {
  CRITERION_REFERENCES,
  METHODOLOGY_FORMULAS,
  SCORE_THRESHOLDS,
} from "@/lib/methodology";

export function CriteriaMethodologyTooltip({ className }: { className?: string }) {
  return (
    <MethodologyTooltip
      title="Critères C1 → C5"
      label="Afficher la définition des critères C1 à C5"
      className={className}
    >
      <ul className="space-y-1.5">
        {CRITERION_REFERENCES.map((criterion) => (
          <li key={criterion.code}>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
              {criterion.code}
            </span>{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {criterion.label}
            </span>{" "}
            <span className="text-slate-400">({criterion.scale})</span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {criterion.sources.join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-200 pt-2 text-[10px] text-slate-400 dark:border-slate-700">
        C5 est un coefficient de criticité (facteurs 0,6 / 0,8 / 1,0), pas un critère de
        dépendance supplémentaire.
      </p>
    </MethodologyTooltip>
  );
}

export function UnitScoreMethodologyTooltip({ className }: { className?: string }) {
  return (
    <MethodologyTooltip
      title="Score unitaire d'une brique"
      label="Afficher la formule du score unitaire"
      className={className}
    >
      <p className="font-mono text-[10px] text-slate-700 dark:text-slate-200">
        {METHODOLOGY_FORMULAS.base}
      </p>
      <p className="font-mono text-[10px] text-slate-700 dark:text-slate-200">
        {METHODOLOGY_FORMULAS.factor}
      </p>
      <p className="font-mono text-[10px] text-slate-700 dark:text-slate-200">
        {METHODOLOGY_FORMULAS.unit}
      </p>
      <p className="text-[10px] text-slate-400">
        Une brique vitale (C5 = 5) conserve son score ; une brique peu critique (C5 = 1) est
        atténuée de 40 %.
      </p>
    </MethodologyTooltip>
  );
}

export function LayerScoreMethodologyTooltip({ className }: { className?: string }) {
  return (
    <MethodologyTooltip
      title="Score d'une couche"
      label="Afficher la formule du score de couche"
      className={className}
    >
      <p className="font-mono text-[10px] text-slate-700 dark:text-slate-200">
        {METHODOLOGY_FORMULAS.layer}
      </p>
      <p>
        Chaque score unitaire est pondéré par la criticité métier C5 de la brique. Une couche
        vide n’est pas évaluée.
      </p>
      <p className="text-[10px] text-slate-400">
        Sources de lecture : MaturiN-H, ANAP et ANS pour la structuration en trois couches.
      </p>
    </MethodologyTooltip>
  );
}

export function GlobalScoreMethodologyTooltip({ className }: { className?: string }) {
  return (
    <MethodologyTooltip
      title="Score global du GHT"
      label="Afficher la formule du score global"
      className={className}
    >
      <p className="font-mono text-[10px] text-slate-700 dark:text-slate-200">
        {METHODOLOGY_FORMULAS.global}
      </p>
      <p className="font-mono text-[10px] text-slate-700 dark:text-slate-200">
        {METHODOLOGY_FORMULAS.weights}
      </p>
      <p>
        Les poids des couches vides sont retirés puis les poids restants sont renormalisés. Un
        audit sans brique reste « Non évalué ».
      </p>
      <div className="space-y-0.5 border-t border-slate-200 pt-2 dark:border-slate-700">
        {SCORE_THRESHOLDS.map((threshold) => (
          <p key={threshold.range} className="text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
              {threshold.range}
            </span>{" "}
            {threshold.label}
          </p>
        ))}
      </div>
    </MethodologyTooltip>
  );
}
