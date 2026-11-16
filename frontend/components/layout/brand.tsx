import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-950/25 ring-1 ring-white/20">
        <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
          SouverainOS
        </span>
        {compact ? null : (
          <span className="block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Audit de Dépendance Numérique des SIH
          </span>
        )}
      </span>
    </Link>
  );
}
