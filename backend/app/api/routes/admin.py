from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import (
    SessionDep,
    require_admin_read,
    require_admin_write,
)
from app.core.security import hash_password
from app.models.audit import AuditLog
from app.models.base import utcnow
from app.models.user import User
from app.schemas.auth import UserCreate, UserRead, UserUpdate
from app.schemas.logs import AuditLogPage, AuditLogRead
from app.services.audit_log import record_audit_log
from app.services.auth import create_local_user

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/users", response_model=list[UserRead])
def list_users(
    session: SessionDep,
    _admin: User = Depends(require_admin_read),
) -> list[UserRead]:
    users = session.exec(select(User).order_by(User.username)).all()
    return [UserRead.model_validate(user) for user in users]


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    session: SessionDep,
    admin: User = Depends(require_admin_write),
) -> UserRead:
    try:
        user = create_local_user(
            session,
            username=payload.username,
            password=payload.password,
            role=payload.role,
            email=str(payload.email) if payload.email else None,
            full_name=payload.full_name,
        )
    except ValueError as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    session.commit()
    session.refresh(user)
    record_audit_log(
        session,
        action="user_create",
        request=request,
        user=admin,
        target_type="user",
        target_id=user.id,
        detail={
            "username": user.username,
            "role": user.role,
            "auth_source": user.auth_source,
        },
    )
    return UserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    session: SessionDep,
    admin: User = Depends(require_admin_write),
) -> UserRead:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )
    changes = payload.model_dump(exclude_unset=True)
    password = changes.pop("password", None)

    if user.id == admin.id and changes.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas désactiver votre propre compte.",
        )
    if (
        user.id == admin.id
        and changes.get("role") is not None
        and changes["role"] != "admin_ght"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas retirer votre propre rôle admin_ght.",
        )
    if password and user.auth_source != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un mot de passe local ne peut être défini que sur un compte local.",
        )

    changed_fields = list(changes)
    if password:
        user.hashed_password = hash_password(password)
        changed_fields.append("password")
    for key, value in changes.items():
        setattr(user, key, str(value) if key == "email" and value is not None else value)
    user.updated_at = utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    record_audit_log(
        session,
        action="user_update",
        request=request,
        user=admin,
        target_type="user",
        target_id=user.id,
        detail={"username": user.username, "fields": changed_fields},
    )
    return UserRead.model_validate(user)


@router.get("/logs", response_model=AuditLogPage)
def list_audit_logs(
    session: SessionDep,
    _admin: User = Depends(require_admin_read),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None, max_length=64),
    username: str | None = Query(default=None, max_length=100),
) -> AuditLogPage:
    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if username:
        conditions.append(func.lower(AuditLog.username) == username.casefold())

    count_statement = select(func.count()).select_from(AuditLog)
    statement = select(AuditLog)
    for condition in conditions:
        count_statement = count_statement.where(condition)
        statement = statement.where(condition)
    total = session.exec(count_statement).one()
    items = session.exec(
        statement.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return AuditLogPage(
        items=[AuditLogRead.model_validate(item) for item in items],
        total=int(total),
        limit=limit,
        offset=offset,
    )
