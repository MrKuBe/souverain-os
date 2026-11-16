import type { BrickSource, BrickStatus, ClassificationColor, Layer, Role } from "./types";

export const LAYER_ORDER: Layer[] = ["infrastructure", "supports", "metier"];

export const LAYER_LABELS: Record<Layer, string> = {
  infrastructure: "Infrastructure",
  supports: "Supports",
  metier: "Métier",
};

export const LAYER_FULL_LABELS: Record<Layer, string> = {
  infrastructure: "Infrastructure & Middleware",
  supports: "Logiciels Supports & Transverses",
  metier: "Logiciels Métier Hospitaliers",
};

export const LAYER_DESCRIPTIONS: Record<Layer, string> = {
  infrastructure: "Serveurs, stockage, réseaux, bases de données et socles techniques.",
  supports: "Messagerie, collaboration, bureautique, ITSM et outils transverses.",
  metier: "Applications de soins, DPI, PACS, laboratoire et processus hospitaliers.",
};

export const STATUS_LABELS: Record<BrickStatus, string> = {
  a_valider: "À valider",
  valide: "Validé",
};

export const SOURCE_LABELS: Record<BrickSource, string> = {
  manuel: "Saisie manuelle",
  mercator: "Mercator",
  csv: "CSV",
  json: "JSON",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin_ght: "Administrateur GHT",
  auditeur: "Auditeur",
  lecteur_direction: "Lecteur direction",
};

export const CRITERIA_LABELS = {
  license_model: "Licence & code",
  jurisdiction: "Juridiction & gouvernance",
  interoperability: "Interopérabilité & réversibilité",
  operational_dependency: "Dépendance opérationnelle & MCO",
  business_criticality: "Criticité métier",
} as const;

export const CRITERIA_SHORT_LABELS = {
  license_model: "Licence",
  jurisdiction: "Juridiction",
  interoperability: "Interopérabilité",
  operational_dependency: "MCO",
  business_criticality: "Criticité",
} as const;

export const CLASSIFICATION_STYLES: Record<
  ClassificationColor,
  { badge: string; text: string; stroke: string; soft: string }
> = {
  green: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
    stroke: "#10b981",
    soft: "bg-emerald-500",
  },
  blue: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    text: "text-sky-600 dark:text-sky-400",
    stroke: "#0ea5e9",
    soft: "bg-sky-500",
  },
  orange: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
    stroke: "#f59e0b",
    soft: "bg-amber-500",
  },
  red: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-400",
    stroke: "#f43f5e",
    soft: "bg-rose-500",
  },
  gray: {
    badge: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
    text: "text-slate-500 dark:text-slate-400",
    stroke: "#94a3b8",
    soft: "bg-slate-400",
  },
};

export const LAYER_STYLES: Record<Layer, string> = {
  infrastructure:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  supports: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  metier:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function classificationStyle(color: string) {
  return CLASSIFICATION_STYLES[(color as ClassificationColor) ?? "gray"] ?? CLASSIFICATION_STYLES.gray;
}
