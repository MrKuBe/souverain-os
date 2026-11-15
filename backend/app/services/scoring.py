"""Formule officielle du score de dépendance SouverainOS.

Source de vérité unique : toute modification doit être répercutée dans AGENTS.md
et dans backend/tests/test_scoring.py.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

LayerKey = Literal["infrastructure", "supports", "metier"]

LAYER_ORDER: tuple[LayerKey, ...] = ("infrastructure", "supports", "metier")

LAYER_WEIGHTS: dict[LayerKey, float] = {
    "infrastructure": 0.25,
    "supports": 0.30,
    "metier": 0.45,
}

LAYER_LABELS: dict[LayerKey, str] = {
    "infrastructure": "Infrastructure & Middleware",
    "supports": "Logiciels Supports & Transverses",
    "metier": "Logiciels Métier Hospitaliers",
}

CRITERIA = (
    ("license_model", "Licence & code"),
    ("jurisdiction", "Juridiction & gouvernance"),
    ("interoperability", "Interopérabilité & réversibilité"),
    ("operational_dependency", "Dépendance opérationnelle & MCO"),
    ("business_criticality", "Criticité métier"),
)

RISK_PRIORITY = (
    ("jurisdiction", "Juridiction & gouvernance"),
    ("license_model", "Licence & code"),
    ("operational_dependency", "Dépendance opérationnelle & MCO"),
    ("interoperability", "Interopérabilité & réversibilité"),
)

CRITICALITY_FACTORS: dict[int, float] = {1: 0.6, 3: 0.8, 5: 1.0}


class ScorableApplication(Protocol):
    id: int | None
    name: str
    establishment: str
    layer: str
    license_model: int
    jurisdiction: int
    interoperability: int
    operational_dependency: int
    business_criticality: int


@dataclass(frozen=True)
class Classification:
    label: str
    color: str
    level: str


@dataclass(frozen=True)
class LayerScore:
    key: str
    label: str
    weight: float
    effective_weight: float
    score: float | None
    count: int
    classification: Classification | None


@dataclass(frozen=True)
class AxisScore:
    key: str
    label: str
    score: float


@dataclass(frozen=True)
class PrimaryRisk:
    key: str
    label: str
    value: int


@dataclass(frozen=True)
class Vulnerability:
    application_id: int | None
    name: str
    layer: str
    layer_label: str
    establishment: str
    score: float
    business_criticality: int
    primary_risk: PrimaryRisk


@dataclass(frozen=True)
class ScoreReport:
    global_score: float
    classification: Classification
    evaluated: bool
    layers: tuple[LayerScore, ...]
    axes: tuple[AxisScore, ...]
    top_vulnerabilities: tuple[Vulnerability, ...]
    application_count: int


EMPTY_CLASSIFICATION = Classification(
    label="Non évalué",
    color="gray",
    level="non_evalue",
)


def classify(score: float) -> Classification:
    if score <= 25:
        return Classification(
            label="Souveraineté maîtrisée",
            color="green",
            level="maitrisee",
        )
    if score <= 50:
        return Classification(
            label="Dépendance modérée / Hybride",
            color="blue",
            level="moderee",
        )
    if score <= 75:
        return Classification(
            label="Dépendance élevée",
            color="orange",
            level="elevee",
        )
    return Classification(
        label="Verrouillage critique / Risque systémique",
        color="red",
        level="critique",
    )


def _validate_criteria(
    license_model: int,
    jurisdiction: int,
    interoperability: int,
    operational_dependency: int,
    business_criticality: int,
) -> None:
    for name, value in (
        ("license_model", license_model),
        ("jurisdiction", jurisdiction),
        ("interoperability", interoperability),
        ("operational_dependency", operational_dependency),
    ):
        if not isinstance(value, int) or not 0 <= value <= 5:
            raise ValueError(f"{name} doit être un entier entre 0 et 5.")
    if business_criticality not in CRITICALITY_FACTORS:
        raise ValueError("business_criticality doit valoir 1, 3 ou 5.")


def compute_application_score(
    *,
    license_model: int,
    jurisdiction: int,
    interoperability: int,
    operational_dependency: int,
    business_criticality: int,
) -> float:
    _validate_criteria(
        license_model,
        jurisdiction,
        interoperability,
        operational_dependency,
        business_criticality,
    )
    base = (
        license_model
        + jurisdiction
        + interoperability
        + operational_dependency
    ) / 4
    factor = 0.5 + 0.5 * (business_criticality / 5)
    return round((base / 5) * factor * 100, 2)


def application_score(application: ScorableApplication) -> float:
    return compute_application_score(
        license_model=application.license_model,
        jurisdiction=application.jurisdiction,
        interoperability=application.interoperability,
        operational_dependency=application.operational_dependency,
        business_criticality=application.business_criticality,
    )


def compute_layer_score(applications: Sequence[ScorableApplication]) -> float | None:
    if not applications:
        return None
    total_weight = sum(application.business_criticality for application in applications)
    if total_weight == 0:
        return None
    weighted_sum = sum(
        application_score(application) * application.business_criticality
        for application in applications
    )
    return round(weighted_sum / total_weight, 2)


def compute_axes(applications: Sequence[ScorableApplication]) -> tuple[AxisScore, ...]:
    axes: list[AxisScore] = []
    for key, label in CRITERIA:
        if not applications:
            average = 0.0
        elif key == "business_criticality":
            average = sum(
                application.business_criticality for application in applications
            ) / len(applications)
        else:
            average = sum(getattr(application, key) for application in applications) / len(
                applications
            )
        axes.append(AxisScore(key=key, label=label, score=round(average / 5 * 100, 2)))
    return tuple(axes)


def _primary_risk(application: ScorableApplication) -> PrimaryRisk:
    chosen_key, chosen_label = RISK_PRIORITY[0]
    chosen_value = getattr(application, chosen_key)
    for key, label in RISK_PRIORITY[1:]:
        value = getattr(application, key)
        if value > chosen_value:
            chosen_key, chosen_label, chosen_value = key, label, value
    return PrimaryRisk(key=chosen_key, label=chosen_label, value=chosen_value)


def compute_vulnerabilities(
    applications: Sequence[ScorableApplication],
    limit: int = 5,
) -> tuple[Vulnerability, ...]:
    ranked = sorted(
        applications,
        key=lambda application: (
            -application_score(application),
            -application.business_criticality,
            application.name.casefold(),
        ),
    )[:limit]
    return tuple(
        Vulnerability(
            application_id=getattr(application, "id", None),
            name=application.name,
            layer=application.layer,
            layer_label=LAYER_LABELS.get(application.layer, application.layer),
            establishment=application.establishment,
            score=application_score(application),
            business_criticality=application.business_criticality,
            primary_risk=_primary_risk(application),
        )
        for application in ranked
    )


def compute_score_report(applications: Sequence[ScorableApplication]) -> ScoreReport:
    evaluated = bool(applications)
    by_layer: dict[LayerKey, list[ScorableApplication]] = {
        layer: [] for layer in LAYER_ORDER
    }
    for application in applications:
        if application.layer not in by_layer:
            raise ValueError(f"Couche inconnue : {application.layer}")
        by_layer[application.layer].append(application)

    active_layers = [layer for layer in LAYER_ORDER if by_layer[layer]]
    active_weight = sum(LAYER_WEIGHTS[layer] for layer in active_layers)

    layers: list[LayerScore] = []
    global_score = 0.0
    for layer in LAYER_ORDER:
        apps = by_layer[layer]
        score = compute_layer_score(apps)
        effective_weight = (
            LAYER_WEIGHTS[layer] / active_weight
            if active_weight and layer in active_layers
            else 0.0
        )
        if score is not None:
            global_score += effective_weight * score
        layers.append(
            LayerScore(
                key=layer,
                label=LAYER_LABELS[layer],
                weight=LAYER_WEIGHTS[layer],
                effective_weight=round(effective_weight, 4),
                score=score,
                count=len(apps),
                classification=classify(score) if score is not None else None,
            )
        )

    final_score = round(global_score, 2) if evaluated else 0.0
    return ScoreReport(
        global_score=final_score,
        classification=classify(final_score) if evaluated else EMPTY_CLASSIFICATION,
        evaluated=evaluated,
        layers=tuple(layers),
        axes=compute_axes(applications),
        top_vulnerabilities=compute_vulnerabilities(applications),
        application_count=len(applications),
    )
