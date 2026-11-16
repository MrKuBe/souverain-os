import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/format";

export const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:disabled:bg-slate-900";

export const textareaClass = cn(inputClass, "h-auto min-h-24 resize-y py-2.5");

export const selectClass = cn(inputClass, "appearance-none pr-9");

export const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

export const helpClass = "mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400";

export function FieldError({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{children}</p>;
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-4 w-4 animate-spin", className)} aria-hidden="true" />;
}
