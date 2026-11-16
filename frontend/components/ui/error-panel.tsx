import { AlertTriangle, RefreshCcw } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";

export function ErrorPanel({
  title = "Une erreur est survenue",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-amber-500/30 bg-amber-500/5 px-8 py-12 text-center">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-300">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {message}
      </p>
      <a href="" className={buttonStyles({ variant: "secondary", className: "mt-6" })}>
        <RefreshCcw className="h-4 w-4" />
        Réessayer
      </a>
    </div>
  );
}
