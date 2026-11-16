import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  FlaskConical,
  LockKeyhole,
  MapPin,
} from "lucide-react";

import { AuditAdminActions } from "@/components/audit/audit-admin-actions";
import { AuditTabs } from "@/components/audit/audit-tabs";
import { ExportMenu } from "@/components/audit/export-menu";
import { PrivateAuditGate } from "@/components/auth/private-audit-gate";
import { ModeBanner } from "@/components/layout/mode-banner";
import { Badge } from "@/components/ui/badge";
import { ErrorPanel } from "@/components/ui/error-panel";
import { canAdmin, canWrite, getAuditAccess } from "@/lib/server-api";
import { formatDate, pluralize } from "@/lib/format";

export default async function AuditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isInteger(auditId) || auditId <= 0) notFound();

  const access = await getAuditAccess(auditId);

  if (access.status === "not_found") notFound();
  if (access.status === "login") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <PrivateAuditGate />
      </div>
    );
  }
  if (access.status === "error") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <ErrorPanel title="Audit inaccessible" message={access.message} />
      </div>
    );
  }

  const { audit, user } = access;
  const writer = canWrite(user) && !audit.is_demo;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Tous les audits
      </Link>

      <ModeBanner
        mode={audit.is_demo ? "demo" : "private"}
        user={user}
        className="mt-3 animate-fade-in"
      />

      <header className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white/85 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {audit.is_demo ? (
                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <FlaskConical className="h-3 w-3" />
                  Démonstration publique
                </Badge>
              ) : (
                <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                  <LockKeyhole className="h-3 w-3" />
                  Audit privé GHT
                </Badge>
              )}
              <Badge>{formatDate(audit.updated_at)}</Badge>
            </div>
            <h1 className="mt-3 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {audit.name}
            </h1>
            {audit.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {audit.description}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              {audit.ght_name ? (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                  {audit.ght_name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {pluralize(audit.establishments.length, "établissement")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                Modifié le {formatDate(audit.updated_at)}
              </span>
            </div>
            {audit.establishments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {audit.establishments.map((establishment) => (
                  <span
                    key={establishment}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
                  >
                    {establishment}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {writer ? <AuditAdminActions audit={audit} canDelete={canAdmin(user)} /> : null}
            <ExportMenu auditId={audit.id} />
          </div>
        </div>
        <AuditTabs auditId={audit.id} />
      </header>

      <div className="mt-6">{children}</div>
    </div>
  );
}
