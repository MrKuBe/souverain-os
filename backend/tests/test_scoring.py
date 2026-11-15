from types import SimpleNamespace

import pytest

from app.services.scoring import (
    LAYER_WEIGHTS,
    application_score,
    classify,
    compute_application_score,
    compute_layer_score,
    compute_score_report,
    compute_vulnerabilities,
)


def brick(
    name: str,
    layer: str,
    *,
    c1: int,
    c2: int,
    c3: int,
    c4: int,
    c5: int,
    establishment: str = "CHU Support",
    brick_id: int | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=brick_id,
        name=name,
        establishment=establishment,
        layer=layer,
        license_model=c1,
        jurisdiction=c2,
        interoperability=c3,
        operational_dependency=c4,
        business_criticality=c5,
    )


def test_unit_score_formula_vital_application() -> None:
    assert (
        compute_application_score(
            license_model=5,
            jurisdiction=5,
            interoperability=5,
            operational_dependency=5,
            business_criticality=5,
        )
        == 100.0
    )


def test_unit_score_formula_low_criticality() -> None:
    assert (
        compute_application_score(
            license_model=5,
            jurisdiction=5,
            interoperability=5,
            operational_dependency=5,
            business_criticality=1,
        )
        == 60.0
    )


def test_unit_score_zero_dependency() -> None:
    assert (
        compute_application_score(
            license_model=0,
            jurisdiction=0,
            interoperability=0,
            operational_dependency=0,
            business_criticality=5,
        )
        == 0.0
    )


def test_unit_score_intermediate_values() -> None:
    assert (
        compute_application_score(
            license_model=4,
            jurisdiction=5,
            interoperability=3,
            operational_dependency=5,
            business_criticality=5,
        )
        == 85.0
    )
    assert (
        compute_application_score(
            license_model=2,
            jurisdiction=2,
            interoperability=3,
            operational_dependency=3,
            business_criticality=3,
        )
        == 40.0
    )


@pytest.mark.parametrize(
    ("c1", "c2", "c3", "c4", "c5"),
    [(-1, 0, 0, 0, 3), (6, 0, 0, 0, 3), (0, 0, 0, 0, 2), (0, 0, 0, 0, 4)],
)
def test_invalid_criteria_rejected(c1: int, c2: int, c3: int, c4: int, c5: int) -> None:
    with pytest.raises(ValueError):
        compute_application_score(
            license_model=c1,
            jurisdiction=c2,
            interoperability=c3,
            operational_dependency=c4,
            business_criticality=c5,
        )


def test_classification_thresholds() -> None:
    assert classify(0).level == "maitrisee"
    assert classify(25).level == "maitrisee"
    assert classify(25.01).level == "moderee"
    assert classify(50).level == "moderee"
    assert classify(50.01).level == "elevee"
    assert classify(75).level == "elevee"
    assert classify(75.01).level == "critique"
    assert classify(100).color == "red"


def test_layer_score_is_criticality_weighted() -> None:
    applications = [
        brick("A", "supports", c1=1, c2=1, c3=1, c4=1, c5=5),
        brick("B", "supports", c1=5, c2=5, c3=5, c4=5, c5=1),
    ]
    expected = (20.0 * 5 + 60.0 * 1) / 6
    assert compute_layer_score(applications) == round(expected, 2)


def test_global_score_and_layers() -> None:
    applications = [
        brick("Infra", "infrastructure", c1=1, c2=1, c3=1, c4=1, c5=5),
        brick("Support", "supports", c1=3, c2=3, c3=3, c4=3, c5=3),
        brick("Metier", "metier", c1=5, c2=5, c3=5, c4=5, c5=5),
    ]
    report = compute_score_report(applications)
    assert [layer.key for layer in report.layers] == [
        "infrastructure",
        "supports",
        "metier",
    ]
    assert [layer.score for layer in report.layers] == [20.0, 48.0, 100.0]
    assert report.global_score == 64.4
    assert report.classification.level == "elevee"
    assert report.evaluated is True
    assert report.application_count == 3
    assert report.axes[0].score == 60.0
    assert report.axes[4].score == 86.67
    assert LAYER_WEIGHTS == {
        "infrastructure": 0.25,
        "supports": 0.30,
        "metier": 0.45,
    }


def test_empty_layers_are_renormalized() -> None:
    applications = [
        brick("Support", "supports", c1=3, c2=3, c3=3, c4=3, c5=3),
        brick("Metier", "metier", c1=5, c2=5, c3=5, c4=5, c5=5),
    ]
    report = compute_score_report(applications)
    infra = next(layer for layer in report.layers if layer.key == "infrastructure")
    assert infra.score is None
    assert infra.count == 0
    assert infra.effective_weight == 0.0
    assert report.global_score == round(0.30 / 0.75 * 48 + 0.45 / 0.75 * 100, 2)


def test_empty_audit() -> None:
    report = compute_score_report([])
    assert report.evaluated is False
    assert report.global_score == 0.0
    assert report.classification.label == "Non évalué"
    assert report.application_count == 0
    assert report.top_vulnerabilities == ()
    assert all(layer.score is None for layer in report.layers)
    assert all(axis.score == 0.0 for axis in report.axes)


def test_application_score_helper_matches_formula() -> None:
    item = brick("Test", "metier", c1=2, c2=3, c3=4, c4=1, c5=3)
    assert application_score(item) == compute_application_score(
        license_model=2,
        jurisdiction=3,
        interoperability=4,
        operational_dependency=1,
        business_criticality=3,
    )


def test_top_vulnerabilities_sorting_and_primary_risk() -> None:
    applications = [
        brick("Alpha", "metier", c1=5, c2=0, c3=5, c4=0, c5=5, brick_id=1),
        brick("Bravo", "metier", c1=5, c2=5, c3=5, c4=5, c5=5, brick_id=2),
        brick("Charlie", "supports", c1=0, c2=0, c3=0, c4=0, c5=1, brick_id=3),
    ]
    vulnerabilities = compute_vulnerabilities(applications)
    assert [item.name for item in vulnerabilities] == ["Bravo", "Alpha", "Charlie"]
    assert vulnerabilities[0].primary_risk.key == "jurisdiction"
    assert vulnerabilities[1].primary_risk.key == "license_model"


def test_top_vulnerabilities_limited_to_five() -> None:
    applications = [
        brick(f"App {index}", "supports", c1=3, c2=3, c3=3, c4=3, c5=3)
        for index in range(8)
    ]
    assert len(compute_vulnerabilities(applications)) == 5
