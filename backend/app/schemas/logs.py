from datetime import datetime

from pydantic import Field

from app.schemas.common import ORMModel


class AuditLogRead(ORMModel):
    id: int
    user_id: int | None
    username: str
    action: str
    target_type: str | None
    target_id: int | None
    detail: dict[str, object] | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


class AuditLogPage(ORMModel):
    items: list[AuditLogRead] = Field(default_factory=list)
    total: int
    limit: int
    offset: int
