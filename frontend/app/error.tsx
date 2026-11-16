"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-500">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
        Une erreur inattendue est survenue
      </h1>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        L'interface n'a pas pu afficher cette page. Aucune donnée n'a été modifiée.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <RefreshCcw className="h-4 w-4" />
        Réessayer
      </button>
    </div>
  );
}
