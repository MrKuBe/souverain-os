"""Mapping d'import Mercator, CSV et JSON.

Source de vérité unique : toute modification doit être répercutée dans AGENTS.md
et dans backend/tests/test_importers.py.
"""

import csv
import io
import json
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Literal
from urllib.parse import urlparse

import httpx

from app.services.scoring import LAYER_ORDER

LayerKey = Literal["infrastructure", "supports", "metier"]
GenericSource = Literal["csv", "json"]

CSV_TEMPLATE_COLUMNS = (
    "name",
    "layer",
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
    "status",
    "notes",
)

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "name": ("nom", "libelle", "application"),
    "layer": ("couche", "stack"),
    "establishment": ("etablissement", "site"),
    "description": ("desc",),
    "editor": ("editeur", "vendor", "fournisseur"),
    "technology": ("technologie", "tech"),
    "app_type": ("type", "type_application"),
    "responsible": ("responsable", "proprietaire"),
    "external": ("externe", "is_external"),
    "license_model": ("modele_licence", "licence", "license"),
    "jurisdiction": ("juridiction",),
    "interoperability": ("interoperabilite", "interop"),
    "operational_dependency": ("dependance_operationnelle", "mco"),
    "business_criticality": ("criticite", "criticite_metier"),
    "status": ("statut",),
    "notes": ("note", "commentaire"),
    "mercator_id": ("id", "mercatorid"),
    "security_need_a": ("disponibilite", "security_need_availability"),
}

METIER_KEYWORDS = (
    "dpi",
    "dossier patient",
    "sgl",
    "laboratoire",
    "lims",
    "pacs",
    "ris",
    "imagerie",
    "dicom",
    "gam",
    "gestion administrative",
    "pharmacie",
    "biomedical",
    "gmao",
    "soins",
    "patient",
    "urgences",
    "bloc",
    "maternite",
    "telemedecine",
    "portail patient",
    "sterilisation",
    "oncologie",
    "anesthesie",
    "radiotherapie",
    "hemovigilance",
)

SUPPORTS_KEYWORDS = (
    "messagerie",
    "mail",
    "exchange",
    "m365",
    "microsoft 365",
    "teams",
    "visio",
    "collaboration",
    "nextcloud",
    "bluemind",
    "blue mind",
    "ged",
    "bureautique",
    "office",
    "libreoffice",
    "itsm",
    "cmdb",
    "glpi",
    "helpdesk",
    "service desk",
    "intranet",
    "sharepoint",
    "wiki",
    "visioconference",
    "signature electronique",
    "workflow",
)

INFRA_KEYWORDS = (
    "serveur",
    "server",
    "hyperviseur",
    "vmware",
    "proxmox",
    "base de donnees",
    "database",
    "oracle",
    "postgres",
    "mysql",
    "mariadb",
    "sql server",
    "annuaire",
    "active directory",
    "ldap",
    "freeipa",
    "samba",
    "stockage",
    "sauvegarde",
    "backup",
    "reseau",
    "firewall",
    "pare-feu",
    "hebergement",
    "cloud",
    "kubernetes",
    "docker",
    "linux",
    "windows server",
    "middleware",
    "san",
    "nas",
    "virtualisation",
)

FOSS_TOKENS = (
    "postgresql",
    "postgres",
    "mariadb",
    "mysql",
    "linux",
    "debian",
    "ubuntu",
    "red hat",
    "proxmox",
    "glpi",
    "nextcloud",
    "samba",
    "freeipa",
    "openldap",
    "apache",
    "nginx",
    "orthanc",
    "dcm4che",
    "alfresco community",
    "libreoffice",
    "bluemind",
    "blue mind",
    "odoo",
    "gitlab",
    "moodle",
    "zabbix",
    "prometheus",
    "grafana",
    "kubernetes",
    "docker",
    "podman",
    "pfsense",
    "opnsense",
    "mattermost",
    "onlyoffice",
    "collabora",
    "postfix",
    "dovecot",
    "redis",
    "sqlite",
    "opensearch",
)

US_VENDORS = (
    "microsoft",
    "oracle",
    "vmware",
    "broadcom",
    "google",
    "amazon",
    "aws",
    "cisco",
    "citrix",
    "ibm",
    "salesforce",
    "netapp",
    "veeam",
    "dell",
    "hpe",
    "hewlett packard",
    "zoom",
    "adobe",
    "servicenow",
    "workday",
    "palo alto",
    "fortinet",
    "symantec",
    "mcafee",
    "medtronic",
    "ge healthcare",
    "cerner",
    "epic systems",
    "mckesson",
    "hyland",
    "intersystems",
    "docusign",
)

