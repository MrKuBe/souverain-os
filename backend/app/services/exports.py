"""Génération des rapports d'audit SouverainOS (JSON, Markdown, CSV)."""

import csv
import io
import json
import re
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Literal

from app.models.audit import ApplicationBrick, Audit
from app.services.scoring import (
    LAYER_LABELS,
    ScoreReport,
    application_score,
)

ExportFormat = Literal["json", "markdown", "csv"]

MEDIA_TYPES: dict[str, str] = {
    "json": "application/json; charset=utf-8",
    "markdown": "text/markdown; charset=utf-8",
    "csv": "text/csv; charset=utf-8",
}

AUTHOR_CREDIT = (
    "Conçu par Bertrand Kuzbinski — Développé en Vibecoding "
    "(Full-Stack Open Source)."
)

STATUS_LABELS = {"a_valider": "À valider", "valide": "Validé"}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _slug(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-").lower()
    return normalized[:80] or "audit"


def export_filename(audit: Audit, fmt: ExportFormat) -> str:
    extension = {"json": "json", "markdown": "md", "csv": "csv"}[fmt]
    date_part = datetime.now(UTC).strftime("%Y%m%d")
    return f"souverainos-{_slug(audit.name)}-{date_part}.{extension}"


def _audit_payload(audit: Audit) -> dict[str, object]:
    return {
        "id": audit.id,
        "name": audit.name,
        "description": audit.description,
        "ght_name": audit.ght_name,
        "establishments": audit.establishments,
        "is_demo": audit.is_demo,
        "created_at": audit.created_at.isoformat(),
        "updated_at": audit.updated_at.isoformat(),
    }


def build_json_export(
    audit: Audit,
    bricks: list[ApplicationBrick],
    report: ScoreReport,
    *,
    generated_by: str | None,
) -> str:
    payload = {
        "application": "SouverainOS",
        "title": "Audit de Dépendance Numérique des SIH",
        "author": "Bertrand Kuzbinski",
        "credit": AUTHOR_CREDIT,
        "generated_at": _now_iso(),
        "generated_by": generated_by or "anonyme",
        "audit": _audit_payload(audit),
        "score": asdict(report),
        "applications": [
            {
                "id": brick.id,
                "name": brick.name,
                "description": brick.description,
                "editor": brick.editor,
                "technology": brick.technology,
                "app_type": brick.app_type,
                "responsible": brick.responsible,
                "establishment": brick.establishment,
                "layer": brick.layer,
                "layer_label": LAYER_LABELS.get(brick.layer, brick.layer),
                "external": brick.external,
                "source": brick.source,
                "status": brick.status,
                "mercator_id": brick.mercator_id,
                "security_need_a": brick.security_need_a,
                "license_model": brick.license_model,
                "jurisdiction": brick.jurisdiction,
                "interoperability": brick.interoperability,
                "operational_dependency": brick.operational_dependency,
                "business_criticality": brick.business_criticality,
                "unit_score": application_score(brick),
                "notes": brick.notes,
            }
            for brick in bricks
        ],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


def _md_escape(value: object) -> str:
    if value is None or value == "":
        return "—"
    text = str(value).replace("\r", " ").replace("\n", " ").replace("|", "\\|")
    return text.strip() or "—"


def _classification_text(report: ScoreReport) -> str:
    if not report.evaluated:
        return "Non évalué"
    return f"{report.classification.label} ({report.global_score:.2f}/100)"


def build_markdown_export(
    audit: Audit,
    bricks: list[ApplicationBrick],
    report: ScoreReport,
    *,
    generated_by: str | None,
) -> str:
    context = (
        "Mode Démonstration (données fictives publiques)"
        if audit.is_demo
        else "Audit privé GHT"
    )
    lines: list[str] = [
        f"# Rapport d'audit — {audit.name}",
        "",
        "**SouverainOS — Audit de Dépendance Numérique des SIH**",
        "",
        f"- **GHT :** {_md_escape(audit.ght_name)}",
        f"- **Contexte :** {context}",
        f"- **Établissements :** {_md_escape(', '.join(audit.establishments))}",
        f"- **Date d'export :** {_now_iso()}",
        f"- **Exporté par :** {_md_escape(generated_by or 'anonyme')}",
        f"- **Score global :** **{report.global_score:.2f}/100** — "
        f"{report.classification.label if report.evaluated else 'Non évalué'}",
        "",
        "## Synthèse par couche",
        "",
        "| Couche | Poids officiel | Poids appliqué | Briques | Score | Classification |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for layer in report.layers:
        lines.append(
            (
                "| {label} | {weight:.0%} | {effective:.2%} | {count} | "
                "{score} | {classification} |"
            ).format(
                label=layer.label,
                weight=layer.weight,
                effective=layer.effective_weight,
                count=layer.count,
                score=f"{layer.score:.2f}" if layer.score is not None else "—",
                classification=layer.classification.label
                if layer.classification
                else "Non évalué",
            )
        )

    lines.extend(
        [
            "",
            "## Axes de risque (radar)",
            "",
            "| Axe | Indice /100 |",
            "|---|---:|",
        ]
    )
    for axis in report.axes:
        lines.append(f"| {_md_escape(axis.label)} | {axis.score:.2f} |")

    lines.extend(
        [
            "",
            "## Top 5 des vulnérabilités",
            "",
            "| # | Brique | Couche | Établissement | Score | Criticité | Risque principal |",
            "|---:|---|---|---|---:|---:|---|",
        ]
    )
    if report.top_vulnerabilities:
        for index, vulnerability in enumerate(report.top_vulnerabilities, start=1):
            lines.append(
                f"| {index} | {_md_escape(vulnerability.name)} | "
                f"{_md_escape(vulnerability.layer_label)} | "
                f"{_md_escape(vulnerability.establishment)} | "
                f"{vulnerability.score:.2f} | "
                f"{vulnerability.business_criticality} | "
                f"{_md_escape(vulnerability.primary_risk.label)} "
                f"({vulnerability.primary_risk.value}) |"
            )
    else:
        lines.append("| — | Aucune brique évaluée | — | — | — | — | — |")

    lines.extend(["", "## Cartographie détaillée", ""])
    for layer_key in ("infrastructure", "supports", "metier"):
        layer_bricks = [brick for brick in bricks if brick.layer == layer_key]
        if not layer_bricks:
            continue
        lines.extend(
            [
                f"### {LAYER_LABELS[layer_key]}",
                "",
                (
                    "| Brique | Éditeur / Technologie | Établissement | Externe | "
                    "C1 | C2 | C3 | C4 | C5 | Score | Statut |"
                ),
                "|---|---|---|---|---:|---:|---:|---:|---:|---:|---|",
            ]
        )
        for brick in sorted(
            layer_bricks,
            key=lambda item: (-application_score(item), item.name.casefold()),
        ):
            lines.append(
                "| {name} | {editor} | {establishment} | {external} | {c1} | {c2} | "
                "{c3} | {c4} | {c5} | {score:.2f} | {status} |".format(
                    name=_md_escape(brick.name),
                    editor=_md_escape(
                        " / ".join(part for part in (brick.editor, brick.technology) if part)
                    ),
                    establishment=_md_escape(brick.establishment),
                    external="Oui" if brick.external else "Non",
                    c1=brick.license_model,
                    c2=brick.jurisdiction,
                    c3=brick.interoperability,
                    c4=brick.operational_dependency,
                    c5=brick.business_criticality,
                    score=application_score(brick),
                    status=STATUS_LABELS.get(brick.status, brick.status),
                )
            )
        lines.append("")

    if report.evaluated:
        lines.append(f"**Classification : {_classification_text(report)}**")
    else:
        lines.append("**Audit sans brique : score non évalué.**")

    lines.extend(
        [
            "",
            "---",
            "",
            f"*{AUTHOR_CREDIT}*",
            "",
            f"*Rapport généré par SouverainOS le {_now_iso()}.*",
            "",
        ]
    )
    return "\n".join(lines)


def build_csv_export(
    audit: Audit,
    bricks: list[ApplicationBrick],
    report: ScoreReport,
    *,
    generated_by: str | None,
) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(["# SouverainOS — Rapport d'audit de dépendance numérique"])
    writer.writerow(["# Audit", audit.name])
    writer.writerow(["# GHT", audit.ght_name])
    writer.writerow(
        [
            "# Contexte",
            "Démonstration publique" if audit.is_demo else "Audit privé GHT",
        ]
    )
    writer.writerow(["# Date", _now_iso()])
    writer.writerow(["# Exporté par", generated_by or "anonyme"])
    writer.writerow(
        [
            "# Score global",
            f"{report.global_score:.2f}",
            report.classification.label if report.evaluated else "Non évalué",
        ]
    )
    writer.writerow(["# Auteur", AUTHOR_CREDIT])
    writer.writerow([])
    headers = [
        "name",
        "layer",
        "layer_label",
        "establishment",
        "description",
        "editor",
        "technology",
        "app_type",
        "responsible",
        "external",
        "license_model",
        "jurisdiction",
        "interoperability",
        "operational_dependency",
        "business_criticality",
        "unit_score",
        "status",
        "source",
        "mercator_id",
        "notes",
    ]
    writer.writerow(headers)
    for brick in bricks:
        writer.writerow(
            [
                brick.name,
                brick.layer,
                LAYER_LABELS.get(brick.layer, brick.layer),
                brick.establishment,
                brick.description,
                brick.editor,
                brick.technology,
                brick.app_type,
                brick.responsible,
                "oui" if brick.external else "non",
                brick.license_model,
                brick.jurisdiction,
                brick.interoperability,
                brick.operational_dependency,
                brick.business_criticality,
                f"{application_score(brick):.2f}",
                STATUS_LABELS.get(brick.status, brick.status),
                brick.source,
                brick.mercator_id or "",
                brick.notes,
            ]
        )
    return "\ufeff" + buffer.getvalue()


def build_export(
    audit: Audit,
    bricks: list[ApplicationBrick],
    report: ScoreReport,
    fmt: ExportFormat,
    *,
    generated_by: str | None,
) -> tuple[str, str, str]:
    builders = {
        "json": build_json_export,
        "markdown": build_markdown_export,
        "csv": build_csv_export,
    }
    content = builders[fmt](audit, bricks, report, generated_by=generated_by)
    return content, MEDIA_TYPES[fmt], export_filename(audit, fmt)
