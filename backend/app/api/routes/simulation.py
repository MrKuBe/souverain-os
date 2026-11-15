from dataclasses import asdict
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from app.api.deps import (
    SessionDep,
    assert_audit_readable,
    get_audit_or_404,
    get_optional_user,
)
from app.models.audit import ApplicationBrick
from app.models.user import User
from app.schemas.scoring import (
    ScoreReportRead,
    SimulationChange,
    SimulationRequest,
    SimulationResponse,
)
from app.services.scoring import application_score, compute_score_report

router = APIRouter(tags=["Simulation"])

SOVEREIGN_TARGET = {
    "license_model": 0,
    "jurisdiction": 0,
    "interoperability": 0,
    "operational_dependency": 0,
}


@router.post("/audits/{audit_id}/simulate", response_model=SimulationResponse)
def simulate(
    audit_id: int,
    payload: SimulationRequest,
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
) -> SimulationResponse:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_readable(audit, user)
    bricks = list(
        session.exec(
            select(ApplicationBrick)
            .where(ApplicationBrick.audit_id == audit_id)
            .order_by(ApplicationBrick.name)
        ).all()
    )

    bricks_by_id = {brick.id: brick for brick in bricks}
    swaps_by_id: dict[int, object] = {}
    for swap in payload.swaps:
        if swap.application_id in swaps_by_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Brique {swap.application_id} présente plusieurs fois dans la simulation.",
            )
        if swap.application_id not in bricks_by_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Brique {swap.application_id} absente de cet audit.",
            )
        swaps_by_id[swap.application_id] = swap

    before_report = compute_score_report(bricks)
    simulated = []
    changes: list[SimulationChange] = []
    for brick in bricks:
        swap = swaps_by_id.get(brick.id or 0)
        if swap is None:
            simulated.append(brick)
            continue
        target = {
            **SOVEREIGN_TARGET,
            **{
                key: value
                for key, value in {
                    "license_model": swap.license_model,
                    "jurisdiction": swap.jurisdiction,
                    "interoperability": swap.interoperability,
                    "operational_dependency": swap.operational_dependency,
                }.items()
                if value is not None
            },
        }
        simulated_brick = SimpleNamespace(
            id=brick.id,
            name=brick.name,
            establishment=brick.establishment,
            layer=brick.layer,
            license_model=target["license_model"],
            jurisdiction=target["jurisdiction"],
            interoperability=target["interoperability"],
            operational_dependency=target["operational_dependency"],
            business_criticality=brick.business_criticality,
        )
        simulated.append(simulated_brick)
        changes.append(
            SimulationChange(
                application_id=brick.id,
                name=brick.name,
                alternative_name=swap.alternative_name,
                before_score=application_score(brick),
                after_score=application_score(simulated_brick),
                delta=round(
                    application_score(simulated_brick) - application_score(brick),
                    2,
                ),
            )
        )

    after_report = compute_score_report(simulated)
    return SimulationResponse(
        audit_id=audit_id,
        before=ScoreReportRead.model_validate(asdict(before_report)),
        after=ScoreReportRead.model_validate(asdict(after_report)),
        delta=round(after_report.global_score - before_report.global_score, 2),
        changes=changes,
    )