EU_VENDORS = (
    "softway",
    "technidata",
    "sectra",
    "elekta",
    "philips",
    "ovh",
    "ovhcloud",
    "scaleway",
    "numih",
    "linagora",
    "blue mind",
    "bluemind",
    "glpi",
    "teclib",
    "atos",
    "capgemini",
    "sopra steria",
    "thales",
    "docaposte",
    "maincare",
    "imago",
    "doctolib",
    "carl source",
    "sap",
)

STANDARD_TOKENS = (
    "fhir",
    "hl7",
    "dicom",
    "openapi",
    "swagger",
    "sql",
    "csv",
    "xml",
    "json",
    "export",
    "oauth",
    "saml",
)

CLOSED_TOKENS = ("format ferme", "sans export", "proprietaire ferme", "closed")

PROPRIETARY_TOKENS = (
    "microsoft",
    "oracle",
    "vmware",
    "broadcom",
    "google",
    "amazon",
    "aws",
    "cisco",
    "citrix",
    "ibm",
    "salesforce",
    "netapp",
    "veeam",
    "zoom",
    "adobe",
    "servicenow",
    "workday",
    "atlassian",
    "sap",
    "medtronic",
    "ge healthcare",
    "cerner",
    "epic systems",
    "mckesson",
    "hyland",
    "intersystems",
    "softway",
    "technidata",
    "sectra",
    "elekta",
    "philips",
    "maincare",
    "docaposte",
    "imago",
    "doctolib",
    "carl source",
    "hopital manager",
)

MERCATOR_ENDPOINTS: tuple[tuple[str, str], ...] = (
    ("applications", "/applications"),
    ("application-blocks", "/application-blocks"),
    ("databases", "/databases"),
    ("logical-servers", "/logical-servers"),
)

FORCED_INFRA_ENDPOINTS = frozenset({"databases", "logical-servers"})


class ImportMappingError(Exception):
    """Erreur de lecture ou de mapping d'un import."""


class MercatorError(ImportMappingError):
    """Erreur de connexion ou d'API Mercator."""


class MercatorAuthenticationError(MercatorError):
    """Authentification Mercator refusée."""


class MercatorConnectionError(MercatorError):
    """Mercator injoignable."""


class RowValidationError(ImportMappingError):
    """Ligne d'import invalide."""


@dataclass(frozen=True)
class ImportedBrick:
    name: str
    description: str
    editor: str
    technology: str
    app_type: str
    responsible: str
    establishment: str
    layer: str
    external: bool
    source: str
    status: str
    mercator_id: str | None
    security_need_a: int | None
    license_model: int
    jurisdiction: int
    interoperability: int
    operational_dependency: int
    business_criticality: int
    notes: str


@dataclass(frozen=True)
class RowError:
    row: int
    message: str


@dataclass
class ImportOutcome:
    bricks: list[ImportedBrick] = field(default_factory=list)
    errors: list[RowError] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    duplicates: int = 0
    total_received: int = 0


def _strip_accents(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(char)
    )


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", _strip_accents(value).casefold()).strip()


def normalize_name(value: str) -> str:
    return normalize_text(value)


def normalize_header(value: str) -> str:
    cleaned = normalize_text(value.replace("\ufeff", ""))
    return re.sub(r"[^a-z0-9]+", "_", cleaned).strip("_")


def dedupe_key(name: str, layer: str) -> tuple[str, str]:
    return normalize_name(name), layer


def _contains_keyword(haystack: str, keyword: str) -> bool:
    normalized = normalize_text(keyword)
    if not normalized:
        return False
    escaped = re.escape(normalized)
    if len(normalized) <= 4:
        pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
    else:
        pattern = rf"(?<![a-z0-9]){escaped}"
    return re.search(pattern, haystack) is not None


def _contains_any(haystack: str, keywords: tuple[str, ...]) -> bool:
    return any(_contains_keyword(haystack, keyword) for keyword in keywords)


