"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCcw,
  Server,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, helpClass, inputClass, labelClass, selectClass } from "@/components/ui/form";
import { ApiError, apiRequest, downloadFromApi } from "@/lib/api";
import { cn, pluralize } from "@/lib/format";
import { LAYER_LABELS } from "@/lib/labels";
import type { ImportReport, Layer, MercatorConfig } from "@/lib/types";

type Tab = "file" | "mercator";
type AuthMode = "token" | "password";

interface ImportDialogProps {
  auditId: number;
  establishments: string[];
  onClose: () => void;
}

function ImportSummary({ report }: { report: ImportReport }) {
  const layerEntries = (["infrastructure", "supports", "metier"] as Layer[]).map((layer) => ({
    layer,
    count: report.by_layer[layer] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Import terminé</p>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
            {pluralize(report.imported, "brique")} intégrée{report.imported > 1 ? "s" : ""} au
            référentiel {report.source === "mercator" ? "depuis Mercator" : `depuis ${report.source.toUpperCase()}`}.
            Les briques existantes n'ont pas été modifiées.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Reçues", value: report.total_received },
          { label: "Importées", value: report.imported, tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "Doublons", value: report.duplicates, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Invalides", value: report.invalid, tone: "text-rose-600 dark:text-rose-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className={cn("mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white", stat.tone)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Répartition par couche</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {layerEntries.map((entry) => (
            <div key={entry.layer}>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{LAYER_LABELS[entry.layer]}</p>
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{entry.count}</p>
            </div>
          ))}
        </div>
      </div>

      {report.errors.length > 0 ? (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {pluralize(report.errors.length, "ligne refusée")}
          </p>
          <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-[11px] text-rose-700/80 scrollbar-thin dark:text-rose-300/80">
            {report.errors.map((error, index) => (
              <li key={`${error.row}-${index}`}>
                Ligne {error.row} : {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Avertissements ({report.warnings.length})
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-amber-700/80 scrollbar-thin dark:text-amber-300/80">
            {report.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[10px] leading-relaxed text-slate-400">
        Les briques importées restent « À valider » jusqu'à revue des cinq critères par un
        auditeur. Le score a été recalculé par l'API.
      </p>
    </div>
  );
}

export function ImportDialog({ auditId, establishments, onClose }: ImportDialogProps) {
  const router = useRouter();
  const datalistId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("file");
  const [defaultEstablishment, setDefaultEstablishment] = useState(
    establishments[0] ?? "Établissement support",
  );
  const [importFormat, setImportFormat] = useState<"auto" | "csv" | "json">("auto");
  const [file, setFile] = useState<File | null>(null);
  const [configs, setConfigs] = useState<MercatorConfig[]>([]);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("token");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyTls, setVerifyTls] = useState(true);
  const [saveConfig, setSaveConfig] = useState(false);
  const [configName, setConfigName] = useState("");
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function refreshConfigs() {
    try {
      const items = await apiRequest<MercatorConfig[]>("/api/import/mercator/configs");
      setConfigs(items);
      setConfigsError(null);
    } catch (cause) {
      setConfigsError(
        cause instanceof ApiError ? cause.message : "Configurations Mercator indisponibles.",
      );
    }
  }

  useEffect(() => {
    void refreshConfigs();
  }, []);

  function resetReport() {
    setReport(null);
    setError(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function downloadTemplate() {
    setTemplateLoading(true);
    setError(null);
    try {
      await downloadFromApi("/api/import/template.csv", "souverainos-gabarit-import.csv");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Gabarit indisponible.");
    } finally {
      setTemplateLoading(false);
    }
  }

  async function handleFileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Sélectionnez un fichier CSV ou JSON.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("audit_id", String(auditId));
      form.append("default_establishment", defaultEstablishment);
      form.append("format", importFormat);
      form.append("file", file);
      const result = await apiRequest<ImportReport>("/api/import/file", {
        method: "POST",
        body: form,
      });
      setReport(result);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Import du fichier impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMercatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {
      audit_id: auditId,
      default_establishment: defaultEstablishment,
    };
    if (selectedConfigId) {
      payload.config_id = Number(selectedConfigId);
    } else {
      if (!baseUrl.trim()) {
        setError("L'URL de base Mercator est obligatoire.");
        return;
      }
      if (authMode === "password" && (!username.trim() || !secret)) {
        setError("Identifiant et mot de passe Mercator obligatoires.");
        return;
      }
      if (authMode === "token" && !secret) {
        setError("Le jeton Bearer Mercator est obligatoire.");
        return;
      }
      payload.base_url = baseUrl.trim();
      payload.auth_mode = authMode;
      payload.username = authMode === "password" ? username.trim() : null;
      payload.token = authMode === "token" ? secret : null;
      payload.password = authMode === "password" ? secret : null;
      payload.verify_tls = verifyTls;
      payload.save_config = saveConfig;
      if (saveConfig) payload.config_name = configName.trim() || undefined;
    }
    setLoading(true);
    try {
      const result = await apiRequest<ImportReport>("/api/import/mercator", {
        method: "POST",
        body: payload,
      });
      setReport(result);
      setSecret("");
      if (saveConfig) await refreshConfigs();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Import Mercator impossible.");
    } finally {
      setLoading(false);
    }
  }

  const selectedConfig = configs.find((config) => String(config.id) === selectedConfigId);

  return (
    <Dialog
      open
      onClose={onClose}
      title={report ? "Rapport d'import" : "Importer une cartographie"}
      description={
        report
          ? "Résultat détaillé de l'intégration dans cet audit."
          : "Mercator, CSV ou JSON : seules les briques nouvelles sont intégrées, sans écraser l'existant."
      }
      size="lg"
    >
      {report ? (
        <div className="space-y-4">
          <ImportSummary report={report} />
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={resetReport}>
              <RefreshCcw className="h-4 w-4" />
              Nouvel import
            </Button>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-950/50">
            {(
              [
                ["file", "Fichier CSV / JSON", FileJson],
                ["mercator", "API Mercator", Server],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setError(null);
                }}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors",
                  tab === value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="import-establishment" className={labelClass}>
              Établissement par défaut
            </label>
            <input
              id="import-establishment"
              className={inputClass}
              value={defaultEstablishment}
              onChange={(event) => setDefaultEstablishment(event.target.value)}
              list={datalistId}
            />
            <datalist id={datalistId}>
              {establishments.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <p className={helpClass}>
              Utilisé lorsque la source ne précise pas l'établissement de rattachement.
            </p>
          </div>

          {tab === "file" ? (
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <label htmlFor="import-file" className={labelClass}>
                    Fichier source
                  </label>
                  <input
                    ref={fileInputRef}
                    id="import-file"
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:rounded-l-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
                  />
                </div>
                <div>
                  <label htmlFor="import-format" className={labelClass}>
                    Format
                  </label>
                  <select
                    id="import-format"
                    className={selectClass}
                    value={importFormat}
                    onChange={(event) =>
                      setImportFormat(event.target.value as "auto" | "csv" | "json")
                    }
                  >
                    <option value="auto">Auto-détection</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gabarit CSV officiel avec les colonnes canoniques et alias français.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={templateLoading}
                >
                  {templateLoading ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Télécharger le gabarit
                </Button>
              </div>
              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
                <FileSpreadsheet className="mt-0.5 h-3 w-3 shrink-0" />
                CSV UTF-8, séparateur ; ou , — JSON tableau ou objet applications. La limite de
                lignes dépend de MAX_IMPORT_ROWS côté serveur.
              </p>
              <FieldError>{error}</FieldError>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {loading ? "Import en cours…" : "Importer le fichier"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMercatorSubmit} className="space-y-4">
              <div>
                <label htmlFor="mercator-config" className={labelClass}>
                  Configuration enregistrée
                </label>
                <select
                  id="mercator-config"
                  className={selectClass}
                  value={selectedConfigId}
                  onChange={(event) => {
                    setSelectedConfigId(event.target.value);
                    setError(null);
                  }}
                >
                  <option value="">Nouvelle connexion</option>
                  {configs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} — {config.base_url}
                    </option>
                  ))}
                </select>
                {configsError ? <FieldError>{configsError}</FieldError> : null}
              </div>

              {selectedConfig ? (
                <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-xs text-sky-700 dark:text-sky-300">
                  <p className="font-bold">{selectedConfig.base_url}</p>
                  <p className="mt-0.5">
                    Authentification {selectedConfig.auth_mode === "token" ? "jeton Bearer" : "identifiant / mot de passe"}
                    {selectedConfig.verify_tls ? " · TLS vérifié" : " · TLS non vérifié"}.
                    {selectedConfig.last_used_at ? " Les secrets chiffrés seront réutilisés sans être exposés." : ""}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="mercator-url" className={labelClass}>
                      URL de base Mercator
                    </label>
                    <input
                      id="mercator-url"
                      className={inputClass}
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      placeholder="https://mercator.ght.local"
                      inputMode="url"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="mercator-auth" className={labelClass}>
                        Mode d'authentification
                      </label>
                      <select
                        id="mercator-auth"
                        className={selectClass}
                        value={authMode}
                        onChange={(event) => {
                          setAuthMode(event.target.value as AuthMode);
                          setSecret("");
                        }}
                      >
                        <option value="token">Jeton Bearer (PAT)</option>
                        <option value="password">Identifiant / mot de passe</option>
                      </select>
                    </div>
                    {authMode === "password" ? (
                      <div>
                        <label htmlFor="mercator-username" className={labelClass}>
                          Identifiant
                        </label>
                        <input
                          id="mercator-username"
                          className={inputClass}
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          autoComplete="username"
                        />
                      </div>
                    ) : null}
                    <div className={authMode === "token" ? "sm:col-span-2" : ""}>
                      <label htmlFor="mercator-secret" className={labelClass}>
                        {authMode === "token" ? "Jeton Bearer" : "Mot de passe"}
                      </label>
                      <input
                        id="mercator-secret"
                        type="password"
                        className={inputClass}
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Jamais renvoyé par l'API"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={verifyTls}
                        onChange={(event) => setVerifyTls(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Vérifier le certificat TLS
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={saveConfig}
                        onChange={(event) => setSaveConfig(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Enregistrer cette configuration
                    </label>
                  </div>
                  {saveConfig ? (
                    <div>
                      <label htmlFor="mercator-config-name" className={labelClass}>
                        Nom de la configuration
                      </label>
                      <input
                        id="mercator-config-name"
                        className={inputClass}
                        value={configName}
                        onChange={(event) => setConfigName(event.target.value)}
                        placeholder="Mercator production GHT"
                      />
                    </div>
                  ) : null}
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Les secrets sont chiffrés avec Fernet côté backend et ne sont jamais renvoyés.
                    En production, conservez la vérification TLS sauf CA interne maîtrisée.
                  </p>
                </>
              )}

              <FieldError>{error}</FieldError>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                  {loading ? "Synchronisation…" : "Importer depuis Mercator"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Dialog>
  );
}
