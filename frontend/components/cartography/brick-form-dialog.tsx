"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CriteriaMethodologyTooltip, UnitScoreMethodologyTooltip } from "@/components/methodology/methodology-tooltips";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, helpClass, inputClass, labelClass, selectClass, textareaClass } from "@/components/ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import { ALL_CRITERIA } from "@/lib/criteria";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { Application, BusinessCriticality, Layer, BrickStatus } from "@/lib/types";

type CriteriaState = {
  license_model: number;
  jurisdiction: number;
  interoperability: number;
  operational_dependency: number;
  business_criticality: BusinessCriticality;
};

export function BrickFormDialog({
  auditId,
  brick,
  establishments,
  onClose,
}: {
  auditId: number;
  brick: Application | null;
  establishments: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const datalistId = useId();
  const [name, setName] = useState(brick?.name ?? "");
  const [description, setDescription] = useState(brick?.description ?? "");
  const [editor, setEditor] = useState(brick?.editor ?? "");
  const [technology, setTechnology] = useState(brick?.technology ?? "");
  const [appType, setAppType] = useState(brick?.app_type ?? "");
  const [responsible, setResponsible] = useState(brick?.responsible ?? "");
  const [establishment, setEstablishment] = useState(
    brick?.establishment ?? establishments[0] ?? "Établissement support",
  );
  const [layer, setLayer] = useState<Layer>(brick?.layer ?? "metier");
  const [external, setExternal] = useState(brick?.external ?? false);
  const [status, setStatus] = useState<BrickStatus>(brick?.status ?? "a_valider");
  const [securityNeed, setSecurityNeed] = useState(
    brick?.security_need_a ? String(brick.security_need_a) : "",
  );
  const [notes, setNotes] = useState(brick?.notes ?? "");
  const [criteria, setCriteria] = useState<CriteriaState>({
    license_model: brick?.license_model ?? 2,
    jurisdiction: brick?.jurisdiction ?? 2,
    interoperability: brick?.interoperability ?? 3,
    operational_dependency: brick?.operational_dependency ?? 3,
    business_criticality: brick?.business_criticality ?? 3,
  });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCriterion(key: keyof CriteriaState, value: number) {
    setCriteria((current) => ({
      ...current,
      [key]: key === "business_criticality" ? (value as BusinessCriticality) : value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom de la brique est obligatoire.");
      return;
    }
    if (!establishment.trim()) {
      setError("L'établissement est obligatoire.");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      editor: editor.trim(),
      technology: technology.trim(),
      app_type: appType.trim(),
      responsible: responsible.trim(),
      establishment: establishment.trim(),
      layer,
      external,
      status,
      security_need_a: securityNeed ? Number(securityNeed) : null,
      notes: notes.trim(),
      ...criteria,
    };
    setLoading(true);
    try {
      if (brick) {
        await apiRequest<Application>(`/api/applications/${brick.id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await apiRequest<Application>(`/api/audits/${auditId}/applications`, {
          method: "POST",
          body: payload,
        });
      }
      onClose();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!brick) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/applications/${brick.id}`, { method: "DELETE" });
      onClose();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Suppression impossible.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={brick ? "Modifier la brique applicative" : "Ajouter une brique applicative"}
      description={
        brick
          ? `${brick.name} · Source ${SOURCE_LABELS[brick.source]}${brick.mercator_id ? ` · Mercator #${brick.mercator_id}` : ""}`
          : "La brique, ses cinq critères et son établissement alimentent le score officiel de l'audit."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Identité applicative</h3>
            <p className={helpClass}>Référentiel humain et technique de la brique.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="brick-name" className={labelClass}>
                Nom de l'application *
              </label>
              <input
                id="brick-name"
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dossier Patient Informatisé"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="brick-editor" className={labelClass}>
                Éditeur
              </label>
              <input
                id="brick-editor"
                className={inputClass}
                value={editor}
                onChange={(event) => setEditor(event.target.value)}
                placeholder="Maincare, Softway Medical…"
              />
            </div>
            <div>
              <label htmlFor="brick-technology" className={labelClass}>
                Technologie
              </label>
              <input
                id="brick-technology"
                className={inputClass}
                value={technology}
                onChange={(event) => setTechnology(event.target.value)}
                placeholder="PostgreSQL, Java, SaaS…"
              />
            </div>
            <div>
              <label htmlFor="brick-type" className={labelClass}>
                Type d'application
              </label>
              <input
                id="brick-type"
                className={inputClass}
                value={appType}
                onChange={(event) => setAppType(event.target.value)}
                placeholder="DPI, PACS, GED, serveur…"
              />
            </div>
            <div>
              <label htmlFor="brick-responsible" className={labelClass}>
                Responsable
              </label>
              <input
                id="brick-responsible"
                className={inputClass}
                value={responsible}
                onChange={(event) => setResponsible(event.target.value)}
                placeholder="Direction des systèmes d'information"
              />
            </div>
            <div>
              <label htmlFor="brick-layer" className={labelClass}>
                Couche *
              </label>
              <select
                id="brick-layer"
                className={selectClass}
                value={layer}
                onChange={(event) => setLayer(event.target.value as Layer)}
              >
                <option value="infrastructure">Infrastructure</option>
                <option value="supports">Supports</option>
                <option value="metier">Métier</option>
              </select>
            </div>
            <div>
              <label htmlFor="brick-establishment" className={labelClass}>
                Établissement *
              </label>
              <input
                id="brick-establishment"
                className={inputClass}
                value={establishment}
                onChange={(event) => setEstablishment(event.target.value)}
                list={datalistId}
                placeholder="Établissement support"
              />
              <datalist id={datalistId}>
                {establishments.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="brick-status" className={labelClass}>
                Statut de validation
              </label>
              <select
                id="brick-status"
                className={selectClass}
                value={status}
                onChange={(event) => setStatus(event.target.value as BrickStatus)}
              >
                <option value="a_valider">{STATUS_LABELS.a_valider}</option>
                <option value="valide">{STATUS_LABELS.valide}</option>
              </select>
            </div>
            <div>
              <label htmlFor="brick-security" className={labelClass}>
                Besoin de disponibilité (Mercator)
              </label>
              <select
                id="brick-security"
                className={selectClass}
                value={securityNeed}
                onChange={(event) => setSecurityNeed(event.target.value)}
              >
                <option value="">Non renseigné</option>
                <option value="1">1 — Faible</option>
                <option value="2">2 — Modéré</option>
                <option value="3">3 — Important</option>
                <option value="4">4 — Critique</option>
              </select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={external}
                onChange={(event) => setExternal(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Application hébergée hors GHT
            </label>
            <div className="sm:col-span-2">
              <label htmlFor="brick-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="brick-description"
                className={textareaClass}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Périmètre fonctionnel, utilisateurs, intégrations…"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
              C1 → C5 · Critères de dépendance
              <CriteriaMethodologyTooltip />
            </h3>
            <p className={helpClass}>
              0 = souverain / ouvert, 5 = dépendance fermée ou extraterritoriale. C5 est
              restreint à 1, 3 ou 5.
            </p>
            <div className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
              <UnitScoreMethodologyTooltip />
              <span>
                Ces critères alimentent le score unitaire calculé exclusivement par l’API.
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ALL_CRITERIA.map((criterion) => (
              <div key={criterion.key}>
                <label htmlFor={`criterion-${criterion.key}`} className={labelClass}>
                  {criterion.label}
                </label>
                <select
                  id={`criterion-${criterion.key}`}
                  className={selectClass}
                  value={criteria[criterion.key]}
                  onChange={(event) => setCriterion(criterion.key, Number(event.target.value))}
                >
                  {criterion.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} — {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  {criterion.options.find((option) => option.value === criteria[criterion.key])?.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <label htmlFor="brick-notes" className={labelClass}>
            Notes d'audit
          </label>
          <textarea
            id="brick-notes"
            className={textareaClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Contrat, échéance, clause de réversibilité, points de vigilance…"
          />
        </section>

        <FieldError>{error}</FieldError>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading || confirmDelete}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {brick ? "Enregistrer" : "Ajouter la brique"}
          </Button>
        </div>
      </form>

      {brick ? (
        <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Supprimer cette brique</p>
              <p className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-300/80">
                La suppression est journalisée et recalcule immédiatement le score.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  void handleDelete();
                }}
                disabled={loading}
              >
                {loading && confirmDelete ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
