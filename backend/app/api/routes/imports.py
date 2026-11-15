from dataclasses import asdict
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlmodel import Session, select

from app.api.deps import (
    SessionDep,
    assert_audit_writable,
    get_audit_or_404,
    get_current_user,
    require_writer,
    require_writer_read,
)
from app.core.config import get_settings
from app.core.security import (
    SecretDecryptionError,
    decrypt_secret,
    encrypt_secret,
)
from app.models.audit import ApplicationBrick, Audit, MercatorConfig
from app.models.base import utcnow
from app.models.user import User
from app.schemas.imports import (
    ImportFormat,
    ImportReport,
    ImportRowError,
    MercatorConfigCreate,
    MercatorConfigRead,
    MercatorImportRequest,
)
from app.services.audit_log import record_audit_log
from app.services.importers import (
    ImportMappingError,
    ImportOutcome,
    MercatorAuthenticationError,
    MercatorConnectionError,
    build_csv_template,
    dedupe_key,
    prepare_csv_import,
    prepare_json_import,
    prepare_mercator_api_import,
)
from app.services.scoring import LAYER_ORDER

router = APIRouter(prefix="/import", tags=["Import & Interopérabilité"])
settings = get_settings()


def _existing_keys(session: Session, audit_id: int) -> set[tuple[str, str]]:
    bricks = session.exec(
        select(ApplicationBrick).where(ApplicationBrick.audit_id == audit_id)
    ).all()
    return {dedupe_key(brick.name, brick.layer) for brick in bricks}


def _persist_outcome(
    session: Session,
    audit: Audit,
    outcome: ImportOutcome,
) -> list[int]:
    created: list[ApplicationBrick] = []
    establishments = list(audit.establishments)
    for imported in outcome.bricks:
        brick = ApplicationBrick(audit_id=audit.id, **asdict(imported))
        session.add(brick)
        created.append(brick)
        if brick.establishment and brick.establishment not in establishments:
            establishments.append(brick.establishment)
    if created:
        audit.establishments = establishments
        audit.updated_at = utcnow()
        session.add(audit)
        session.flush()
        ids = [brick.id or 0 for brick in created]
        session.commit()
        return ids
    return []


def _build_report(
    *,
    audit_id: int,
    source: str,
    outcome: ImportOutcome,
    imported_ids: list[int],
    filename: str | None = None,
) -> ImportReport:
    by_layer = dict.fromkeys(LAYER_ORDER, 0)
    for brick in outcome.bricks:
        by_layer[brick.layer] = by_layer.get(brick.layer, 0) + 1
    return ImportReport(
        audit_id=audit_id,
        source=source,
        imported=len(outcome.bricks),
        duplicates=outcome.duplicates,
        invalid=len(outcome.errors),
        total_received=outcome.total_received,
        by_layer=by_layer,
        warnings=list(dict.fromkeys(outcome.warnings)),
        errors=[
            ImportRowError(row=error.row, message=error.message)
            for error in outcome.errors
        ],
        imported_ids=imported_ids,
        filename=filename,
    )


def _config_read(config: MercatorConfig) -> MercatorConfigRead:
    item = MercatorConfigRead.model_validate(config)
    item.has_token = bool(config.encrypted_token)
    item.has_password = bool(config.encrypted_password)
    return item


def _save_config(
    session: Session,
    *,
    user: User,
    name: str,
    base_url: str,
    auth_mode: str,
    username: str | None,
    token: str | None,
    password: str | None,
    verify_tls: bool,
) -> MercatorConfig:
    config = MercatorConfig(
        name=name.strip()[:200],
        base_url=base_url,
        auth_mode=auth_mode,
        username=username,
        encrypted_token=encrypt_secret(token) if token else None,
        encrypted_password=encrypt_secret(password) if password else None,
        verify_tls=verify_tls,
        created_by_id=user.id,
    )
    session.add(config)
    session.flush()
    return config