def infer_layer(
    *,
    name: str = "",
    description: str = "",
    technology: str = "",
    app_type: str = "",
    editor: str = "",
    forced_layer: str | None = None,
) -> LayerKey:
    if forced_layer in LAYER_ORDER:
        return forced_layer  # type: ignore[return-value]
    haystack = normalize_text(
        " ".join(
            part
            for part in (name, description, technology, app_type, editor)
            if part
        )
    )
    if _contains_any(haystack, METIER_KEYWORDS):
        return "metier"
    if _contains_any(haystack, SUPPORTS_KEYWORDS):
        return "supports"
    if _contains_any(haystack, INFRA_KEYWORDS):
        return "infrastructure"
    return "supports"


def map_security_need(value: Any) -> tuple[int, str | None]:
    parsed = _as_int(value)
    if parsed not in {1, 2, 3, 4}:
        return 3, "Disponibilité Mercator absente ou invalide : criticité fixée à 3."
    return {1: 1, 2: 3, 3: 5, 4: 5}[parsed], None


def prescore_heuristic(
    *,
    name: str,
    description: str = "",
    technology: str = "",
    app_type: str = "",
    editor: str = "",
    responsible: str = "",
    external: bool = False,
    security_need_a: Any = None,
    warn_missing_availability: bool = True,
) -> tuple[dict[str, int], list[str], list[str]]:
    haystack = normalize_text(
        " ".join(
            part
            for part in (
                name,
                description,
                technology,
                app_type,
                editor,
                responsible,
            )
            if part
        )
    )
    is_foss = _contains_any(haystack, FOSS_TOKENS)
    is_us = _contains_any(haystack, US_VENDORS)
    is_eu = _contains_any(haystack, EU_VENDORS)
    is_proprietary = _contains_any(haystack, PROPRIETARY_TOKENS)
    has_standard = _contains_any(haystack, STANDARD_TOKENS)
    has_closed = _contains_any(haystack, CLOSED_TOKENS)

    notes: list[str] = []
    warnings: list[str] = []

    if external and is_proprietary:
        license_model = 5
        notes.append("licence 5 (SaaS externe propriétaire)")
    elif is_foss:
        license_model = 0
        notes.append("licence 0 (technologie libre connue)")
    elif is_proprietary:
        license_model = 4
        notes.append("licence 4 (éditeur propriétaire)")
    elif external:
        license_model = 5
        notes.append("licence 5 (service externe sans composant libre identifié)")
    else:
        license_model = 2
        notes.append("licence 2 (inconnue, à confirmer)")

    if is_us:
        jurisdiction = 5
        notes.append("juridiction 5 (éditeur soumis au CLOUD Act/FISA)")
    elif is_eu:
        jurisdiction = 0
        notes.append("juridiction 0 (éditeur France/UE)")
    elif is_foss:
        jurisdiction = 0
        notes.append("juridiction 0 (gouvernance communautaire, pas d'éditeur privateur)")
    else:
        jurisdiction = 2
        notes.append("juridiction 2 (inconnue, à confirmer)")

    if has_standard:
        interoperability = 0
        notes.append("interopérabilité 0 (standards ouverts identifiés)")
    elif has_closed:
        interoperability = 5
        notes.append("interopérabilité 5 (format fermé identifié)")
    else:
        interoperability = 3
        notes.append("interopérabilité 3 (à documenter)")

    if is_foss:
        operational_dependency = 0
        notes.append("MCO 0 (écosystème libre/communauté)")
    elif external or is_proprietary:
        operational_dependency = 5
        notes.append("MCO 5 (éditeur unique / SaaS)")
    else:
        operational_dependency = 3
        notes.append("MCO 3 (inconnu, à confirmer)")

    business_criticality, warning = map_security_need(security_need_a)
    if warning and warn_missing_availability:
        warnings.append(warning)
    notes.append(f"criticité {business_criticality} (grille 1/3/5)")

    return (
        {
            "license_model": license_model,
            "jurisdiction": jurisdiction,
            "interoperability": interoperability,
            "operational_dependency": operational_dependency,
            "business_criticality": business_criticality,
        },
        notes,
        warnings,
    )


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int | float):
        return str(value)
    if isinstance(value, list | tuple | set):
        return ", ".join(part for item in value if (part := _as_text(item)))
    if isinstance(value, dict):
        for key in ("name", "label", "value", "title", "text"):
            if key in value:
                return _as_text(value[key])
        return ", ".join(part for item in value.values() if (part := _as_text(item)))
    return str(value).strip()


