"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/format";

const tabs = [
  {
    href: "",
    label: "Synthèse",
    description: "Score et vulnérabilités",
    icon: LayoutDashboard,
  },
  {
    href: "/cartographie",
    label: "Cartographie",
    description: "Briques et critères",
    icon: List,
  },
  {
    href: "/simulation",
    label: "Simulation",
    description: "Trajectoire What-If",
    icon: SlidersHorizontal,
  },
];

export function AuditTabs({ auditId }: { auditId: number }) {
  const pathname = usePathname();
  const base = `/audits/${auditId}`;

  return (
    <nav
      aria-label="Sections de l'audit"
      className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-1.5 shadow-sm scrollbar-thin dark:border-slate-800 dark:bg-slate-900/70"
    >
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href || "synthese"}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-w-40 flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-colors",
              active
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{tab.label}</span>
              <span
                className={cn(
                  "block truncate text-[10px]",
                  active ? "text-emerald-100" : "text-slate-400 dark:text-slate-500",
                )}
              >
                {tab.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
