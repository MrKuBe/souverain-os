import Link from "next/link";
import { ArrowUpRight, Flame, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatScore } from "@/lib/format";
import { LAYER_STYLES } from "@/lib/labels";
import type { Layer, Vulnerability } from "@/lib/types";

function riskTone(score: number): string {
  if (score > 75) return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  if (score > 50) return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (score > 25) return "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

export function TopVulnerabilities({
  auditId,
  vulnerabilities,
}: {
  auditId: number;
  vulnerabilities: Vulnerability[];
}) {
  if (vulnerabilities.length === 0) {
    return (
      <EmptyState
        title="Aucune vulnérabilité calculée"
        description="Le Top 5 apparaîtra dès que l'audit contiendra des briques évaluées."
        icon={<ShieldAlert className="h-6 w-6" />}
      />
    );
  }

  return (
    <ol className="divide-y divide-slate-100 dark:divide-slate-800">
      {vulnerabilities.map((vulnerability, index) => (
        <li key={`${vulnerability.application_id}-${index}`}>
          <Link
            href={
              vulnerability.application_id
                ? `/audits/${auditId}/cartographie?brick=${vulnerability.application_id}`
                : `/audits/${auditId}/cartographie`
            }
            className="group flex items-center gap-3 px-1 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold",
                index === 0 ? riskTone(vulnerability.score) : "border-slate-200 text-slate-400 dark:border-slate-700",
              )}
            >
              {index === 0 ? <Flame className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {vulnerability.name}
                </p>
                {vulnerability.layer ? (
                  <Badge className={LAYER_STYLES[vulnerability.layer as Layer] ?? ""}>
                    {vulnerability.layer_label}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                {vulnerability.establishment || "Établissement non précisé"} · Risque principal :{" "}
                {vulnerability.primary_risk.label} ({vulnerability.primary_risk.value}/5)
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("font-mono text-lg font-bold", riskTone(vulnerability.score))}>
                {formatScore(vulnerability.score)}
              </p>
              <p className="text-[9px] uppercase tracking-wide text-slate-400">C5 = {vulnerability.business_criticality}</p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