def _resolve_mercator(
    session: Session,
    payload: MercatorImportRequest,
) -> dict[str, object]:
    config: MercatorConfig | None = None
    if payload.config_id is not None:
        config = session.get(MercatorConfig, payload.config_id)
        if config is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuration Mercator introuvable.",
            )
        if payload.save_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible d'enregistrer une configuration en réutilisant une existante.",
            )

    base_url = payload.base_url or (config.base_url if config else None)
    auth_mode = payload.auth_mode or (config.auth_mode if config else None)
    if not base_url or auth_mode not in {"token", "password"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="URL Mercator et mode d'authentification (token/password) requis.",
        )
    username = payload.username or (config.username if config else None)
    verify_tls = (
        payload.verify_tls
        if payload.verify_tls is not None
        else (config.verify_tls if config else settings.mercator_verify_tls)
    )

    token = payload.token
    password = payload.password
    try:
        if auth_mode == "token" and not token and config and config.encrypted_token:
            token = decrypt_secret(config.encrypted_token)
        if auth_mode == "password" and not password and config and config.encrypted_password:
            password = decrypt_secret(config.encrypted_password)
    except SecretDecryptionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if auth_mode == "token" and not token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Jeton Bearer Mercator requis.",
        )
    if auth_mode == "password" and not (username and password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Identifiant et mot de passe Mercator requis.",
        )
    return {
        "config": config,
        "base_url": base_url,
        "auth_mode": auth_mode,
        "username": username,
        "token": token,
        "password": password,
        "verify_tls": verify_tls,
    }


