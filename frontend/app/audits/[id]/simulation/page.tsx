import Link from "next/link";
import { Boxes, SlidersHorizontal } from "lucide-react";

import { SimulationPanel } from "@/components/simulation/simulation-panel";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorPanel } from "@/components/ui/error-panel";
import { getApplications, getAuditAccess } from "@/lib/server-api";
import type { Application } from "@/lib/types";

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auditId = Number(id);
  const access = await getAuditAccess(auditId);
  if (access.status !== "ok") return null;

  let applications: Application[];
  try {
    applications = await getApplications(auditId);
  } catch {
    return (
      <ErrorPanel
        title="Simulation indisponible"
        message="Les briques de l'audit n'ont pas pu être chargées pour construire le scénario."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
            What-If · sans persistance
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            <SlidersHorizontal className="h-5 w-5 text-sky-500" />
            Simulateur de trajectoire souveraine
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Remplacez une ou plusieurs briques par une alternative cible et mesurez l'impact sur
            le score global, les couches et le Top 5. Rien n'est enregistré.
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/10 text-sky-500">
            <Boxes className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Aucune brique à simuler
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            La simulation a besoin d'un référentiel applicatif. Ajoutez ou importez des briques
            dans la cartographie pour construire un scénario de migration.
          </p>
          <Link href={`/audits/${auditId}/cartographie`} className={`${buttonStyles()} mt-5`}>
            Ouvrir la cartographie
          </Link>
        </Card>
      ) : (
        <SimulationPanel auditId={auditId} applications={applications} />
      )}
    </div>
  );
}
