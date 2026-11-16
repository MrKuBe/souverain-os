import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Building2,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { AdminLogs } from "@/components/admin/admin-logs";
import { AdminUsers } from "@/components/admin/admin-users";
import { LoginTrigger } from "@/components/auth/login-trigger";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorPanel } from "@/components/ui/error-panel";
import { getAdminUsers, getAuditLogs, getCurrentUser } from "@/lib/server-api";
import type { AuditLogPage, User } from "@/lib/types";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-violet-500">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
          Administration protégée
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Connectez-vous avec un compte <strong>admin_ght</strong> pour gérer les utilisateurs et
          consulter le journal d'audit.
        </p>
        <LoginTrigger className="mt-5" label="Se connecter" />
      </div>
    );
  }

  if (user.role !== "admin_ght") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-500">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Accès refusé</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Votre rôle <strong>{user.role}</strong> ne permet pas l'administration des comptes ni la
          lecture du journal. Cette tentative est contrôlée par l'API et journalisée.
        </p>
        <Link href="/" className="mt-5 text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          Retour aux audits
        </Link>
      </div>
    );
  }

  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
  const action = (Array.isArray(query.action) ? query.action[0] : query.action)?.trim() || undefined;
  const username = (Array.isArray(query.username) ? query.username[0] : query.username)?.trim() || undefined;
  const limit = 50;
  const offset = (page - 1) * limit;

  let users: User[] | null = null;
  let logs: AuditLogPage | null = null;
  let loadError: string | null = null;

  try {
    [users, logs] = await Promise.all([
      getAdminUsers(),
      getAuditLogs({ limit, offset, action, username }),
    ]);
  } catch {
    loadError =
      "Les données d'administration n'ont pas pu être chargées. Vérifiez l'API et vos droits admin_ght.";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux audits
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-white to-white p-5 shadow-sm dark:via-slate-900 dark:to-slate-900 sm:p-6">
        <div>
          <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <ShieldCheck className="h-3 w-3" />
            Administration GHT
          </Badge>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Gouvernance des comptes et traçabilité
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Gérez les comptes locaux et les rôles RBAC, contrôlez les accès et consultez toutes les
            actions sensibles réalisées dans SouverainOS.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-950/50">
          <p className="font-bold text-slate-800 dark:text-slate-100">{user.full_name || user.username}</p>
          <p className="mt-0.5 flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <KeyRound className="h-3 w-3" />
            admin_ght · session journalisée
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="mt-5">
          <ErrorPanel title="Administration indisponible" message={loadError} />
        </div>
      ) : users && logs ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Comptes", value: users.length, detail: "tous rôles", icon: Users, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
              { label: "Actifs", value: users.filter((item) => item.is_active).length, detail: "connexion autorisée", icon: UserCheck, tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
              { label: "Locaux", value: users.filter((item) => item.auth_source === "local").length, detail: "Argon2", icon: KeyRound, tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
              { label: "Événements", value: logs.total, detail: "journal d'audit", icon: Activity, tone: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
            ].map((stat) => (
              <Card key={stat.label} className="p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{stat.label}</p>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${stat.tone}`}>
                    <stat.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{stat.detail}</p>
              </Card>
            ))}
          </div>

          <AdminUsers users={users} currentUserId={user.id} />
          <AdminLogs logs={logs} action={action} username={username} />
        </div>
      ) : null}
    </div>
  );
}