def _as_int(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else None
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _as_bool(value: Any) -> bool | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        if value in {0, 1}:
            return bool(value)
        return None
    normalized = normalize_text(str(value))
    if normalized in {"true", "1", "oui", "yes", "o", "vrai", "v"}:
        return True
    if normalized in {"false", "0", "non", "no", "n", "faux", "f"}:
        return False
    return None


def _obj_value(obj: dict[str, Any], *names: str) -> Any:
    lowered = {str(key).casefold(): value for key, value in obj.items()}
    for name in names:
        if name.casefold() in lowered:
            return lowered[name.casefold()]
    return None


def _entry_to_brick(
    obj: dict[str, Any],
    *,
    endpoint: str,
    default_establishment: str,
    source: str = "mercator",
) -> tuple[ImportedBrick, list[str]]:
    name = _as_text(_obj_value(obj, "name", "label", "title"))
    if not name:
        raise RowValidationError("Objet Mercator sans nom.")
    description = _as_text(_obj_value(obj, "description", "notes"))
    technology = _as_text(_obj_value(obj, "technology", "technologies"))
    app_type = _as_text(_obj_value(obj, "type", "application_type"))
    responsible = _as_text(_obj_value(obj, "responsible", "owner"))
    editor = _as_text(
        _obj_value(obj, "vendor", "cpe_vendor", "cpeVendor", "cpe_product", "cpeProduct")
    )
    raw_external = _obj_value(obj, "external", "is_external", "isExternal")
    external = _as_bool(raw_external)
    if external is None:
        external = False
    security_need_raw = _obj_value(
        obj, "security_need_a", "securityNeedA", "security_need_availability"
    )
    security_need_a = _as_int(security_need_raw)
    if security_need_a not in {1, 2, 3, 4}:
        security_need_a = None
    mercator_id = _as_text(_obj_value(obj, "id"))
    forced_layer = "infrastructure" if endpoint in FORCED_INFRA_ENDPOINTS else None
    layer = infer_layer(
        name=name,
        description=description,
        technology=technology,
        app_type=app_type,
        editor=editor,
        forced_layer=forced_layer,
    )
    criteria, notes, warnings = prescore_heuristic(
        name=name,
        description=description,
        technology=technology,
        app_type=app_type,
        editor=editor,
        responsible=responsible,
        external=external,
        security_need_a=security_need_a,
    )
    note_text = "Pré-scoring heuristique (à valider) : " + " ; ".join(notes) + "."
    return (
        ImportedBrick(
            name=name,
            description=description,
            editor=editor,
            technology=technology,
            app_type=app_type,
            responsible=responsible,
            establishment=default_establishment,
            layer=layer,
            external=external,
            source=source,
            status="a_valider",
            mercator_id=mercator_id or None,
            security_need_a=security_need_a,
            license_model=criteria["license_model"],
            jurisdiction=criteria["jurisdiction"],
            interoperability=criteria["interoperability"],
            operational_dependency=criteria["operational_dependency"],
            business_criticality=criteria["business_criticality"],
            notes=note_text,
        ),
        warnings,
    )


def _normalized_record(record: dict[Any, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in record.items():
        if key is None:
            continue
        normalized[normalize_header(str(key))] = value
    return normalized


def _field(record: dict[str, Any], name: str) -> Any:
    for candidate in (name, *FIELD_ALIASES.get(name, ())):
        key = normalize_header(candidate)
        if key in record and record[key] not in (None, ""):
            return record[key]
    return None


def _parse_layer(value: Any) -> LayerKey:
    normalized = normalize_header(_as_text(value))
    if normalized in {"infrastructure", "infra", "couche1", "couche_1", "1"}:
        return "infrastructure"
    if normalized in {"supports", "support", "couche2", "couche_2", "2"}:
        return "supports"
    if normalized in {"metier", "couche3", "couche_3", "3"}:
        return "metier"
    raise RowValidationError(
        "Couche invalide : utiliser infrastructure/infra/couche1, "
        "supports/couche2 ou metier/couche3."
    )


def _parse_status(value: Any) -> str:
    if value in (None, ""):
        return "a_valider"
    normalized = normalize_header(_as_text(value))
    if normalized in {"a_valider", "a_valide", "todo"}:
        return "a_valider"
    if normalized in {"valide", "validee"}:
        return "valide"
    raise RowValidationError("Statut invalide : utiliser a_valider ou valide.")


def _parse_score(value: Any, field_name: str, *, business: bool = False) -> int:
    score = _as_int(value)
    if score is None:
        raise RowValidationError(f"{field_name} doit être un entier.")
    if business:
        if score not in {1, 3, 5}:
            raise RowValidationError(
                "business_criticality doit valoir 1, 3 ou 5 (valeurs 2 et 4 refusées)."
            )
        return score
    if not 0 <= score <= 5:
        raise RowValidationError(f"{field_name} doit être compris entre 0 et 5.")
    return score


def _generic_brick(
    raw_record: dict[Any, Any],
    *,
    source: GenericSource,
    default_establishment: str,
) -> tuple[ImportedBrick, list[str]]:
    record = _normalized_record(raw_record)
    name = _as_text(_field(record, "name"))
    if not name:
        raise RowValidationError("Le nom (name/nom) est obligatoire.")
    layer = _parse_layer(_field(record, "layer"))
    editor = _as_text(_field(record, "editor"))
    technology = _as_text(_field(record, "technology"))
    app_type = _as_text(_field(record, "app_type"))
    responsible = _as_text(_field(record, "responsible"))
    description = _as_text(_field(record, "description"))
    external_raw = _field(record, "external")
    external = _as_bool(external_raw)
    if external is None:
        if external_raw not in (None, ""):
            raise RowValidationError(
                "external doit valoir true/false, oui/non, 1/0 ou yes/no."
            )
        external = False
    establishment = _as_text(_field(record, "establishment")) or default_establishment
    status = _parse_status(_field(record, "status"))
    notes = _as_text(_field(record, "notes"))
    mercator_id = _as_text(_field(record, "mercator_id")) or None
    security_need_raw = _field(record, "security_need_a")
    security_need_a = _as_int(security_need_raw)
    if security_need_raw not in (None, "") and security_need_a not in {1, 2, 3, 4}:
        raise RowValidationError("security_need_a doit être un entier entre 1 et 4.")
    if security_need_a not in {1, 2, 3, 4}:
        security_need_a = None

    criteria, heuristic_notes, warnings = prescore_heuristic(
        name=name,
        description=description,
        technology=technology,
        app_type=app_type,
        editor=editor,
        responsible=responsible,
        external=external,
        security_need_a=security_need_a,
        warn_missing_availability=False,
    )
    heuristic_used = False
    parsed: dict[str, int] = {}
    for criterion in (
        "license_model",
        "jurisdiction",
        "interoperability",
        "operational_dependency",
    ):
        raw_value = _field(record, criterion)
        if raw_value in (None, ""):
            parsed[criterion] = criteria[criterion]
            heuristic_used = True
        else:
            parsed[criterion] = _parse_score(raw_value, criterion)
    criticality_raw = _field(record, "business_criticality")
    if criticality_raw in (None, ""):
        parsed["business_criticality"] = criteria["business_criticality"]
        heuristic_used = True
        warnings.append(
            f"{name} : criticité absente, valeur 3 appliquée (à valider)."
        )
    else:
        parsed["business_criticality"] = _parse_score(
            criticality_raw, "business_criticality", business=True
        )

    note_parts = [notes] if notes else []
    if heuristic_used:
        note_parts.append(
            "Pré-scoring heuristique appliqué aux critères non renseignés (à valider) : "
            + " ; ".join(heuristic_notes)
            + "."
        )
    return (
        ImportedBrick(
            name=name,
            description=description,
            editor=editor,
            technology=technology,
            app_type=app_type,
            responsible=responsible,
            establishment=establishment,
            layer=layer,
            external=external,
            source=source,
            status=status,
            mercator_id=mercator_id,
            security_need_a=security_need_a,
            license_model=parsed["license_model"],
            jurisdiction=parsed["jurisdiction"],
            interoperability=parsed["interoperability"],
            operational_dependency=parsed["operational_dependency"],
            business_criticality=parsed["business_criticality"],
            notes=" ".join(note_parts).strip(),
        ),
        warnings,
    )


def _append_unique(
    bricks: list[ImportedBrick],
    seen: set[tuple[str, str]],
) -> tuple[list[ImportedBrick], int]:
    unique: list[ImportedBrick] = []
    duplicates = 0
    for brick in bricks:
        key = dedupe_key(brick.name, brick.layer)
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        unique.append(brick)
    return unique, duplicates


def _detect_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,")
        return dialect.delimiter
    except csv.Error:
        return ";" if sample.count(";") >= sample.count(",") else ","


def _decode_text(content: bytes) -> str:
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ImportMappingError("Le fichier doit être encodé en UTF-8.") from exc


def prepare_csv_import(
    content: bytes,
    *,
    existing_keys: set[tuple[str, str]] | None = None,
    default_establishment: str = "Établissement support",
    max_rows: int = 5000,
) -> ImportOutcome:
    text = _decode_text(content)
    if not text.strip():
        raise ImportMappingError("Le fichier CSV est vide.")
    delimiter = _detect_delimiter(text[:8192])
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise ImportMappingError("En-tête CSV introuvable.")
    reader.fieldnames = [normalize_header(header or "") for header in reader.fieldnames]
    if "name" not in reader.fieldnames and "nom" not in reader.fieldnames:
        raise ImportMappingError("Colonne obligatoire manquante : name/nom.")

    outcome = ImportOutcome()
    seen = set(existing_keys or set())
    for row_number, row in enumerate(reader, start=2):
        if not any(value not in (None, "") for value in row.values()):
            continue
        outcome.total_received += 1
        if outcome.total_received > max_rows:
            raise ImportMappingError(
                f"Limite de {max_rows} lignes dépassée pour cet import."
            )
        try:
            brick, warnings = _generic_brick(
                row,
                source="csv",
                default_establishment=default_establishment,
            )
        except RowValidationError as exc:
            outcome.errors.append(RowError(row=row_number, message=str(exc)))
            continue
        outcome.warnings.extend(warnings)
        if dedupe_key(brick.name, brick.layer) in seen:
            outcome.duplicates += 1
            continue
        seen.add(dedupe_key(brick.name, brick.layer))
        outcome.bricks.append(brick)
    return outcome


def _looks_like_mercator_export(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    top_keys = {normalize_header(str(key)) for key in payload}
    if {"application_blocks", "databases", "logical_servers"} & top_keys:
        return True
    applications = payload.get("applications")
    if isinstance(applications, list) and applications and isinstance(applications[0], dict):
        sample_keys = {normalize_header(str(key)) for key in applications[0]}
        if {"security_need_a", "cpe_vendor", "cpe_product", "vendor"} & sample_keys:
            return True
    return False


def _export_items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict) and isinstance(value.get("data"), list):
        return [item for item in value["data"] if isinstance(item, dict)]
    return []


def _prepare_mercator_export(
    payload: dict[str, Any],
    *,
    existing_keys: set[tuple[str, str]] | None,
    default_establishment: str,
    max_rows: int,
) -> ImportOutcome:
    outcome = ImportOutcome()
    seen = set(existing_keys or set())
    resources = (
        ("applications", ("applications",)),
        ("application-blocks", ("application-blocks", "application_blocks")),
        ("databases", ("databases",)),
        ("logical-servers", ("logical-servers", "logical_servers")),
    )
    row_number = 0
    for endpoint, keys in resources:
        raw_items: list[dict[str, Any]] = []
        for key in keys:
            if key in payload:
                raw_items = _export_items(payload[key])
                break
        for item in raw_items:
            row_number += 1
            outcome.total_received += 1
            if outcome.total_received > max_rows:
                raise ImportMappingError(
                    f"Limite de {max_rows} objets dépassée pour cet import."
                )
            try:
                brick, warnings = _entry_to_brick(
                    item,
                    endpoint=endpoint,
                    default_establishment=default_establishment,
                )
            except RowValidationError as exc:
                outcome.errors.append(RowError(row=row_number, message=str(exc)))
                continue
            outcome.warnings.extend(warnings)
            key = dedupe_key(brick.name, brick.layer)
            if key in seen:
                outcome.duplicates += 1
                continue
            seen.add(key)
            outcome.bricks.append(brick)
    if outcome.total_received == 0:
        outcome.warnings.append(
            "Aucun objet Mercator reconnu dans le fichier (applications, "
            "application-blocks, databases, logical-servers)."
        )
    return outcome


def prepare_json_import(
    content: bytes,
    *,
    existing_keys: set[tuple[str, str]] | None = None,
    default_establishment: str = "Établissement support",
    max_rows: int = 5000,
    force_mercator: bool = False,
) -> ImportOutcome:
    text = _decode_text(content)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ImportMappingError("JSON invalide : vérifier la syntaxe du fichier.") from exc

    if force_mercator or _looks_like_mercator_export(payload):
        if not isinstance(payload, dict):
            raise ImportMappingError(
                "Un export Mercator JSON doit être un objet contenant les collections."
            )
        return _prepare_mercator_export(
            payload,
            existing_keys=existing_keys,
            default_establishment=default_establishment,
            max_rows=max_rows,
        )

    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        candidate = payload.get("applications")
        if candidate is None:
            candidate = payload.get("bricks")
        if candidate is None:
            candidate = payload.get("items")
        if not isinstance(candidate, list):
            raise ImportMappingError(
                "JSON générique attendu : tableau de briques ou objet "
                '{"applications": [...]}.'
            )
        records = candidate
    else:
        raise ImportMappingError("Structure JSON non reconnue.")

    outcome = ImportOutcome()
    seen = set(existing_keys or set())
    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            outcome.total_received += 1
            outcome.errors.append(
                RowError(row=index, message="Chaque brique doit être un objet JSON.")
            )
            continue
        outcome.total_received += 1
        if outcome.total_received > max_rows:
            raise ImportMappingError(
                f"Limite de {max_rows} objets dépassée pour cet import."
            )
        try:
            brick, warnings = _generic_brick(
                record,
                source="json",
                default_establishment=default_establishment,
            )
        except RowValidationError as exc:
            outcome.errors.append(RowError(row=index, message=str(exc)))
            continue
        outcome.warnings.extend(warnings)
        key = dedupe_key(brick.name, brick.layer)
        if key in seen:
            outcome.duplicates += 1
            continue
        seen.add(key)
        outcome.bricks.append(brick)
    return outcome


class MercatorClient:
    def __init__(
        self,
        *,
        base_url: str,
        token: str | None = None,
        username: str | None = None,
        password: str | None = None,
        verify_tls: bool = True,
        timeout_seconds: int = 20,
    ) -> None:
        self.base_url = self._validate_base_url(base_url)
        self.token = token
        self.username = username
        self.password = password
        self.client = httpx.Client(
            timeout=timeout_seconds,
            verify=verify_tls,
            follow_redirects=False,
            headers={
                "Accept": "application/json",
                "User-Agent": "SouverainOS/0.1 (import Mercator)",
            },
        )

    @staticmethod
    def _validate_base_url(base_url: str) -> str:
        cleaned = base_url.strip().rstrip("/")
        parsed = urlparse(cleaned)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise MercatorError("URL Mercator invalide (http/https attendu).")
        if parsed.username or parsed.password:
            raise MercatorError("Aucun identifiant ne doit figurer dans l'URL Mercator.")
        return cleaned

    def close(self) -> None:
        self.client.close()

    def __enter__(self) -> "MercatorClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _api_url(self, path: str) -> str:
        if self.base_url.casefold().endswith("/api"):
            return f"{self.base_url}{path}"
        return f"{self.base_url}/api{path}"

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        try:
            response = self.client.request(method, self._api_url(path), **kwargs)
        except httpx.RequestError as exc:
            raise MercatorConnectionError("Connexion à Mercator impossible.") from exc
        if response.status_code in {401, 403}:
            raise MercatorAuthenticationError("Authentification Mercator refusée.")
        if 300 <= response.status_code < 400:
            raise MercatorError(
                "Mercator a répondu par une redirection non suivie par sécurité."
            )
        if response.status_code >= 400:
            raise MercatorError(
                f"Mercator a répondu HTTP {response.status_code} sur {path}."
            )
        return response

    def authenticate(self) -> None:
        if self.token:
            self.client.headers["Authorization"] = f"Bearer {self.token}"
            return
        if not self.username or not self.password:
            raise MercatorAuthenticationError(
                "Identifiants Mercator manquants (login/mot de passe ou jeton)."
            )
        response = self._request(
            "POST",
            "/login",
            json={"login": self.username, "password": self.password},
        )
        try:
            payload = response.json()
        except ValueError as exc:
            raise MercatorError("Réponse de connexion Mercator illisible.") from exc
        token = self._extract_token(payload)
        if not token:
            raise MercatorAuthenticationError(
                "Aucun access_token retourné par Mercator."
            )
        self.token = token
        self.client.headers["Authorization"] = f"Bearer {token}"

    @staticmethod
    def _extract_token(payload: Any) -> str | None:
        if isinstance(payload, str):
            return payload or None
        if not isinstance(payload, dict):
            return None
        for key in ("access_token", "token"):
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value
        data = payload.get("data")
        if isinstance(data, dict):
            for key in ("access_token", "token"):
                value = data.get(key)
                if isinstance(value, str) and value:
                    return value
        return None

    def _fetch_paginated(self, path: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for page in range(1, 101):
            response = self._request(
                "GET",
                path,
                params={"page": page, "per_page": 200},
            )
            try:
                payload = response.json()
            except ValueError as exc:
                raise MercatorError(f"Réponse JSON invalide sur {path}.") from exc
            if isinstance(payload, list):
                results.extend(item for item in payload if isinstance(item, dict))
                return results
            if not isinstance(payload, dict):
                raise MercatorError(f"Structure de réponse inattendue sur {path}.")
            items = payload.get("data")
            if items is None and isinstance(payload.get("applications"), list):
                items = payload["applications"]
            if not isinstance(items, list):
                raise MercatorError(f"Collection absente dans la réponse {path}.")
            results.extend(item for item in items if isinstance(item, dict))
            if not items:
                return results
            meta = payload.get("meta")
            links = payload.get("links")
            last_page = None
            next_link = None
            if isinstance(meta, dict):
                last_page = _as_int(meta.get("last_page"))
            if isinstance(links, dict):
                next_link = links.get("next")
            if last_page is not None:
                if page >= last_page:
                    return results
            elif not next_link:
                return results
        raise MercatorError("Limite de sécurité de 100 pages atteinte pour un endpoint.")

    def fetch_catalog(
        self,
    ) -> tuple[dict[str, list[dict[str, Any]]], list[str]]:
        catalog: dict[str, list[dict[str, Any]]] = {}
        warnings: list[str] = []
        for endpoint, path in MERCATOR_ENDPOINTS:
            try:
                catalog[endpoint] = self._fetch_paginated(path)
            except MercatorAuthenticationError:
                raise
            except MercatorConnectionError:
                raise
            except MercatorError as exc:
                if "HTTP 404" in str(exc):
                    warnings.append(
                        f"Endpoint Mercator {path} indisponible (404), ignoré."
                    )
                    catalog[endpoint] = []
                    continue
                raise
        return catalog, warnings


def prepare_mercator_api_import(
    *,
    base_url: str,
    auth_mode: str,
    token: str | None,
    username: str | None,
    password: str | None,
    verify_tls: bool,
    timeout_seconds: int,
    existing_keys: set[tuple[str, str]] | None = None,
    default_establishment: str = "Établissement support",
    max_rows: int = 5000,
) -> ImportOutcome:
    if auth_mode == "token" and not token:
        raise MercatorAuthenticationError("Jeton Bearer Mercator manquant.")
    if auth_mode == "password" and not (username and password):
        raise MercatorAuthenticationError("Identifiant et mot de passe Mercator manquants.")

    with MercatorClient(
        base_url=base_url,
        token=token if auth_mode == "token" else None,
        username=username if auth_mode == "password" else None,
        password=password if auth_mode == "password" else None,
        verify_tls=verify_tls,
        timeout_seconds=timeout_seconds,
    ) as client:
        client.authenticate()
        catalog, warnings = client.fetch_catalog()

    outcome = ImportOutcome(warnings=list(warnings))
    if not verify_tls:
        outcome.warnings.append(
            "Vérification TLS Mercator désactivée : à réserver à un CA interne maîtrisé."
        )
    seen = set(existing_keys or set())
    row_number = 0
    for endpoint, _path in MERCATOR_ENDPOINTS:
        for item in catalog.get(endpoint, []):
            row_number += 1
            outcome.total_received += 1
            if outcome.total_received > max_rows:
                raise ImportMappingError(
                    f"Limite de {max_rows} objets dépassée pour cet import."
                )
            try:
                brick, item_warnings = _entry_to_brick(
                    item,
                    endpoint=endpoint,
                    default_establishment=default_establishment,
                )
            except RowValidationError as exc:
                outcome.errors.append(RowError(row=row_number, message=str(exc)))
                continue
            outcome.warnings.extend(item_warnings)
            key = dedupe_key(brick.name, brick.layer)
            if key in seen:
                outcome.duplicates += 1
                continue
            seen.add(key)
            outcome.bricks.append(brick)
    if outcome.total_received == 0:
        outcome.warnings.append("Aucun objet retourné par l'API Mercator.")
    return outcome


def build_csv_template() -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(CSV_TEMPLATE_COLUMNS)
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")
