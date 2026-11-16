"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  FlaskConical,
  Info,
  Layers3,
  LoaderCircle,
  Lock,
  Minus,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  CriteriaMethodologyTooltip,
  GlobalScoreMethodologyTooltip,
  LayerScoreMethodologyTooltip,
} from "@/components/methodology/methodology-tooltips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, inputClass, selectClass } from "@/components/ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import { cn, deltaLabel, formatScore } from "@/lib/format";
import { classificationStyle, LAYER_LABELS } from "@/lib/labels";
import type { Application, Layer, SimulationResponse } from "@/lib/types";

interface Scenario {
  alternative_name: string;
  license_model: number;
  jurisdiction: number;
  interoperability: number;
  operational_dependency: number;
}

const DEFAULT_SCENARIO: Scenario = {
  alternative_name: "",
  license_model: 0,
  jurisdiction: 0,
  interoperability: 0,
  operational_dependency: 0,
};

const PRESETS: Record<string, Scenario> = {
  souverain: { ...DEFAULT_SCENARIO },
  editeur_ue: {
    alternative_name: "",
    license_model: 4,
    jurisdiction: 0,
    interoperability: 3,
    operational_dependency: 5,
  },
  saas_us: {
    alternative_name: "",
    license_model: 5,
    jurisdiction: 5,
    interoperability: 5,
    operational_dependency: 5,
  },
};

