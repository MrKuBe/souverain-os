import json

import httpx
import pytest

from app.services.importers import (
    MercatorClient,
    MercatorError,
    build_csv_template,
    dedupe_key,
    infer_layer,
    map_security_need,
    normalize_name,
    prepare_csv_import,
    prepare_json_import,
    prescore_heuristic,
)


def csv_bytes(header: str, *rows: str, delimiter: str = ";") -> bytes:
    lines = [delimiter.join(header.split(";")), *rows]
    return ("\ufeff" + "\n".join(lines) + "\n").encode("utf-8")


def test_map_security_need() -> None:
    assert map_security_need(1) == (1, None)
    assert map_security_need(2) == (3, None)
    assert map_security_need(3) == (5, None)
    assert map_security_need(4) == (5, None)
    value, warning = map_security_need(None)
    assert value == 3
    assert warning is not None
    value, warning = map_security_need(9)
    assert value == 3
    assert warning is not None


def test_infer_layer_priorities_and_accents() -> None:
    assert infer_layer(name="Serveur PACS") == "metier"
    assert infer_layer(name="TéléMédecine") == "metier"
    assert infer_layer(name="Microsoft 365") == "supports"
    assert infer_layer(name="Serveur Windows") == "infrastructure"
    assert infer_layer(name="Application inconnue") == "supports"
    assert infer_layer(name="Dossier patient", forced_layer="infrastructure") == "infrastructure"
    assert infer_layer(name="Paris") == "supports"


def test_normalize_name_is_case_and_accent_insensitive() -> None:
    assert normalize_name("  TéléMédecine  ") == "telemedecine"
    assert normalize_name("Sectra PACS") == normalize_name("SECTRA  pacs")


def test_prescore_postgresql() -> None:
    criteria, notes, warnings = prescore_heuristic(
        name="PostgreSQL 16",
        technology="PostgreSQL",
        security_need_a=3,
    )
    assert criteria == {
        "license_model": 0,
        "jurisdiction": 0,
        "interoperability": 3,
        "operational_dependency": 0,
        "business_criticality": 5,
    }
    assert notes
    assert warnings == []


def test_prescore_external_microsoft() -> None:
    criteria, _notes, _warnings = prescore_heuristic(
        name="Microsoft 365",
        technology="Exchange Online",
        editor="Microsoft",
        external=True,
        security_need_a=2,
    )
    assert criteria["license_model"] == 5
    assert criteria["jurisdiction"] == 5
    assert criteria["operational_dependency"] == 5
    assert criteria["business_criticality"] == 3


def test_prescore_eu_proprietary_with_standard() -> None:
    criteria, _notes, _warnings = prescore_heuristic(
        name="PACS Sectra",
        technology="DICOM",
        editor="Sectra",
        external=False,
        security_need_a=4,
    )
    assert criteria["license_model"] == 4
    assert criteria["jurisdiction"] == 0
    assert criteria["interoperability"] == 0
    assert criteria["operational_dependency"] == 5
    assert criteria["business_criticality"] == 5


def test_csv_template_is_utf8_bom_with_expected_headers() -> None:
    content = build_csv_template()
    assert content.startswith(b"\xef\xbb\xbf")
    header = content.decode("utf-8-sig").splitlines()[0]
    assert header.startswith("name;layer;establishment")
    assert "business_criticality" in header


def test_csv_import_with_french_aliases_and_validation() -> None:
    header = (
        "nom;couche;etablissement;editeur;technologie;externe;modele_licence;"
        "juridiction;interoperabilite;dependance_operationnelle;criticite;statut"
    )
    rows = [
        "DPI Softway;metier;CHU Support;Softway Medical;FHIR;non;4;0;3;5;5;valide",
        "Bad Criticite;supports;CHU Support;Test;API;non;2;2;3;3;2;valide",
        "Mauvaise couche;inconnue;CHU Support;Test;API;non;2;2;3;3;3;valide",
    ]
    outcome = prepare_csv_import(csv_bytes(header, *rows))
    assert outcome.total_received == 3
    assert len(outcome.bricks) == 1
    assert len(outcome.errors) == 2
    assert outcome.errors[0].row == 3
    assert "1, 3 ou 5" in outcome.errors[0].message
    assert "Couche invalide" in outcome.errors[1].message
    brick = outcome.bricks[0]
    assert brick.name == "DPI Softway"
    assert brick.layer == "metier"
    assert brick.business_criticality == 5
    assert brick.source == "csv"
    assert brick.status == "valide"
    assert outcome.warnings == []


def test_csv_import_comma_delimiter_and_boolean_values() -> None:
    header = (
        "name,layer,license_model,jurisdiction,interoperability,"
        "operational_dependency,business_criticality,external"
    )
    row = "Nextcloud,supports,0,0,0,0,3,yes"
    outcome = prepare_csv_import(csv_bytes(header, row, delimiter=","))
    assert len(outcome.bricks) == 1
    assert outcome.bricks[0].external is True


def test_csv_import_deduplicates_existing_and_internal() -> None:
    header = (
        "name;layer;license_model;jurisdiction;interoperability;"
        "operational_dependency;business_criticality"
    )
    rows = [
        "GLPI;supports;0;0;0;0;3",
        "GLPI;supports;0;0;0;0;3",
        "PostgreSQL;infrastructure;0;0;0;0;5",
    ]
    outcome = prepare_csv_import(
        csv_bytes(header, *rows),
        existing_keys={dedupe_key("PostgreSQL", "infrastructure")},
    )
    assert len(outcome.bricks) == 1
    assert outcome.duplicates == 2


