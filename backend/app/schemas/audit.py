from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import (
    ApplicationCriteria,
    BrickSource,
    BrickStatus,
    BusinessCriticality,
    Layer,
    ORMModel,
)


class AuditBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=20_000)
    ght_name: str = Field(default="", max_length=200)
    establishments: list[str] = Field(default_factory=list, max_length=100)


class AuditCreate(AuditBase):
    pass


class AuditUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    ght_name: str | None = Field(default=None, max_length=200)
    establishments: list[str] | None = Field(default=None, max_length=100)


class AuditRead(ORMModel):
    id: int
    name: str
    description: str
    ght_name: str
    establishments: list[str]
    is_demo: bool
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime


class AuditListItem(AuditRead):
    application_count: int = 0
    global_score: float = 0.0
    classification: str = "Non évalué"
    classification_color: str = "gray"
    evaluated: bool = False


class ApplicationBase(ORMModel, ApplicationCriteria):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=20_000)
    editor: str = Field(default="", max_length=200)
    technology: str = Field(default="", max_length=300)
    app_type: str = Field(default="", max_length=120)
    responsible: str = Field(default="", max_length=200)
    establishment: str = Field(default="Établissement support", max_length=200)
    layer: Layer
    external: bool = False
    status: BrickStatus = "a_valider"
    security_need_a: int | None = Field(default=None, ge=1, le=4)
    notes: str = Field(default="", max_length=20_000)


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    editor: str | None = Field(default=None, max_length=200)
    technology: str | None = Field(default=None, max_length=300)
    app_type: str | None = Field(default=None, max_length=120)
    responsible: str | None = Field(default=None, max_length=200)
    establishment: str | None = Field(default=None, max_length=200)
    layer: Layer | None = None
    external: bool | None = None
    status: BrickStatus | None = None
    security_need_a: int | None = Field(default=None, ge=1, le=4)
    license_model: int | None = Field(default=None, ge=0, le=5)
    jurisdiction: int | None = Field(default=None, ge=0, le=5)
    interoperability: int | None = Field(default=None, ge=0, le=5)
    operational_dependency: int | None = Field(default=None, ge=0, le=5)
    business_criticality: BusinessCriticality | None = None
    notes: str | None = Field(default=None, max_length=20_000)


class ApplicationRead(ApplicationBase):
    id: int
    audit_id: int
    source: BrickSource
    mercator_id: str | None
    created_at: datetime
    updated_at: datetime
    unit_score: float | None = None
