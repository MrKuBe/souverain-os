import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  Filter,
  LogIn,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UserCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { formatDateTime, pluralize } from "@/lib/format";
import type { AuditLogPage } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  application_create: "Création de brique",
  application_delete: "Suppression de brique",
  application_update: "Modification de brique",
  audit_create: "Création d'audit",
  audit_delete: "Suppression d'audit",
  audit_update: "Modification d'audit",
  export: "Export de rapport",
  import_failed: "Import échoué",
  import_file: "Import CSV / JSON",
  import_mercator: "Import Mercator",
  login: "Connexion",
  login_failed: "Échec de connexion",
  logout: "Déconnexion",
  mercator_config_create: "Création config Mercator",
  mercator_config_delete: "Suppression config Mercator",
  user_create: "Création d'utilisateur",
  user_update: "Modification d'utilisateur",
};

function actionTone(action: string): string {
  if (action.includes("delete") || action.includes("failed")) {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (action.startsWith("user") || action.startsWith("mercator")) {
    return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  if (action.startsWith("import") || action.startsWith("export")) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function detailSummary(detail: Record<string, unknown> | null): string {
  if (!detail) return "—";
  const parts = Object.entries(detail)
    .slice(0, 4)
    .map(([key, value]) => {
      const rendered =
        typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : Array.isArray(value)
              ? value.join(", ")
              : JSON.stringify(value);
      return `${key}=${rendered}`;
    });
  return parts.join(" · ");
}

function pageHref(params: {
  page: number;
  action?: string;
  username?: string;
}): string {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.action) query.set("action", params.action);
  if (params.username) query.set("username", params.username);
  return `/admin?${query.toString()}`;
}

export function AdminLogs({
  logs,
  action,
  username,
}: {
  logs: AuditLogPage;
  action?: string;
  username?: string;
}) {
  const page = Math.floor(logs.offset / logs.limit) + 1;
  const pageCount = Math.max(1, Math.ceil(logs.total / logs.limit));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">
            Traçabilité
          </p>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            <FileClock className="h-4 w-4 text-cyan-500" />
            Journal d'audit
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {pluralize(logs.total, "événement")} · page {page} sur {pageCount} · aucun secret
            n'est journalisé.
          </p>
        </div>
        <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
          <ShieldAlert className="h-3 w-3" />
          admin_ght uniquement
        </Badge>
      </div>

      <form method="get" action="/admin" className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="username"
            defaultValue={username}
            aria-label="Filtrer par identifiant"
            placeholder="Filtrer par identifiant…"
            className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
          />
        </div>
        <div className="relative sm:w-64">
          <input
            name="action"
            defaultValue={action}
            list="audit-actions"
            aria-label="Filtrer par action"
            placeholder="Action (ex. export)"
            className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
          />
          <datalist id="audit-actions">
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </datalist>
        </div>
        <button type="submit" className={buttonStyles({ variant: "secondary", size: "md" })}>
          <Filter className="h-4 w-4" />
          Filtrer
        </button>
        {action || username ? (
          <Link href="/admin" className={buttonStyles({ variant: "ghost", size: "md" })}>
            Effacer
          </Link>
        ) : null}
      </form>

      <div className="mt-3 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px] border-separate border-spacing-y-1 text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-3 py-1.5">Horodatage</th>
              <th className="px-3 py-1.5">Utilisateur</th>
              <th className="px-3 py-1.5">Action</th>
              <th className="px-3 py-1.5">Cible</th>
              <th className="px-3 py-1.5">Détail</th>
              <th className="px-3 py-1.5">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.map((entry) => (
              <tr key={entry.id} className="bg-slate-50/70 text-[11px] dark:bg-slate-950/40">
                <td className="rounded-l-xl px-3 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {formatDateTime(entry.created_at)}
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{entry.username}</span>
                  {entry.user_id === null ? (
                    <span className="ml-1 text-[9px] text-slate-400">anonyme</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Badge className={actionTone(entry.action)}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                  {entry.target_type ? `${entry.target_type}${entry.target_id ? ` #${entry.target_id}` : ""}` : "—"}
                </td>
                <td className="max-w-[22rem] truncate px-3 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400" title={detailSummary(entry.detail)}>
                  {detailSummary(entry.detail)}
                </td>
                <td className="rounded-r-xl px-3 py-2 font-mono text-[10px] text-slate-400">
                  {entry.ip_address ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucun événement pour ces filtres.</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {logs.offset + 1}–{Math.min(logs.offset + logs.limit, logs.total)} sur {logs.total}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageHref({ page: page - 1, action, username })}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Précédent
            </Link>
          ) : (
            <span className={buttonStyles({ variant: "secondary", size: "sm", className: "pointer-events-none opacity-40" })}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Précédent
            </span>
          )}
          {page < pageCount ? (
            <Link
              href={pageHref({ page: page + 1, action, username })}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className={buttonStyles({ variant: "secondary", size: "sm", className: "pointer-events-none opacity-40" })}>
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1"><LogIn className="h-3 w-3" /> Connexions et échecs</span>
        <span className="inline-flex items-center gap-1"><Upload className="h-3 w-3" /> Imports</span>
        <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> Exports</span>
        <span className="inline-flex items-center gap-1"><UserCog className="h-3 w-3" /> Administration</span>
        <span className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Suppressions</span>
      </div>
    </Card>
  );
}
