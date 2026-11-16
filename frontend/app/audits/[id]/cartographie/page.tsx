import { BrickManager } from "@/components/cartography/brick-manager";
import { ErrorPanel } from "@/components/ui/error-panel";
import { canWrite, getApplications, getAuditAccess } from "@/lib/server-api";
import type { Application } from "@/lib/types";

export default async function CartographyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const auditId = Number(id);
  const access = await getAuditAccess(auditId);
  if (access.status !== "ok") return null;

  let applications: Application[];
  try {
    applications = await getApplications(auditId);
  } catch {
    return (
      <ErrorPanel
        title="Cartographie indisponible"
        message="La liste des briques n'a pas pu être chargée depuis l'API."
      />
    );
  }

  const establishmentSet = new Set(access.audit.establishments);
  for (const application of applications) {
    if (application.establishment) establishmentSet.add(application.establishment);
  }

  const rawFocus = Array.isArray(query.brick) ? query.brick[0] : query.brick;
  const parsedFocus = rawFocus ? Number(rawFocus) : Number.NaN;

  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
          Couches 1 · 2 · 3
        </p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Cartographie applicative et critères
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Filtrez les briques, vérifiez les cinq critères et validez les éléments importés. Toute
          modification est journalisée et recalcule le score côté API.
        </p>
      </div>
      <BrickManager
        auditId={auditId}
        applications={applications}
        establishments={Array.from(establishmentSet)}
        canWrite={canWrite(access.user) && !access.audit.is_demo}
        isDemo={access.audit.is_demo}
        initialFocusId={Number.isInteger(parsedFocus) ? parsedFocus : null}
      />
    </div>
  );
}
