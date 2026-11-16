import { Building2, Globe2, LockKeyhole, ShieldCheck } from "lucide-react";

import { LoginTrigger } from "@/components/auth/login-trigger";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import type { User } from "@/lib/types";

type Mode = "demo" | "private" | "public" | "authenticated";

interface ModeBannerProps {
  mode: Mode;
  user?: User | null;
  className?: string;
}

const styles: Record<Mode, { wrapper: string; icon: string; badge: string }> = {
  demo: {
    wrapper: "border-amber-500/30 bg-amber-500/[0.07]",
    icon: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  private: {
    wrapper: "border-cyan-500/30 bg-cyan-500/[0.07]",
    icon: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  public: {
    wrapper: "border-slate-300/70 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50",
    icon: "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
    badge: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  authenticated: {
    wrapper: "border-emerald-500/30 bg-emerald-500/[0.06]",
    icon: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

export function ModeBanner({ mode, user, className }: ModeBannerProps) {
  const style = styles[mode];
  const content = {
    demo: {
      icon: <Building2 className="h-4 w-4" />,
      badge: "Mode Démonstration",
      title: "Jeu de démonstration public",
      text: "Données fictives du GHT Grand Lac — strictement en lecture seule, y compris pour un administrateur.",
    },
    private: {
      icon: <LockKeyhole className="h-4 w-4" />,
      badge: "Audit Privé GHT",
      title: "Données réelles du groupement",
      text: user
        ? `Session ${ROLE_LABELS[user.role]} — accès authentifié, écritures contrôlées et journalisées.`
        : "Accès authentifié requis. Toutes les actions sont journalisées.",
    },
    public: {
      icon: <Globe2 className="h-4 w-4" />,
      badge: "Espace public",
      title: "Démonstration ouverte",
      text: "Les jeux de démonstration sont consultables sans compte. Connectez-vous pour ouvrir les audits privés du GHT.",
    },
    authenticated: {
      icon: <ShieldCheck className="h-4 w-4" />,
      badge: "Espace authentifié",
      title: user ? `${user.full_name || user.username}` : "Session active",
      text: user
        ? `${ROLE_LABELS[user.role]} — vous pouvez consulter les audits autorisés par votre rôle.`
        : "Session SIH active.",
    },
  }[mode];

  return (
    <div className={cn("rounded-2xl border px-4 py-3", style.wrapper, className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", style.icon)}>
            {content.icon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={style.badge}>{content.badge}</Badge>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{content.title}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{content.text}</p>
          </div>
        </div>
        {!user && (mode === "public" || mode === "demo") ? (
          <LoginTrigger
            label="Connexion SIH"
            variant="secondary"
            size="sm"
            className="shrink-0 self-start sm:self-center"
          />
        ) : null}
      </div>
    </div>
  );
}
