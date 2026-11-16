import Link from "next/link";
import {
  ArrowDownRight,
  Boxes,
  FlaskConical,
  Gauge,
  Layers3,
  LockKeyhole,
  Radar,
  ShieldCheck,
} from "lucide-react";

import { AuditCard } from "@/components/audit/audit-card";
import { CreateAuditButton } from "@/components/audit/create-audit-button";
import { LoginTrigger } from "@/components/auth/login-trigger";
import { ModeBanner } from "@/components/layout/mode-banner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { buttonStyles } from "@/components/ui/button";
import { canWrite, getAudits, getCurrentUser } from "@/lib/server-api";
import { formatPercent, pluralize } from "@/lib/format";
import type { AuditListItem } from "@/lib/types";

export default async function HomePage() {
  const user = await getCurrentUser();
  let audits: AuditListItem[] | null = null;
  let loadError: string | null = null;

  try {
    audits = await getAudits();
  } catch {
    loadError =
      "Le tableau de bord ne peut pas joindre l'API SouverainOS. Vérifiez que le backend et PostgreSQL sont démarrés.";
  }

  const demoAudits = audits?.filter((audit) => audit.is_demo) ?? [];
  const privateAudits = audits?.filter((audit) => !audit.is_demo) ?? [];
  const totalBricks = audits?.reduce((sum, audit) => sum + audit.application_count, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">
      <ModeBanner mode={user ? "authenticated" : "public"} user={user} className="animate-fade-in" />

      <section className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/80 px-6 py-10 shadow-sm sm:px-10 sm:py-12 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Souveraineté numérique hospitalière
            </div>
            <h1 className="mt-5 max-w-3xl text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
              Mesurez, priorisez et pilotez la dépendance numérique de votre GHT.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              SouverainOS agrège la cartographie applicative, applique la formule officielle de
              score et met en évidence les vulnérabilités de licence, juridiction,
              interopérabilité et maintien en condition opérationnelle.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {demoAudits[0] ? (
                <Link
                  href={`/audits/${demoAudits[0].id}`}
                  className={buttonStyles({ size: "lg" })}
                >
                  <FlaskConical className="h-4 w-4" />
                  Explorer la démonstration
                </Link>
              ) : null}
              {canWrite(user) ? <CreateAuditButton /> : null}
              {!user ? <LoginTrigger variant="secondary" size="lg" /> : null}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Audits accessibles", value: audits?.length ?? 0, icon: Gauge },
                { label: "Briques cartographiées", value: totalBricks, icon: Boxes },
                { label: "Couches pondérées", value: 3, icon: Layers3 },
                { label: "Critères de score", value: 5, icon: Radar },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <stat.icon className="h-4 w-4 text-emerald-500" />
                  <p className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Card className="overflow-hidden border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-950/20 dark:border-slate-700">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                  Modèle de score officiel
                </p>
                <p className="mt-1 text-sm text-slate-300">Pondération des couches du GHT</p>
              </div>
              <div className="space-y-4 px-5 py-5">
                {[
                  { label: "Métier hospitalier", weight: 0.45, note: "DPI, PACS, laboratoire" },
                  { label: "Supports & transverses", weight: 0.3, note: "Messagerie, GED, ITSM" },
                  { label: "Infrastructure", weight: 0.25, note: "Réseau, serveurs, données" },
                ].map((layer) => (
                  <div key={layer.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-100">{layer.label}</span>
                      <span className="font-mono font-bold text-emerald-300">{formatPercent(layer.weight)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${layer.weight * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{layer.note}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-[11px] text-slate-400">
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-300" />
                Score global de 0 à 100, calculé exclusivement par l'API.
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Jeux de démonstration
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Découvrir le référentiel public
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Données fictives, consultation libre et lecture seule.
          </p>
        </div>
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <LockKeyhole className="h-3 w-3" />
          Lecture seule
        </Badge>
      </div>

      {loadError ? (
        <div className="mt-6">
          <ErrorPanel title="API indisponible" message={loadError} />
        </div>
      ) : demoAudits.length > 0 ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {demoAudits.map((audit) => (
            <AuditCard key={audit.id} audit={audit} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          title="Aucun jeu de démonstration"
          description="Le jeu de démonstration n'est pas encore chargé. Vérifiez SEED_ON_STARTUP et SEED_DEMO_DATA."
          icon={<FlaskConical className="h-6 w-6" />}
        />
      )}

      <div className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              Audits du groupement
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Cartographies privées
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {user
                ? `Visibles selon votre rôle : ${user.full_name || user.username}.`
                : "Authentifiez-vous pour accéder aux audits réels du GHT."}
            </p>
          </div>
          {canWrite(user) ? <CreateAuditButton /> : null}
        </div>

        {!user ? (
          <EmptyState
            className="mt-5"
            title="Accès privé protégé"
            description="Les audits réels ne sont jamais exposés publiquement. Ouvrez une session locale ou LDAP pour les consulter."
            icon={<LockKeyhole className="h-6 w-6" />}
            action={<LoginTrigger />}
          />
        ) : privateAudits.length > 0 ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {privateAudits.map((audit) => (
              <AuditCard key={audit.id} audit={audit} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            title="Aucun audit privé"
            description={
              canWrite(user)
                ? "Créez le premier audit réel du groupement pour démarrer la cartographie."
                : "Aucun audit réel ne vous est encore accessible. Contactez un administrateur GHT."
            }
            icon={<Boxes className="h-6 w-6" />}
            action={canWrite(user) ? <CreateAuditButton /> : undefined}
          />
        )}
      </div>

      <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
        {pluralize(totalBricks, "brique")} agrégée{totalBricks > 1 ? "s" : ""} dans {pluralize(audits?.length ?? 0, "audit")}. Aucun score n'est recalculé dans le navigateur.
      </p>
    </div>
  );
}
