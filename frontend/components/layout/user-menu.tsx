"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { ApiError, apiRequest } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/labels";
import { cn, initials } from "@/lib/format";
import type { User } from "@/lib/types";

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status !== 401) {
        setError(cause.message);
      }
    } finally {
      setLoading(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/70 py-1.5 pl-1.5 pr-3 sm:flex dark:border-slate-800 dark:bg-slate-900/70">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-[11px] font-bold text-white">
          {initials(user.full_name, user.username)}
        </span>
        <span className="min-w-0">
          <span className="block max-w-36 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
            {user.full_name || user.username}
          </span>
          <span className="block max-w-36 truncate text-[10px] text-slate-500 dark:text-slate-400">
            {ROLE_LABELS[user.role]}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        title={error ?? "Se déconnecter"}
        aria-label="Se déconnecter"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-rose-800 dark:hover:text-rose-400",
        )}
      >
        <LogOut className={cn("h-4 w-4", loading && "animate-pulse")} />
      </button>
    </div>
  );
}
