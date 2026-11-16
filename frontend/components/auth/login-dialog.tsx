"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, inputClass, labelClass } from "@/components/ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/format";
import type { User } from "@/lib/types";

type AuthMode = "local" | "ldap";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
}

export function LoginDialog({ open, onClose, onSuccess }: LoginDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("local");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Renseignez votre identifiant et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: { username: username.trim(), password },
      });
      setPassword("");
      onClose();
      onSuccess?.(result.user);
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 503) {
          setError("L'annuaire d'authentification est indisponible. Réessayez ou contactez l'administrateur.");
        } else if (cause.status === 401) {
          setError("Identifiants invalides. Vérifiez votre compte local ou vos identifiants d'annuaire.");
        } else {
          setError(cause.message);
        }
      } else {
        setError("Connexion impossible. Vérifiez que l'API SouverainOS est joignable.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connexion au SIH"
      description="Authentifiez-vous pour consulter les audits réels et modifier les cartographies autorisées."
      size="sm"
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950/70">
        <button
          type="button"
          onClick={() => {
            setMode("local");
            setError(null);
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            mode === "local"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <KeyRound className="h-4 w-4" />
          Compte local
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("ldap");
            setError(null);
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            mode === "ldap"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <Building2 className="h-4 w-4" />
          Annuaire LDAP
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-username" className={labelClass}>
            Identifiant
          </label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
            placeholder={mode === "ldap" ? "prenom.nom" : "admin"}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="login-password" className={labelClass}>
            Mot de passe
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="••••••••••••"
          />
        </div>

        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
          {mode === "local"
            ? "Le serveur applique la priorité au compte local. Aucun repli LDAP n'est effectué pour un identifiant local existant."
            : "Identifiants de l'annuaire SIH (Active Directory, OpenLDAP ou FreeIPA). Le mode effectif reste contrôlé par AUTH_MODE côté serveur."}
        </p>

        <FieldError>{error}</FieldError>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LockKeyhole className="h-4 w-4" />
          )}
          {loading ? "Connexion en cours…" : "Ouvrir la session sécurisée"}
        </Button>
      </form>

      <div className="mt-5 flex items-start gap-2 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>
          Session par cookie HttpOnly SameSite=Lax. Chaque écriture est protégée par un jeton
          anti-CSRF et journalisée. Aucun mot de passe n'est stocké dans le navigateur.
        </span>
      </div>
    </Dialog>
  );
}
