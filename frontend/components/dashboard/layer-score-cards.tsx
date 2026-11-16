import { HeartPulse, Monitor, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatPercent, formatScore } from "@/lib/format";
import { classificationStyle, LAYER_FULL_LABELS, LAYER_LABELS } from "@/lib/labels";
import type { Layer, LayerScore } from "@/lib/types";

const icons = {
  infrastructure: Server,
  supports: Monitor,
  metier: HeartPulse,
} satisfies Record<Layer, typeof Server>;

const accents = {
  infrastructure: "from-violet-500/20 to-violet-500/0 text-violet-500",
  supports: "from-sky-500/20 to-sky-500/0 text-sky-500",
  metier: "from-emerald-500/20 to-emerald-500/0 text-emerald-500",
} satisfies Record<Layer, string>;

export function LayerScoreCards({ layers }: { layers: LayerScore[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {layers.map((layer) => {
        const key = layer.key as Layer;
        const Icon = icons[key] ?? Server;
        const color = classificationStyle(layer.classification?.color ?? "gray");
        const weighted = layer.score ?? 0;

        return (
          <Card key={layer.key} className="relative overflow-hidden p-5">
            <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", accents[key])} />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Couche {key === "infrastructure" ? "1" : key === "supports" ? "2" : "3"}
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {layer.label || LAYER_LABELS[key]}
                    </h3>
                  </div>
                </div>
                <Badge>{layer.count} brique{layer.count > 1 ? "s" : ""}</Badge>
              </div>

              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {LAYER_FULL_LABELS[key]}
              </p>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {layer.score === null ? "—" : formatScore(layer.score)}
                    <span className="ml-1 text-xs font-semibold text-slate-400">/100</span>
                  </p>
                  <p className={cn("mt-1 text-xs font-semibold", color.text)}>
                    {layer.classification?.label ?? "Non évalué"}
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500 dark:text-slate-400">
                  <p>Poids officiel</p>
                  <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                    {formatPercent(layer.weight)}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", color.soft)}
                  style={{ width: `${layer.score === null ? 0 : Math.min(Math.max(weighted, 0), 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Poids effectif renormalisé : {formatPercent(layer.effective_weight)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
