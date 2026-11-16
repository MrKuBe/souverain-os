import { Code2, Scale, ShieldCheck } from "lucide-react";

import { apiDocsUrl } from "@/lib/api";
import { APP_VERSION } from "@/lib/version";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              SouverainOS — Audit de Dépendance Numérique des SIH
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              SouverainOS v{APP_VERSION} — Conçu par{" "}
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                Bertrand Kuzbinski
              </strong>{" "}
              (Vibecoding — Full-Stack Open Source)
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              GPL-3.0-or-later · Auto-hébergé · Sans télémétrie ni cloud tiers.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <a href={apiDocsUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400">
            <Code2 className="h-3.5 w-3.5" />
            Documentation API
          </a>
          <span className="inline-flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            Logiciel libre
          </span>
        </div>
      </div>
    </footer>
  );
}
