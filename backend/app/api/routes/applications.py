from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.api.deps import (
    SessionDep,
    assert_audit_readable,
    assert_audit_writable,
    get_audit_or_404,
    get_optional_user,
    require_writer,
)
from app.models.audit import ApplicationBrick, Audit
from app.models.base import utcnow
from app.models.user import User
from app.schemas.audit import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.schemas.common import BrickStatus, Layer
from app.services.audit_log import record_audit_log
from app.services.scoring import application_score

router = APIRouter(tags=["Cartographie"])


def _register_establishment(audit: Audit, establishment: str) -> None:
    if establishment and establishment not in audit.establishments:
        audit.establishments = [*audit.establishments, establishment]
    audit.updated_at = utcnow()


def _to_read(brick: ApplicationBrick) -> ApplicationRead:
    item = ApplicationRead.model_validate(brick)
    item.unit_score = application_score(brick)
    return item


def _get_brick(session: Session, brick_id: int) -> tuple[ApplicationBrick, Audit]:
    brick = session.get(ApplicationBrick, brick_id)
    if brick is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brique applicative introuvable.",
        )
    audit = get_audit_or_404(session, brick.audit_id)
    return brick, audit


@router.get("/audits/{audit_id}/applications", response_model=list[ApplicationRead])
def list_applications(
    audit_id: int,
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
    layer: Layer | None = Query(default=None),
    brick_status: BrickStatus | None = Query(default=None, alias="status"),
    establishment: str | None = Query(default=None, max_length=200),
    search: str | None = Query(default=None, max_length=200),
) -> list[ApplicationRead]:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_readable(audit, user)
    statement = select(ApplicationBrick).where(ApplicationBrick.audit_id == audit_id)
    if layer is not None:
        statement = statement.where(ApplicationBrick.layer == layer)
    if brick_status is not None:
        statement = statement.where(ApplicationBrick.status == brick_status)
    if establishment:
        statement = statement.where(ApplicationBrick.establishment == establishment)
    if search and search.strip():
        statement = statement.where(
            ApplicationBrick.name.ilike(f"%{search.strip()}%")
        )
    statement = statement.order_by(ApplicationBrick.layer, ApplicationBrick.name)
    return [_to_read(brick) for brick in session.exec(statement).all()]


@router.post(
    "/audits/{audit_id}/applications",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    audit_id: int,
    payload: ApplicationCreate,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> ApplicationRead:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_writable(audit, user)
    duplicate = session.exec(
        select(ApplicationBrick).where(
            ApplicationBrick.audit_id == audit_id,
            func.lower(ApplicationBrick.name) == payload.name.strip().casefold(),
            ApplicationBrick.layer == payload.layer,
        )
    ).first()
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une brique de même nom et de même couche existe déjà dans cet audit.",
        )

    brick = ApplicationBrick(
        audit_id=audit_id,
        source="manuel",
        **payload.model_dump(exclude={"source"}),
    )
    brick.name = brick.name.strip()
    session.add(brick)
    _register_establishment(audit, brick.establishment)
    session.add(audit)
    session.commit()
    session.refresh(brick)
    record_audit_log(
        session,
        action="application_create",
        request=request,
        user=user,
        target_type="application",
        target_id=brick.id,
        detail={"audit_id": audit_id, "name": brick.name, "layer": brick.layer},
    )
    return _to_read(brick)


@router.patch("/applications/{brick_id}", response_model=ApplicationRead)
def update_application(
    brick_id: int,
    payload: ApplicationUpdate,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> ApplicationRead:
    brick, audit = _get_brick(session, brick_id)
    assert_audit_writable(audit, user)
    changes = payload.model_dump(exclude_unset=True)
    changed_fields = [key for key, value in changes.items() if value is not None]
    for key, value in changes.items():
        if value is not None:
            setattr(brick, key, value)
    brick.name = brick.name.strip()
    brick.updated_at = utcnow()
    session.add(brick)
    _register_establishment(audit, brick.establishment)
    session.add(audit)
    session.commit()
    session.refresh(brick)
    record_audit_log(
        session,
        action="application_update",
        request=request,
        user=user,
        target_type="application",
        target_id=brick.id,
        detail={"audit_id": audit.id, "fields": changed_fields},
    )
    return _to_read(brick)


@router.delete("/applications/{brick_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    brick_id: int,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> None:
    brick, audit = _get_brick(session, brick_id)
    assert_audit_writable(audit, user)
    name = brick.name
    audit_id = audit.id
    session.delete(brick)
    audit.updated_at = utcnow()
    session.add(audit)
    session.commit()
    record_audit_log(
        session,
        action="application_delete",
        request=request,
        user=user,
        target_type="application",
        target_id=brick_id,
        detail={"audit_id": audit_id, "name": name},
    )
