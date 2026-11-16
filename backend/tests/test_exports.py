import json

from app.core.version import get_app_version
from app.models.audit import ApplicationBrick, Audit
from app.services.exports import (
    build_csv_export,
    build_json_export,
    build_markdown_export,
)
from app.services.scoring import compute_score_report


def sample_audit() -> Audit:
    return Audit(
        id=1,
        name="Audit de test",
        description="Audit synthétique",
        ght_name="GHT Test",
        establishments=["CHU Test"],
        is_demo=False,
        created_by_id=1,
    )


def sample_brick() -> ApplicationBrick:
    return ApplicationBrick(
        id=1,
        audit_id=1,
        name="Dossier Patient",
        description="DPI",
        editor="Éditeur",
        technology="PostgreSQL",
        establishment="CHU Test",
        layer="metier",
        license_model=2,
        jurisdiction=0,
        interoperability=1,
        operational_dependency=2,
        business_criticality=5,
    )


def test_json_export_contains_version() -> None:
    audit = sample_audit()
    brick = sample_brick()
    payload = json.loads(
        build_json_export(
            audit,
            [brick],
            compute_score_report([brick]),
            generated_by="admin",
        )
    )
    assert payload["version"] == get_app_version()
    assert payload["application"] == "SouverainOS"
    assert payload["audit"]["name"] == "Audit de test"


def test_markdown_export_contains_version() -> None:
    audit = sample_audit()
    brick = sample_brick()
    content = build_markdown_export(
        audit,
        [brick],
        compute_score_report([brick]),
        generated_by="admin",
    )
    assert f"- **Version :** {get_app_version()}" in content
    assert f"Rapport généré par SouverainOS v{get_app_version()}" in content


def test_csv_export_contains_version() -> None:
    audit = sample_audit()
    brick = sample_brick()
    content = build_csv_export(
        audit,
        [brick],
        compute_score_report([brick]),
        generated_by="admin",
    )
    assert content.startswith("\ufeff# SouverainOS")
    assert f"# Version;{get_app_version()}" in content
