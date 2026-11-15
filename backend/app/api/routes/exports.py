from typing import Literal

from fastapi import APIRouter, Depends, Request, Response
from sqlmodel import select

from app.api.deps import (
    SessionDep,
    assert_audit_readable,
    get_audit_or_404,
    get_optional_user,
)
from app.models.audit import ApplicationBrick
from app.models.user import User
from app.services.audit_log import record_audit_log
from app.services.exports import build_export
from app.services.scoring import compute_score_report

router = APIRouter(tags=["Exports"])


@router.get("/audits/{audit_id}/export/{fmt}")
def export_audit(
    audit_id: int,
    fmt: Literal["json", "markdown", "csv"],
    request: Request,
    session: SessionDep,
    user: User | None = Depends(get_optional_user),
) -> Response:
    audit = get_audit_or_404(session, audit_id)
    assert_audit_readable(audit, user)
    bricks = list(
        session.exec(
            select(ApplicationBrick)
            .where(ApplicationBrick.audit_id == audit_id)
            .order_by(ApplicationBrick.layer, ApplicationBrick.name)
        ).all()
    )
    report = compute_score_report(bricks)
    content, media_type, filename = build_export(
        audit,
        bricks,
        report,
        fmt,
        generated_by=user.username if user else "anonyme",
    )
    record_audit_log(
        session,
        action="export",
        request=request,
        user=user,
        username="anonyme" if user is None else None,
        target_type="audit",
        target_id=audit.id,
        detail={"format": fmt, "is_demo": audit.is_demo},
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