const CRITERIA_FIELDS = [
  { key: "license_model", label: "C1 · Licence", reversed: false },
  { key: "jurisdiction", label: "C2 · Juridiction", reversed: false },
  { key: "interoperability", label: "C3 · Interopérabilité", reversed: false },
  { key: "operational_dependency", label: "C4 · MCO", reversed: false },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function DeltaBadge({ delta }: { delta: number }) {
  const visible = Math.abs(delta) < 0.005;
  const tone = visible
    ? "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    : delta < 0
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return (
    <Badge className={tone}>
      {visible ? <Minus className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {deltaLabel(delta)}
    </Badge>
  );
}

export function SimulationPanel({
  auditId,
  applications,
}: {
  auditId: number;
  applications: Application[];
}) {
  const [search, setSearch] = useState("");
  const [scenarios, setScenarios] = useState<Record<number, Scenario>>({});
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => Object.keys(scenarios).map(Number), [scenarios]);
  const filtered = useMemo(() => {
    const needle = normalize(search);
    if (!needle) return applications;
    return applications.filter((application) =>
      normalize(
        [application.name, application.establishment, application.editor, application.layer].join(" "),
      ).includes(needle),
    );
  }, [applications, search]);

  function toggle(application: Application) {
    setResult(null);
    setScenarios((current) => {
      const next = { ...current };
      if (next[application.id]) delete next[application.id];
      else next[application.id] = { ...DEFAULT_SCENARIO };
      return next;
    });
  }

  function updateScenario(id: number, key: keyof Scenario, value: string | number) {
    setResult(null);
    setScenarios((current) => ({
      ...current,
      [id]: { ...current[id]!, [key]: value },
    }));
  }

  function applyPreset(preset: keyof typeof PRESETS) {
    setResult(null);
    setScenarios((current) => {
      const next: Record<number, Scenario> = {};
      for (const id of selectedIds) {
        next[id] = { ...PRESETS[preset], alternative_name: current[id]?.alternative_name ?? "" };
      }
      return next;
    });
  }

  function resetAll() {
    setScenarios({});
    setResult(null);
    setError(null);
  }

  async function handleSimulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedIds.length === 0) {
      setError("Sélectionnez au moins une application à remplacer.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<SimulationResponse>(
        `/api/audits/${auditId}/simulate`,
        {
          method: "POST",
          body: {
            swaps: selectedIds.map((id) => {
              const scenario = scenarios[id]!;
              return {
                application_id: id,
                alternative_name: scenario.alternative_name.trim() || null,
                license_model: scenario.license_model,
                jurisdiction: scenario.jurisdiction,
                interoperability: scenario.interoperability,
                operational_dependency: scenario.operational_dependency,
              };
            }),
          },
        },
      );
      setResult(response);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Simulation impossible.");
    } finally {
      setLoading(false);
    }
  }

  const beforeStyle = result ? classificationStyle(result.before.classification.color) : null;
  const afterStyle = result ? classificationStyle(result.after.classification.color) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-2xl border border-sky-500/25 bg-sky-500/5 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
        <p className="text-xs leading-relaxed text-sky-700 dark:text-sky-300">
          Simulation What-If sans persistance : aucune brique, aucun audit et aucun log de
          modification. Seuls C1 à C4 peuvent varier — la criticité métier C5 reste celle du
          référentiel.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                Périmètre de test
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Applications à remplacer
              </h2>
            </div>
            <Badge>{selectedIds.length} sélectionnée{selectedIds.length > 1 ? "s" : ""}</Badge>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une application…"
              className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
              aria-label="Rechercher une application à simuler"
            />
          </div>
          <div className="mt-2 max-h-[26rem] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {filtered.map((application) => {
              const checked = Boolean(scenarios[application.id]);
              return (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => toggle(application)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                    checked
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    aria-label={`Sélectionner ${application.name}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                      {application.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-400">
                      {LAYER_LABELS[application.layer as Layer]} · {application.establishment} · score {formatScore(application.unit_score)}
                    </span>
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-400">Aucune application trouvée.</p>
            ) : null}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
                Hypothèse de migration
              </p>
              <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white">
                Ajuster les critères cibles
                <CriteriaMethodologyTooltip />
              </h2>
            </div>
            <SlidersHorizontal className="h-4 w-4 text-sky-500" />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => applyPreset("souverain")} disabled={selectedIds.length === 0}>
              Souverain UE
            </Button>
            <Button variant="secondary" size="sm" onClick={() => applyPreset("editeur_ue")} disabled={selectedIds.length === 0}>
              Éditeur UE
            </Button>
            <Button variant="secondary" size="sm" onClick={() => applyPreset("saas_us")} disabled={selectedIds.length === 0}>
              SaaS américain
            </Button>
          </div>

          {selectedIds.length === 0 ? (
            <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              <Layers3 className="h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Sélectionnez une application
              </p>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-400">
                Chaque application retenue reçoit les critères C1 à C4 d'une alternative cible.
                Le score After est recalculé par l'API.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSimulate} className="mt-4 space-y-4">
              <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                {selectedIds.map((id) => {
                  const application = applications.find((item) => item.id === id);
                  const scenario = scenarios[id]!;
                  if (!application) return null;
                  return (
                    <div
                      key={id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                            {application.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            C5 = {application.business_criticality} (inchangé) · score actuel {formatScore(application.unit_score)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(application)}
                          className="text-[10px] font-semibold text-slate-400 hover:text-rose-500"
                        >
                          Retirer
                        </button>
                      </div>
                      <div className="mt-2">
                        <label htmlFor={`alt-${id}`} className="sr-only">
                          Nom de l'alternative
                        </label>
                        <input
                          id={`alt-${id}`}
                          value={scenario.alternative_name}
                          onChange={(event) => updateScenario(id, "alternative_name", event.target.value)}
                          placeholder="Alternative envisagée (ex. Orthanc, Nextcloud…)"
                          className={cn(inputClass, "h-8 text-xs")}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {CRITERIA_FIELDS.map((field) => (
                          <div key={field.key}>
                            <label htmlFor={`${field.key}-${id}`} className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              {field.label}
                            </label>
                            <select
                              id={`${field.key}-${id}`}
                              value={scenario[field.key]}
                              onChange={(event) => updateScenario(id, field.key, Number(event.target.value))}
                              className={cn(selectClass, "h-8 text-xs")}
                            >
                              {[0, 1, 2, 3, 4, 5].map((value) => (
                                <option key={value} value={value}>
                                  {value} — {value === 0 ? "Souverain / ouvert" : value === 5 ? "Fermé / critique" : "Intermédiaire"}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <FieldError>{error}</FieldError>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={resetAll} disabled={loading}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Tout réinitialiser
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {loading ? "Calcul…" : "Lancer la simulation"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {result ? (
        <div className="space-y-4 animate-fade-up">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                  {result.persisted ? "Simulation enregistrée" : "Simulation non persistée"}
                </p>
                <h2 className="flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                  Comparaison avant / après
                  <GlobalScoreMethodologyTooltip />
                </h2>
              </div>
              <DeltaBadge delta={result.delta} />
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-2xl border border-slate-200 p-4 text-center dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Référentiel actuel</p>
                <p className="mt-1 font-mono text-4xl font-extrabold text-slate-900 dark:text-white">
                  {formatScore(result.before.global_score)}
                </p>
                <Badge className={cn("mt-2", beforeStyle?.badge)}>{result.before.classification.label}</Badge>
              </div>
              <div className="flex flex-col items-center text-slate-400">
                <ArrowRight className="h-5 w-5" />
                <span className="mt-1 font-mono text-xs font-bold">
                  {result.delta > 0 ? "+" : ""}
                  {result.delta.toFixed(2)} pts
                </span>
              </div>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Scénario simulé</p>
                <p className={cn("mt-1 font-mono text-4xl font-extrabold", afterStyle?.text)}>
                  {formatScore(result.after.global_score)}
                </p>
                <Badge className={cn("mt-2", afterStyle?.badge)}>{result.after.classification.label}</Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                Impact par couche
                <LayerScoreMethodologyTooltip />
              </h3>
              <div className="mt-3 space-y-3">
                {result.before.layers.map((layer) => {
                  const afterLayer = result.after.layers.find((item) => item.key === layer.key);
                  const delta = (afterLayer?.score ?? 0) - (layer.score ?? 0);
                  return (
                    <div key={layer.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {LAYER_LABELS[layer.key as Layer] ?? layer.label}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {formatScore(layer.score)} → {formatScore(afterLayer?.score)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={cn("h-full rounded-full", delta < 0 ? "bg-emerald-500" : delta > 0 ? "bg-rose-500" : "bg-slate-400")}
                            style={{ width: `${Math.min(Math.abs(delta), 100)}%` }}
                          />
                        </div>
                        <span className={cn("w-16 text-right font-mono text-[10px] font-bold", delta < 0 ? "text-emerald-600 dark:text-emerald-400" : delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400")}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                La barre visualise la valeur absolue du delta de couche ; le signe indique le sens.
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Briques modifiées</h3>
              <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {result.changes.map((change) => (
                  <div key={change.application_id ?? change.name} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{change.name}</p>
                      {change.alternative_name ? (
                        <p className="truncate text-[10px] text-slate-400">→ {change.alternative_name}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatScore(change.before_score)} → {formatScore(change.after_score)}
                      </p>
                      <p className={cn("font-mono text-[10px] font-bold", change.delta < 0 ? "text-emerald-600 dark:text-emerald-400" : change.delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400")}>
                        {change.delta > 0 ? "+" : ""}{change.delta.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top 5 après simulation</h3>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {result.after.top_vulnerabilities.map((vulnerability, index) => (
                <div key={`${vulnerability.application_id}-${index}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">#{index + 1} · {vulnerability.layer_label}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-100">{vulnerability.name}</p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">{formatScore(vulnerability.score)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
