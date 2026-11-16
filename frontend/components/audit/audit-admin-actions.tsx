"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, inputClass, labelClass, textareaClass } from "@/components/ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import type { Audit } from "@/lib/types";

export function AuditAdminActions({
  audit,
  canDelete,
}: {
  audit: Audit;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(audit.name);
  const [ghtName, setGhtName] = useState(audit.ght_name);
  const [description, setDescription] = useState(audit.description);
  const [establishments, setEstablishments] = useState(audit.establishments.join("\n"));
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setName(audit.name);
    setGhtName(audit.ght_name);
    setDescription(audit.description);
    setEstablishments(audit.establishments.join("\n"));
    setConfirmDelete(false);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Le nom de l'audit est obligatoire.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest<Audit>(`/api/audits/${audit.id}`, {
        method: "PATCH",
        body: {
          name: name.trim(),
          ght_name: ghtName.trim(),
          description: description.trim(),
          establishments: establishments
            .split(/[\n,;]/)
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/audits/${audit.id}`, { method: "DELETE" });
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Suppression impossible.");
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openDialog}>
        <Pencil className="h-3.5 w-3.5" />
        Paramètres
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Paramètres de l'audit"
        description="Modifiez les informations du groupement et les établissements rattachés."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="settings-name" className={labelClass}>
              Nom de l'audit
            </label>
            <input
              id="settings-name"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="settings-ght" className={labelClass}>
              GHT
            </label>
            <input
              id="settings-ght"
              className={inputClass}
              value={ghtName}
              onChange={(event) => setGhtName(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="settings-description" className={labelClass}>
              Contexte
            </label>
            <textarea
              id="settings-description"
              className={textareaClass}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="settings-establishments" className={labelClass}>
              Établissements
            </label>
            <textarea
              id="settings-establishments"
              className={textareaClass}
              value={establishments}
              onChange={(event) => setEstablishments(event.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Un établissement par ligne. Les briques existantes conservent leur rattachement.
            </p>
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || confirmDelete}>
              {loading && !confirmDelete ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </form>

        {canDelete ? (
          <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Zone sensible</p>
                <p className="mt-0.5 text-xs leading-relaxed text-rose-600/80 dark:text-rose-300/80">
                  La suppression efface l'audit et toutes ses briques. Cette action est réservée à
                  admin_ght et journalisée.
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
                  {loading && confirmDelete ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {confirmDelete ? "Confirmer la suppression" : "Supprimer l'audit"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
