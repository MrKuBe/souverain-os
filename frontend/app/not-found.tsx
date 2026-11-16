import { ShieldCheck } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
        Erreur 404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Page introuvable</h1>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Cette ressource n'existe pas ou n'est plus accessible avec votre session.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Revenir aux audits
      </a>
    </div>
  );
}
