import { ShieldCheck } from "lucide-react";

import { GlobalScoreMethodologyTooltip } from "@/components/methodology/methodology-tooltips";
import { Badge } from "@/components/ui/badge";
import { classificationStyle } from "@/lib/labels";
import { cn, formatScore } from "@/lib/format";
import type { Classification } from "@/lib/types";

export function ScoreGauge({
  score,
  classification,
  evaluated,
  applicationCount,
}: {
  score: number;
  classification: Classification;
  evaluated: boolean;
  applicationCount: number;
}) {
  const color = classificationStyle(classification.color);
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const arc = evaluated ? (Math.min(Math.max(score, 0), 100) / 100) * circumference : 0;

  return (
    <div className="flex h-full flex-col items-center justify-between p-5">
      <div className="flex w-full items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Score global
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Dépendance numérique
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <GlobalScoreMethodologyTooltip />
          <ShieldCheck className={cn("h-5 w-5", color.text)} />
        </div>
      </div>

      <div className="relative my-2 h-48 w-48">
        <svg viewBox="0 0 180 180" className="h-48 w-48 -rotate-90" aria-hidden="true">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-slate-200 dark:text-slate-800"
          />
          {evaluated ? (
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={color.stroke}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${circumference}`}
              className="transition-[stroke-dasharray] duration-700"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {evaluated ? formatScore(score) : "—"}
          </span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            sur 100
          </span>
        </div>
      </div>

      <div className="w-full text-center">
        <Badge className={cn("max-w-full whitespace-normal text-center", color.badge)}>
          {evaluated ? classification.label : "Non évalué"}
        </Badge>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {applicationCount > 0
            ? `Calculé sur ${applicationCount} brique${applicationCount > 1 ? "s" : ""}`
            : "Ajoutez des briques pour évaluer le GHT"}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-1">
          {[
            { max: "≤ 25", className: "bg-emerald-500" },
            { max: "≤ 50", className: "bg-sky-500" },
            { max: "≤ 75", className: "bg-amber-500" },
            { max: "> 75", className: "bg-rose-500" },
          ].map((threshold) => (
            <div key={threshold.max} className="space-y-1">
              <div className={cn("h-1.5 rounded-full", threshold.className)} />
              <p className="font-mono text-[9px] text-slate-400">{threshold.max}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