def test_csv_missing_criteria_uses_heuristics_and_warning() -> None:
    header = "name;layer;business_criticality"
    row = "PostgreSQL 16;infrastructure;5"
    outcome = prepare_csv_import(csv_bytes(header, row))
    assert len(outcome.bricks) == 1
    brick = outcome.bricks[0]
    assert brick.license_model == 0
    assert brick.jurisdiction == 0
    assert brick.operational_dependency == 0
    assert "Pré-scoring heuristique" in brick.notes
    assert outcome.warnings == []

    header_without_criticality = (
        "name;layer;license_model;jurisdiction;interoperability;"
        "operational_dependency"
    )
    outcome = prepare_csv_import(
        csv_bytes(header_without_criticality, "LibreOffice;supports;0;0;0;0")
    )
    assert outcome.bricks[0].business_criticality == 3
    assert any("criticité absente" in warning for warning in outcome.warnings)


def test_json_generic_import() -> None:
    payload = {
        "applications": [
            {
                "nom": "Messagerie BlueMind",
                "couche": "supports",
                "etablissement": "CH Jean-Moulin",
                "criticite": 3,
                "external": "non",
            }
        ]
    }
    outcome = prepare_json_import(json.dumps(payload).encode("utf-8"))
    assert outcome.total_received == 1
    assert len(outcome.bricks) == 1
    brick = outcome.bricks[0]
    assert brick.name == "Messagerie BlueMind"
    assert brick.source == "json"
    assert brick.business_criticality == 3
    assert brick.layer == "supports"


def test_json_mercator_export_mapping() -> None:
    payload = {
        "applications": [
            {
                "id": 42,
                "name": "Microsoft 365",
                "technology": "Teams",
                "vendor": "Microsoft",
                "external": True,
                "security_need_a": 4,
            }
        ],
        "databases": [
            {
                "id": 43,
                "name": "Oracle Database 19c",
                "technology": "Oracle Database",
                "cpe_vendor": "oracle",
                "security_need_a": 3,
            }
        ],
        "logical-servers": [
            {
                "id": 44,
                "name": "Active Directory",
                "cpe_vendor": "microsoft",
                "security_need_a": 1,
            }
        ],
    }
    outcome = prepare_json_import(json.dumps(payload).encode("utf-8"))
    assert outcome.total_received == 3
    assert len(outcome.bricks) == 3
    by_name = {brick.name: brick for brick in outcome.bricks}
    assert by_name["Microsoft 365"].layer == "supports"
    assert by_name["Oracle Database 19c"].layer == "infrastructure"
    assert by_name["Active Directory"].layer == "infrastructure"
    assert by_name["Microsoft 365"].source == "mercator"
    assert by_name["Microsoft 365"].status == "a_valider"
    assert by_name["Microsoft 365"].business_criticality == 5
    assert by_name["Active Directory"].business_criticality == 1
    assert by_name["Oracle Database 19c"].mercator_id == "43"


def test_json_mercator_invalid_availability_warns() -> None:
    payload = {
        "databases": [
            {
                "name": "Base sans disponibilité",
                "vendor": "Oracle",
                "security_need_a": None,
            }
        ]
    }
    outcome = prepare_json_import(json.dumps(payload).encode("utf-8"))
    assert outcome.bricks[0].business_criticality == 3
    assert any("Disponibilité Mercator" in warning for warning in outcome.warnings)


def test_json_invalid_syntax() -> None:
    with pytest.raises(Exception, match="JSON invalide"):
        prepare_json_import(b"{not json")


def test_mercator_token_extraction() -> None:
    assert MercatorClient._extract_token({"access_token": "abc"}) == "abc"
    assert MercatorClient._extract_token({"token": "def"}) == "def"
    assert MercatorClient._extract_token({"data": {"access_token": "ghi"}}) == "ghi"
    assert MercatorClient._extract_token({"data": {"token": "jkl"}}) == "jkl"
    assert MercatorClient._extract_token({}) is None


def test_mercator_base_url_validation() -> None:
    assert (
        MercatorClient._validate_base_url("https://mercator.example.local/")
        == "https://mercator.example.local"
    )
    with pytest.raises(MercatorError):
        MercatorClient._validate_base_url("file:///etc/passwd")
    with pytest.raises(MercatorError):
        MercatorClient._validate_base_url("https://user:pass@mercator.example")


def test_mercator_pagination_and_bearer_header() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-token"
        if request.url.path.endswith("/login"):
            return httpx.Response(200, json={"access_token": "test-token"})
        page = int(request.url.params.get("page", "1"))
        endpoint = request.url.path.rsplit("/", 1)[-1]
        if endpoint == "applications":
            return httpx.Response(
                200,
                json={
                    "data": [{"name": f"Application {page}"}],
                    "meta": {"last_page": 2},
                    "links": {"next": "https://example/page=2"},
                },
            )
        if endpoint == "application-blocks":
            return httpx.Response(404, json={"message": "Not found"})
        return httpx.Response(200, json=[])

    client = MercatorClient(
        base_url="https://mercator.example",
        token="test-token",
    )
    client.client.close()
    client.client = httpx.Client(
        transport=httpx.MockTransport(handler),
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer test-token",
        },
    )
    try:
        client.authenticate()
        catalog, warnings = client.fetch_catalog()
    finally:
        client.close()
    assert [item["name"] for item in catalog["applications"]] == [
        "Application 1",
        "Application 2",
    ]
    assert any("404" in warning for warning in warnings)
    assert catalog["databases"] == []
