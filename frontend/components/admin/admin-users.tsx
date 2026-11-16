"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  LoaderCircle,
  Pencil,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, helpClass, inputClass, labelClass, selectClass } from "@/components/ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import { cn, formatDate, formatDateTime, initials, pluralize } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role, User } from "@/lib/types";

const ROLES: Role[] = ["admin_ght", "auditeur", "lecteur_direction"];

export function AdminUsers({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("lecteur_direction");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr");
    if (!needle) return users;
    return users.filter((user) =>
      [user.username, user.full_name, user.email, ROLE_LABELS[user.role]]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(needle),
    );
  }, [search, users]);

  function openCreate() {
    setEditing(null);
    setUsername("");
    setFullName("");
    setEmail("");
    setRole("lecteur_direction");
    setPassword("");
    setIsActive(true);
    setError(null);
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setUsername(user.username);
    setFullName(user.full_name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role);
    setPassword("");
    setIsActive(user.is_active);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!editing && !/^[A-Za-z0-9._@-]{3,100}$/.test(username.trim())) {
      setError("Identifiant invalide : 3 à 100 caractères (lettres, chiffres, . _ @ -).");
      return;
    }
    if (!editing && password.length < 12) {
      setError("Le mot de passe initial doit contenir au moins 12 caractères.");
      return;
    }
    if (editing && password && password.length < 12) {
      setError("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await apiRequest<User>(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          body: {
            full_name: fullName.trim() || null,
            email: email.trim() || null,
            role,
            is_active: isActive,
            ...(password ? { password } : {}),
          },
        });
      } else {
        await apiRequest<User>("/api/admin/users", {
          method: "POST",
          body: {
            username: username.trim(),
            full_name: fullName.trim() || null,
            email: email.trim() || null,
            role,
            password,
          },
        });
      }
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: User) {
    setTogglingId(user.id);
    setActionError(null);
    try {
      await apiRequest<User>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: { is_active: !user.is_active },
      });
      router.refresh();
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "Mise à jour impossible.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
            Comptes & rôles
          </p>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-emerald-500" />
            Utilisateurs SouverainOS
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {pluralize(users.length, "compte")} · {users.filter((user) => user.is_active).length} actif
            {users.filter((user) => user.is_active).length > 1 ? "s" : ""} · Aucune suppression
            physique, désactivation uniquement.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <UserPlus className="h-3.5 w-3.5" />
          Créer un compte
        </Button>
      </div>

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un identifiant, nom, rôle…"
          className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
          aria-label="Rechercher un utilisateur"
        />
      </div>

      {actionError ? <FieldError>{actionError}</FieldError> : null}

      <div className="mt-3 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[760px] border-separate border-spacing-y-1 text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-3 py-1.5">Compte</th>
              <th className="px-3 py-1.5">Rôle</th>
              <th className="px-3 py-1.5">Source</th>
              <th className="px-3 py-1.5">Dernière connexion</th>
              <th className="px-3 py-1.5">État</th>
              <th className="px-3 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="rounded-xl bg-slate-50/70 text-xs dark:bg-slate-950/40">
                <td className="rounded-l-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-[10px] font-bold text-white">
                      {initials(user.full_name, user.username)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800 dark:text-slate-100">
                        {user.username}
                        {user.id === currentUserId ? (
                          <span className="ml-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">(vous)</span>
                        ) : null}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {user.full_name || user.email || "Nom non renseigné"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    className={
                      user.role === "admin_ght"
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                        : user.role === "auditeur"
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {user.auth_source === "local" ? "Local (Argon2)" : "Annuaire LDAP"}
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : "Jamais"}
                  <span className="block text-[10px] text-slate-400">Créé le {formatDate(user.created_at)}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      user.is_active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                    )}
                  >
                    {user.is_active ? <Power className="h-2.5 w-2.5" /> : <PowerOff className="h-2.5 w-2.5" />}
                    {user.is_active ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="rounded-r-xl px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(user)}>
                      <Pencil className="h-3 w-3" />
                      Modifier
                    </Button>
                    {user.id !== currentUserId ? (
                      <Button
                        variant={user.is_active ? "ghost" : "outline"}
                        size="sm"
                        onClick={() => void toggleActive(user)}
                        disabled={togglingId === user.id}
                        title={user.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                      >
                        {togglingId === user.id ? (
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                        ) : user.is_active ? (
                          <PowerOff className="h-3 w-3" />
                        ) : (
                          <Power className="h-3 w-3" />
                        )}
                        {user.is_active ? "Désactiver" : "Réactiver"}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucun utilisateur ne correspond à la recherche.</p>
        ) : null}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Modifier ${editing.username}` : "Créer un compte local"}
        description={
          editing
            ? "Le rôle et l'état sont appliqués immédiatement. Les changements sont journalisés."
            : "Le compte local utilise Argon2. Le mot de passe n'est jamais affiché ni journalisé."
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing ? (
            <div>
              <label htmlFor="admin-username" className={labelClass}>
                Identifiant *
              </label>
              <input
                id="admin-username"
                className={inputClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="prenom.nom"
                autoComplete="off"
                autoFocus
              />
              <p className={helpClass}>Lettres, chiffres, point, tiret, underscore ou arobase.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              Identifiant <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{editing.username}</span> ·
              Source {editing.auth_source === "local" ? " locale" : " LDAP"}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="admin-fullname" className={labelClass}>
                Nom complet
              </label>
              <input
                id="admin-fullname"
                className={inputClass}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <label htmlFor="admin-email" className={labelClass}>
                Courriel
              </label>
              <input
                id="admin-email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom.nom@ght.example.fr"
              />
            </div>
            <div>
              <label htmlFor="admin-role" className={labelClass}>
                Rôle
              </label>
              <select
                id="admin-role"
                className={selectClass}
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            {!editing || editing.auth_source === "local" ? (
              <div>
                <label htmlFor="admin-password" className={labelClass}>
                  {editing ? "Nouveau mot de passe" : "Mot de passe initial *"}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={editing ? "Laisser vide pour conserver" : "12 caractères minimum"}
                  autoComplete="new-password"
                />
              </div>
            ) : null}
          </div>
          {editing ? (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Compte actif
            </label>
          ) : null}
          <FieldError>{error}</FieldError>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editing ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {editing ? "Enregistrer" : "Créer le compte"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
