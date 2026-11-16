"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, inputClass, labelClass, textareaClass } from "@/components/ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import type { Audit } from "@/lib/types";

export function CreateAuditButton() {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ghtName, setGhtName] = useState("");
  const [description, setDescription] = useState("");
  const [establishments, setEstablishments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setGhtName("");
    setDescription("");
    setEstablishments("");
    setError(null);
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
      const audit = await apiRequest<Audit>("/api/audits", {
        method: "POST",
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
      reset();
      router.push(`/audits/${audit.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Création impossible. Vérifiez l'API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nouvel audit
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Créer un audit GHT"
        description="L'audit réel est privé et rattaché à votre compte. Les données restent sur l'infrastructure du GHT."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${formId}-audit-name`} className={labelClass}>
              Nom de l'audit
            </label>
            <input
              id={`${formId}-audit-name`}
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Audit de dépendance numérique 2026"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor={`${formId}-audit-ght`} className={labelClass}>
              Groupement hospitalier de territoire
            </label>
            <input
              id={`${formId}-audit-ght`}
              className={inputClass}
              value={ghtName}
              onChange={(event) => setGhtName(event.target.value)}
              placeholder="GHT Grand Lac"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-audit-description`} className={labelClass}>
              Contexte
            </label>
            <textarea
              id={`${formId}-audit-description`}
              className={textareaClass}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Périmètre, objectifs, échéance de la thèse professionnelle…"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-audit-establishments`} className={labelClass}>
              Établissements
            </label>
            <textarea
              id={`${formId}-audit-establishments`}
              className={textareaClass}
              value={establishments}
              onChange={(event) => setEstablishments(event.target.value)}
              placeholder={"CHU de rattachement\nCH de proximité\nÉtablissement support"}
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Un établissement par ligne, ou séparés par des virgules.
            </p>
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? "Création…" : "Créer l'audit"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
