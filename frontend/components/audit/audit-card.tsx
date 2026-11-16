import Link from "next/link";
import { ArrowUpRight, Boxes, Building2, CalendarDays, FlaskConical, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { classificationStyle } from "@/lib/labels";
import { cn, formatDate, formatScore, pluralize } from "@/lib/format";
import type { AuditListItem } from "@/lib/types";

function MiniScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circumference;
  const stroke = classificationStyle(color).stroke;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-slate-900 dark:text-white">
        {formatScore(score)}
      </span>
    </div>
  );
}

export function AuditCard({ audit }: { audit: AuditListItem }) {
  const style = classificationStyle(audit.classification_color);

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-colors hover:border-emerald-500/40">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {audit.is_demo ? (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <FlaskConical className="h-3 w-3" />
                Démonstration
              </Badge>
            ) : (
              <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                <LockKeyhole className="h-3 w-3" />
                Audit privé
              </Badge>
            )}
            <Badge className={style.badge}>
              {audit.evaluated ? audit.classification : "Non évalué"}
            </Badge>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
            {audit.name}
          </h2>
          {audit.ght_name ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              {audit.ght_name}
            </p>
          ) : null}
        </div>
        <MiniScoreRing score={audit.global_score} color={audit.classification_color} />
      </div>

      <p className="line-clamp-2 min-h-10 px-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {audit.description || "Aucune description renseignée."}
      </p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-5 py-3.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5" />
            {pluralize(audit.application_count, "brique")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(audit.updated_at)}
          </span>
        </div>
        <Link
          href={`/audits/${audit.id}`}
          className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "text-emerald-700 dark:text-emerald-300")}
        >
          Ouvrir
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
