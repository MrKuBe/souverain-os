"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  HeartPulse,
  MapPin,
  Monitor,
  Pencil,
  Plus,
  Search,
  Server,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";

import { BrickFormDialog } from "@/components/cartography/brick-form-dialog";
import { ImportDialog } from "@/components/cartography/import-dialog";
import {
  CriteriaMethodologyTooltip,
  UnitScoreMethodologyTooltip,
} from "@/components/methodology/methodology-tooltips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatScore, pluralize } from "@/lib/format";
import {
  LAYER_LABELS,
  LAYER_STYLES,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type { Application, BrickStatus, Layer } from "@/lib/types";

interface BrickManagerProps {
  auditId: number;
  applications: Application[];
  establishments: string[];
  canWrite: boolean;
  isDemo: boolean;
  initialFocusId: number | null;
}

const layerIcons = {
  infrastructure: Server,
  supports: Monitor,
  metier: HeartPulse,
} satisfies Record<Layer, typeof Server>;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function criterionTone(value: number): string {
  if (value >= 5) return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  if (value >= 4) return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (value <= 1) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function scoreTone(score: number): string {
  if (score > 75) return "text-rose-600 dark:text-rose-400";
  if (score > 50) return "text-amber-600 dark:text-amber-400";
  if (score > 25) return "text-sky-600 dark:text-sky-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function BrickManager({
  auditId,
  applications,
  establishments,
  canWrite,
  isDemo,
  initialFocusId,
}: BrickManagerProps) {
  const [search, setSearch] = useState("");
  const [layer, setLayer] = useState<"all" | Layer>("all");
  const [status, setStatus] = useState<"all" | BrickStatus>("all");
  const [establishment, setEstablishment] = useState("all");
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!initialFocusId) return;
    const focusTimer = window.setTimeout(() => {
      document
        .getElementById(`brick-${initialFocusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(initialFocusId);
    }, 250);
    const clearTimer = window.setTimeout(() => setHighlightId(null), 4500);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(clearTimer);
    };
  }, [initialFocusId]);

  const counts = useMemo(
    () => ({
      all: applications.length,
      a_valider: applications.filter((brick) => brick.status === "a_valider").length,
      valide: applications.filter((brick) => brick.status === "valide").length,
    }),
    [applications],
  );

  const layerCounts = useMemo(
    () => ({
      all: applications.length,
      infrastructure: applications.filter((brick) => brick.layer === "infrastructure").length,
      supports: applications.filter((brick) => brick.layer === "supports").length,
      metier: applications.filter((brick) => brick.layer === "metier").length,
    }),
    [applications],
  );

  const filtered = useMemo(() => {
    const needle = normalize(search);
    return applications.filter((brick) => {
      if (layer !== "all" && brick.layer !== layer) return false;
      if (status !== "all" && brick.status !== status) return false;
      if (establishment !== "all" && brick.establishment !== establishment) return false;
      if (!needle) return true;
      return normalize(
        [
          brick.name,
          brick.editor,
          brick.technology,
          brick.responsible,
          brick.establishment,
          brick.app_type,
        ].join(" "),
      ).includes(needle);
    });
  }, [applications, establishment, layer, search, status]);

  const hasFilters = search !== "" || layer !== "all" || status !== "all" || establishment !== "all";

  function clearFilters() {
    setSearch("");
    setLayer("all");
    setStatus("all");
    setEstablishment("all");
  }

  return (
    <div className="space-y-4">
      {isDemo || !canWrite ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            {isDemo
              ? "Audit de démonstration en lecture seule : les briques, imports et validations sont désactivés pour tous les rôles."
              : "Votre rôle autorise la consultation de la cartographie mais pas sa modification."}
          </p>
        </div>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              Référentiel applicatif
              <CriteriaMethodologyTooltip />
            </p>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {pluralize(applications.length, "brique")} cartographiée{applications.length > 1 ? "s" : ""}
            </h2>
          </div>
          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                Importer
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une brique
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Toutes", counts.all],
              ["a_valider", "À valider", counts.a_valider],
              ["valide", "Validées", counts.valide],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                status === value
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {label}
              <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {count}
              </span>
            </button>
          ))}
          <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-800" />
          {(
            [
              ["all", "Toutes les couches", counts.all],
              ["infrastructure", "Infrastructure", layerCounts.infrastructure],
              ["supports", "Supports", layerCounts.supports],
              ["metier", "Métier", layerCounts.metier],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLayer(value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                layer === value
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {label}
              <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un nom, éditeur, technologie, responsable…"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              aria-label="Rechercher dans la cartographie"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="sm:w-56">
            <select
              value={establishment}
              onChange={(event) => setEstablishment(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
              aria-label="Filtrer par établissement"
            >
              <option value="all">Tous les établissements</option>
              {establishments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          ) : null}
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""} sur {applications.length}
        </p>
      </Card>

      {applications.length === 0 ? (
        <EmptyState
          title="Cartographie vide"
          description={
            canWrite
              ? "Ajoutez une première brique ou importez votre référentiel Mercator, CSV ou JSON."
              : "Aucune brique n'a encore été saisie pour cet audit."
          }
          icon={<Server className="h-6 w-6" />}
          action={
            canWrite ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Importer
                </Button>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une brique
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          description="Aucune brique ne correspond aux filtres actifs. Élargissez la recherche ou réinitialisez les filtres."
          icon={<Search className="h-6 w-6" />}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((brick) => {
            const LayerIcon = layerIcons[brick.layer] ?? Server;
            const chips = [
              { label: "C1", value: brick.license_model, title: "Licence & code" },
              { label: "C2", value: brick.jurisdiction, title: "Juridiction & gouvernance" },
              { label: "C3", value: brick.interoperability, title: "Interopérabilité & réversibilité" },
              { label: "C4", value: brick.operational_dependency, title: "Dépendance opérationnelle & MCO" },
              { label: "C5", value: brick.business_criticality, title: "Criticité métier" },
            ];
            return (
              <Card
                key={brick.id}
                id={`brick-${brick.id}`}
                className={cn(
                  "p-4 transition-all scroll-mt-24",
                  highlightId === brick.id
                    ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950"
                    : "",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={LAYER_STYLES[brick.layer]}>
                        <LayerIcon className="h-3 w-3" />
                        {LAYER_LABELS[brick.layer]}
                      </Badge>
                      <Badge
                        className={
                          brick.status === "valide"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {STATUS_LABELS[brick.status]}
                      </Badge>
                      {brick.external ? (
                        <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          <ExternalLink className="h-3 w-3" />
                          Externe
                        </Badge>
                      ) : null}
                      <span className="text-[10px] text-slate-400">{SOURCE_LABELS[brick.source]}</span>
                      {brick.mercator_id ? (
                        <span className="font-mono text-[10px] text-slate-400">#{brick.mercator_id}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                      {brick.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {[brick.editor, brick.technology, brick.app_type].filter(Boolean).join(" · ") ||
                        "Éditeur et technologie non renseignés"}
                    </p>
                    {brick.description ? (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {brick.description}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={() => setEstablishment(brick.establishment)}
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium transition-colors hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                        title="Filtrer sur cet établissement"
                      >
                        <MapPin className="h-3 w-3" />
                        {brick.establishment || "Établissement non précisé"}
                      </button>
                      {brick.responsible ? <span>Resp. {brick.responsible}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/60">
                      <p className="flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Score unitaire
                        <UnitScoreMethodologyTooltip />
                      </p>
                      <p className={cn("font-mono text-xl font-bold", scoreTone(brick.unit_score ?? 0))}>
                        {formatScore(brick.unit_score)}
                      </p>
                    </div>
                    {canWrite ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditing(brick);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {chips.map((chip) => (
                    <span
                      key={chip.label}
                      title={`${chip.title} : ${chip.value}/5`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                        criterionTone(chip.value),
                      )}
                    >
                      <span className="font-sans font-semibold opacity-70">{chip.label}</span>
                      {chip.value}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <BrickFormDialog
          key={editing?.id ?? "new"}
          auditId={auditId}
          brick={editing}
          establishments={establishments}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      ) : null}

      {importOpen ? (
        <ImportDialog
          auditId={auditId}
          establishments={establishments}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
    </div>
  );
}
