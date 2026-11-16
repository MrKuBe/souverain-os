import Link from "next/link";
import { BookOpen, ShieldCheck } from "lucide-react";

import { LoginTrigger } from "@/components/auth/login-trigger";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MethodologyTrigger } from "@/components/methodology/methodology-dialog";
import { UserMenu } from "@/components/layout/user-menu";
import { apiDocsUrl } from "@/lib/api";
import { APP_VERSION } from "@/lib/version";
import type { User } from "@/lib/types";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              Audits
            </Link>
            <a
              href={apiDocsUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <BookOpen className="h-4 w-4" />
              API
            </a>
            <MethodologyTrigger version={APP_VERSION} />
            {user?.role === "admin_ght" ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-500/10 dark:text-violet-300"
              >
                <ShieldCheck className="h-4 w-4" />
                Administration
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin_ght" ? (
            <Link
              href="/admin"
              aria-label="Administration"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-violet-600 transition-colors hover:bg-violet-500/10 md:hidden dark:text-violet-300"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>
          ) : null}
          <div className="md:hidden">
            <MethodologyTrigger compact version={APP_VERSION} />
          </div>
          <ThemeToggle />
          {user ? <UserMenu user={user} /> : <LoginTrigger size="sm" label="Connexion SIH" />}
        </div>
      </div>
    </header>
  );
}