@router.get("/template.csv")
def download_csv_template(
    _user: User = Depends(get_current_user),
) -> Response:
    return Response(
        content=build_csv_template(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="souverainos-gabarit-import.csv"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/mercator/configs", response_model=list[MercatorConfigRead])
def list_mercator_configs(
    session: SessionDep,
    _user: User = Depends(require_writer_read),
) -> list[MercatorConfigRead]:
    configs = session.exec(select(MercatorConfig).order_by(MercatorConfig.name)).all()
    return [_config_read(config) for config in configs]


@router.post(
    "/mercator/configs",
    response_model=MercatorConfigRead,
    status_code=status.HTTP_201_CREATED,
)
def create_mercator_config(
    payload: MercatorConfigCreate,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> MercatorConfigRead:
    config = _save_config(
        session,
        user=user,
        name=payload.name,
        base_url=payload.base_url,
        auth_mode=payload.auth_mode,
        username=payload.username,
        token=payload.token,
        password=payload.password,
        verify_tls=payload.verify_tls,
    )
    session.commit()
    session.refresh(config)
    record_audit_log(
        session,
        action="mercator_config_create",
        request=request,
        user=user,
        target_type="mercator_config",
        target_id=config.id,
        detail={
            "name": config.name,
            "base_url": config.base_url,
            "auth_mode": config.auth_mode,
        },
    )
    return _config_read(config)


@router.delete(
    "/mercator/configs/{config_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_mercator_config(
    config_id: int,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> None:
    config = session.get(MercatorConfig, config_id)
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration Mercator introuvable.",
        )
    if config.created_by_id != user.id and user.role != "admin_ght":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le créateur ou un administrateur peut supprimer cette configuration.",
        )
    name = config.name
    session.delete(config)
    session.commit()
    record_audit_log(
        session,
        action="mercator_config_delete",
        request=request,
        user=user,
        target_type="mercator_config",
        target_id=config_id,
        detail={"name": name},
    )


@router.post("/mercator", response_model=ImportReport)
def import_from_mercator(
    payload: MercatorImportRequest,
    request: Request,
    session: SessionDep,
    user: User = Depends(require_writer),
) -> ImportReport:
    audit = get_audit_or_404(session, payload.audit_id)
    assert_audit_writable(audit, user)
    resolved = _resolve_mercator(session, payload)
    config = resolved["config"]
    source_url = str(resolved["base_url"])
    try:
        outcome = prepare_mercator_api_import(
            base_url=source_url,
            auth_mode=str(resolved["auth_mode"]),
            token=resolved["token"] if isinstance(resolved["token"], str) else None,
            username=(
                resolved["username"] if isinstance(resolved["username"], str) else None
            ),
            password=(
                resolved["password"] if isinstance(resolved["password"], str) else None
            ),
            verify_tls=bool(resolved["verify_tls"]),
            timeout_seconds=settings.mercator_timeout_seconds,
            existing_keys=_existing_keys(session, audit.id or 0),
            default_establishment=payload.default_establishment,
            max_rows=settings.max_import_rows,
        )
    except (MercatorAuthenticationError, MercatorConnectionError) as exc:
        record_audit_log(
            session,
            action="import_failed",
            request=request,
            user=user,
            target_type="audit",
            target_id=audit.id,
            detail={"source": "mercator", "error": str(exc)[:300]},
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except ImportMappingError as exc:
        record_audit_log(
            session,
            action="import_failed",
            request=request,
            user=user,
            target_type="audit",
            target_id=audit.id,
            detail={"source": "mercator", "error": str(exc)[:300]},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    imported_ids = _persist_outcome(session, audit, outcome)
    if isinstance(config, MercatorConfig):
        config.last_used_at = utcnow()
        session.add(config)

    new_config: MercatorConfig | None = None
    if payload.save_config:
        new_config = _save_config(
            session,
            user=user,
            name=payload.config_name or f"Mercator {source_url}",
            base_url=source_url,
            auth_mode=str(resolved["auth_mode"]),
            username=(
                resolved["username"] if isinstance(resolved["username"], str) else None
            ),
            token=resolved["token"] if isinstance(resolved["token"], str) else None,
            password=(
                resolved["password"] if isinstance(resolved["password"], str) else None
            ),
            verify_tls=bool(resolved["verify_tls"]),
        )
    session.commit()

    if new_config is not None:
        record_audit_log(
            session,
            action="mercator_config_create",
            request=request,
            user=user,
            target_type="mercator_config",
            target_id=new_config.id,
            detail={
                "name": new_config.name,
                "base_url": new_config.base_url,
                "auth_mode": new_config.auth_mode,
            },
        )

    record_audit_log(
        session,
        action="import_mercator",
        request=request,
        user=user,
        target_type="audit",
        target_id=audit.id,
        detail={
            "base_url": source_url,
            "imported": len(outcome.bricks),
            "duplicates": outcome.duplicates,
            "invalid": len(outcome.errors),
        },
    )
    return _build_report(
        audit_id=audit.id or 0,
        source="mercator",
        outcome=outcome,
        imported_ids=imported_ids,
    )


@router.post("/file", response_model=ImportReport)
def import_file(
    request: Request,
    session: SessionDep,
    audit_id: int = Form(...),
    default_establishment: str = Form(default="Établissement support"),
    import_format: ImportFormat = Form(default="auto", alias="format"),
    file: UploadFile = File(...),
    user: User = Depends(require_writer),
) -> ImportReport:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_writable(audit, user)

    raw = file.file.read(settings.max_upload_bytes + 1)
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux (maximum {settings.max_upload_bytes} octets).",
        )
    filename = Path(file.filename or "import").name[:200]
    suffix = Path(filename).suffix.casefold()
    fmt = import_format
    if fmt == "auto":
        if suffix == ".csv":
            fmt = "csv"
        elif suffix == ".json" or raw.lstrip().startswith((b"{", b"[")):
            fmt = "json"
        else:
            fmt = "csv"

    existing_keys = _existing_keys(session, audit.id or 0)
    try:
        if fmt == "csv":
            outcome = prepare_csv_import(
                raw,
                existing_keys=existing_keys,
                default_establishment=default_establishment,
                max_rows=settings.max_import_rows,
            )
            source = "csv"
        else:
            outcome = prepare_json_import(
                raw,
                existing_keys=existing_keys,
                default_establishment=default_establishment,
                max_rows=settings.max_import_rows,
                force_mercator=fmt == "mercator",
            )
            source = (
                "mercator"
                if fmt == "mercator"
                or any(brick.source == "mercator" for brick in outcome.bricks)
                else "json"
            )
    except ImportMappingError as exc:
        record_audit_log(
            session,
            action="import_failed",
            request=request,
            user=user,
            target_type="audit",
            target_id=audit_id,
            detail={
                "source": fmt,
                "filename": filename,
                "error": str(exc)[:300],
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    imported_ids = _persist_outcome(session, audit, outcome)
    record_audit_log(
        session,
        action="import_file",
        request=request,
        user=user,
        target_type="audit",
        target_id=audit.id,
        detail={
            "source": source,
            "filename": filename,
            "imported": len(outcome.bricks),
            "duplicates": outcome.duplicates,
            "invalid": len(outcome.errors),
        },
    )
    return _build_report(
        audit_id=audit.id or 0,
        source=source,
        outcome=outcome,
        imported_ids=imported_ids,
        filename=filename,
    )
