"use client";

import { useRef, useState } from "react";
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";

import { ApiError, downloadFromApi } from "@/lib/api";
import { cn } from "@/lib/format";

interface ExportMenuProps {
  auditId: number;
}

const formats = [
  { key: "json", label: "Rapport JSON", icon: FileJson, filename: "souverainos-rapport.json" },
  { key: "markdown", label: "Rapport Markdown", icon: FileText, filename: "souverainos-rapport.md" },
  { key: "csv", label: "Cartographie CSV", icon: FileSpreadsheet, filename: "souverainos-cartographie.csv" },
] as const;

export function ExportMenu({ auditId }: ExportMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: (typeof formats)[number]) {
    setLoading(format.key);
    setError(null);
    try {
      await downloadFromApi(`/api/audits/${auditId}/export/${format.key}`, format.filename);
      if (detailsRef.current) detailsRef.current.open = false;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Export impossible.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
        <Download className="h-4 w-4" />
        Exporter
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/15 dark:border-slate-700 dark:bg-slate-900">
        {formats.map((format) => (
          <button
            key={format.key}
            type="button"
            onClick={() => download(format)}
            disabled={loading !== null}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {loading === format.key ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-emerald-500" />
            ) : (
              <format.icon className="h-4 w-4 text-slate-400" />
            )}
            {format.label}
          </button>
        ))}
        {error ? (
          <p className={cn("px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400")}>{error}</p>
        ) : null}
        <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Les exports sont générés par l'API et journalisés.
        </p>
      </div>
    </details>
  );
}
