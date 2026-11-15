from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import select

from app.api.deps import (
    SessionDep,
    assert_audit_readable,
    assert_audit_writable,
    get_audit_or_404,
    get_optional_user,
    require_admin_write,
    require_writer,
)
from app.models.audit import ApplicationBrick, Audit
from app.models.base import utcnow
from app.models.user import User
from app.schemas.audit import AuditCreate, AuditListItem, AuditRead, AuditUpdate
from app.schemas.scoring import DashboardRead, ScoreReportRead
from app.services.audit_log import record_audit_log
from app.services.scoring import LAYER_ORDER, compute_score_report

router = APIRouter(prefix="/audits", tags=["Audits"])


def _clean_establishments(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    for value in values:
        item = value.strip()
        if item and item not in cleaned:
            cleaned.append(item)
    return cleaned


def _load_bricks(session: SessionDep, audit_id: int) -> list[ApplicationBrick]:
    return list(
        session.exec(
            select(ApplicationBrick)
            .where(ApplicationBrick.audit_id == audit_id)
            .order_by(ApplicationBrick.name)
        ).all()
    )


def _audit_with_score(audit: Audit, bricks: list[ApplicationBrick]) -> AuditListItem:
    report = compute_score_report(bricks)
    item = AuditListItem.model_validate(audit)
    item.application_count = len(bricks)
    item.global_score = report.global_score
    item.classification = report.classification.label
    item.classification_color = report.classification.color
    item.evaluated = report.evaluated
    return item


@router.get("", response_model=list[AuditListItem])
def list_audits(
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
) -> list[AuditListItem]:
    statement = select(Audit).order_by(Audit.is_demo.desc(), Audit.updated_at.desc())
    if user is None:
        statement = statement.where(Audit.is_demo.is_(True))
    audits = list(session.exec(statement).all())
    if not audits:
        return []

    audit_ids = [audit.id for audit in audits if audit.id is not None]
    bricks = list(
        session.exec(
            select(ApplicationBrick).where(ApplicationBrick.audit_id.in_(audit_ids))
        ).all()
    )
    grouped: dict[int, list[ApplicationBrick]] = {audit_id: [] for audit_id in audit_ids}
    for brick in bricks:
        grouped.setdefault(brick.audit_id, []).append(brick)
    return [_audit_with_score(audit, grouped.get(audit.id or 0, [])) for audit in audits]


@router.get("/{audit_id}", response_model=AuditListItem)
def get_audit(
    audit_id: int,
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
) -> AuditListItem:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_readable(audit, user)
    return _audit_with_score(audit, _load_bricks(session, audit_id))


@router.post("", response_model=AuditRead, status_code=status.HTTP_201_CREATED)
def create_audit(
    payload: AuditCreate,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> AuditRead:
    audit = Audit(
        name=payload.name.strip(),
        description=payload.description.strip(),
        ght_name=payload.ght_name.strip(),
        establishments=_clean_establishments(payload.establishments),
        is_demo=False,
        created_by_id=user.id,
    )
    session.add(audit)
    session.commit()
    session.refresh(audit)
    record_audit_log(
        session,
        action="audit_create",
        request=request,
        user=user,
        target_type="audit",
        target_id=audit.id,
        detail={"name": audit.name, "ght_name": audit.ght_name},
    )
    return AuditRead.model_validate(audit)


@router.patch("/{audit_id}", response_model=AuditRead)
def update_audit(
    audit_id: int,
    payload: AuditUpdate,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> AuditRead:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_writable(audit, user)
    changes = payload.model_dump(exclude_unset=True)
    if "establishments" in changes and changes["establishments"] is not None:
        changes["establishments"] = _clean_establishments(changes["establishments"])
    changed_fields = [key for key, value in changes.items() if value is not None]
    for key, value in changes.items():
        if value is not None:
            setattr(audit, key, value)
    audit.updated_at = utcnow()
    session.add(audit)
    session.commit()
    session.refresh(audit)
    record_audit_log(
        session,
        action="audit_update",
        request=request,
        user=user,
        target_type="audit",
        target_id=audit.id,
        detail={"fields": changed_fields},
    )
    return AuditRead.model_validate(audit)


@router.delete("/{audit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audit(
    audit_id: int,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_admin_write),
) -> None:
    audit = get_audit_or_404(session, audit_id)
    if audit.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le jeu de démonstration ne peut pas être supprimé.",
        )
    name = audit.name
    bricks = _load_bricks(session, audit_id)
    for brick in bricks:
        session.delete(brick)
    session.delete(audit)
    session.commit()
    record_audit_log(
        session,
        action="audit_delete",
        request=request,
        user=user,
        target_type="audit",
        target_id=audit_id,
        detail={"name": name, "deleted_bricks": len(bricks)},
    )


@router.get("/{audit_id}/score", response_model=ScoreReportRead)
def get_audit_score(
    audit_id: int,
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
) -> ScoreReportRead:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_readable(audit, user)
    report = compute_score_report(_load_bricks(session, audit_id))
    return ScoreReportRead.model_validate(asdict(report))


@router.get("/{audit_id}/dashboard", response_model=DashboardRead)
def get_audit_dashboard(
    audit_id: int,
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
) -> DashboardRead:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_readable(audit, user)
    bricks = _load_bricks(session, audit_id)
    report = compute_score_report(bricks)

    status_counts = {"a_valider": 0, "valide": 0}
    layer_counts = dict.fromkeys(LAYER_ORDER, 0)
    establishment_counts: dict[str, int] = {}
    for brick in bricks:
        status_counts[brick.status] = status_counts.get(brick.status, 0) + 1
        layer_counts[brick.layer] = layer_counts.get(brick.layer, 0) + 1
        establishment_counts[brick.establishment] = (
            establishment_counts.get(brick.establishment, 0) + 1
        )

    return DashboardRead(
        audit_id=audit_id,
        score=ScoreReportRead.model_validate(asdict(report)),
        total_applications=len(bricks),
        external_count=sum(1 for brick in bricks if brick.external),
        status_counts=status_counts,
        layer_counts=layer_counts,
        establishment_counts=establishment_counts,
    )
