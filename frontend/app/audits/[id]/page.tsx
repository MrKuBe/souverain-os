import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  Cloud,
  ListChecks,
  Radar,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { CriteriaRadar } from "@/components/dashboard/criteria-radar";
import { LayerRadar } from "@/components/dashboard/layer-radar";
import { LayerScoreCards } from "@/components/dashboard/layer-score-cards";
import { ScoreGauge } from "@/components/dashboard/score-gauge";
import { TopVulnerabilities } from "@/components/dashboard/top-vulnerabilities";
import {
  CriteriaMethodologyTooltip,
  GlobalScoreMethodologyTooltip,
  LayerScoreMethodologyTooltip,
} from "@/components/methodology/methodology-tooltips";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorPanel } from "@/components/ui/error-panel";
import { buttonStyles } from "@/components/ui/button";
import { canWrite, getAuditAccess, getDashboard } from "@/lib/server-api";
import { formatPercent, formatScore, pluralize } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = "emerald",
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ReactNode;
  tone?: "emerald" | "cyan" | "amber" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>
    </Card>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default async function AuditDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auditId = Number(id);
  const access = await getAuditAccess(auditId);
  if (access.status !== "ok") return null;

  let dashboard: Dashboard;
  try {
    dashboard = await getDashboard(auditId);
  } catch {
    return (
      <ErrorPanel
        title="Tableau de bord indisponible"
        message="Le calcul du score n'a pas pu être chargé. Vérifiez l'état de l'API et réessayez."
      />
    );
  }

  const { score } = dashboard;
  const writer = canWrite(access.user);
  const establishmentEntries = Object.entries(dashboard.establishment_counts).sort(
    (a, b) => b[1] - a[1],
  );
  const pending = dashboard.status_counts.a_valider ?? 0;
  const validated = dashboard.status_counts.valide ?? 0;
  const externalRatio =
    dashboard.total_applications > 0 ? dashboard.external_count / dashboard.total_applications : 0;

  if (dashboard.total_applications === 0) {
    return (
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative mx-auto max-w-xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
            <Boxes className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Cet audit ne contient encore aucune brique
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Ajoutez manuellement vos applications, importez Mercator, un CSV ou un JSON pour
            déclencher le calcul du score global. Un audit vide reste « Non évalué ».
          </p>
          <Link href={`/audits/${auditId}/cartographie`} className={`${buttonStyles()} mt-6`}>
            {writer ? "Ouvrir la cartographie" : "Consulter la cartographie"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <SectionHeader
          eyebrow="Vue synthétique"
          title="Indicateurs de dépendance"
          action={
            <Link
              href={`/audits/${auditId}/cartographie`}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Cartographie détaillée
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Briques"
            value={dashboard.total_applications}
            detail={pluralize(establishmentEntries.length, "établissement")}
            icon={<Boxes className="h-4 w-4" />}
          />
          <KpiCard
            label="Score global"
            value={score.evaluated ? formatScore(score.global_score) : "—"}
            detail={score.evaluated ? score.classification.label : "Non évalué"}
            icon={<ShieldCheck className="h-4 w-4" />}
            tone="cyan"
          />
          <KpiCard
            label="À valider"
            value={pending}
            detail={`${validated} brique${validated > 1 ? "s" : ""} validée${validated > 1 ? "s" : ""}`}
            icon={<ListChecks className="h-4 w-4" />}
            tone="amber"
          />
          <KpiCard
            label="Externes"
            value={formatPercent(externalRatio)}
            detail={`${dashboard.external_count} application${dashboard.external_count > 1 ? "s" : ""} hors GHT`}
            icon={<Cloud className="h-4 w-4" />}
            tone="violet"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <ScoreGauge
            score={score.global_score}
            classification={score.classification}
            evaluated={score.evaluated}
            applicationCount={score.application_count}
          />
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                C1 → C5
              </p>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                Profil des critères
                <CriteriaMethodologyTooltip />
              </h2>
            </div>
            <Radar className="h-4 w-4 text-emerald-500" />
          </div>
          <CriteriaRadar axes={score.axes} />
          <p className="text-[10px] leading-relaxed text-slate-400">
            Moyenne normalisée de chaque critère sur 100. L'axe Criticité traduit l'intensité
            métier du portefeuille, pas un risque de dépendance isolé.
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
                Infrastructure · Supports · Métier
              </p>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                Équilibre des couches
                <LayerScoreMethodologyTooltip />
              </h2>
            </div>
            <Boxes className="h-4 w-4 text-sky-500" />
          </div>
          <LayerRadar layers={score.layers} />
          <p className="text-[10px] leading-relaxed text-slate-400">
            Score moyen pondéré par la criticité métier de chaque brique de la couche.
          </p>
        </Card>
      </section>

      <section>
        <SectionHeader
          eyebrow="Pondération officielle"
          title="Scores par couche"
          action={<LayerScoreMethodologyTooltip />}
        />
        <LayerScoreCards layers={score.layers} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <Card className="min-w-0 p-5">
          <SectionHeader
            eyebrow="Priorisation"
            title="Top 5 des vulnérabilités"
            action={
              <Badge className="border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-3 w-3" />
                Risque décroissant
              </Badge>
            }
          />
          <TopVulnerabilities auditId={auditId} vulnerabilities={score.top_vulnerabilities} />
        </Card>

        <Card className="min-w-0 p-5">
          <SectionHeader eyebrow="Périmètre" title="Établissements" />
          {establishmentEntries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucun établissement renseigné.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {establishmentEntries.map(([establishment, count]) => {
                const ratio = count / Math.max(dashboard.total_applications, 1);
                return (
                  <li key={establishment}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {establishment}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{count}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Building2 className="h-3.5 w-3.5 text-emerald-500" />
              Nature du périmètre
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              {access.audit.is_demo
                ? "Jeu fictif de démonstration, aucune donnée réelle de patient ou d'établissement."
                : "Audit réel interne au GHT. Les données ne quittent pas l'infrastructure hospitalière."}
            </p>
          </div>

          <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
            <GlobalScoreMethodologyTooltip className="h-4 w-4" />
            Score global : moyenne des couches non vides, pondérée 25 / 30 / 45 puis
            renormalisée.
          </div>
        </Card>
      </section>
    </div>
  );
}
