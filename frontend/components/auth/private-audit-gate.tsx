import { LockKeyhole } from "lucide-react";

import { LoginTrigger } from "@/components/auth/login-trigger";

export function PrivateAuditGate() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-cyan-600 dark:text-cyan-300">
        <LockKeyhole className="h-8 w-8" />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
        Audit privé GHT
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Accès authentifié requis
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Cette cartographie contient des données réelles et n'est accessible qu'aux comptes
        autorisés du groupement hospitalier. La session est vérifiée côté serveur.
      </p>
      <LoginTrigger className="mt-6" label="Se connecter pour continuer" />
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Les tentatives d'accès et les actions autorisées sont journalisées.
      </p>
    </div>
  );
}
