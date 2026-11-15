from datetime import datetime
from typing import Any

from sqlalchemy import JSON, CheckConstraint, Column, DateTime, Text
from sqlmodel import Field, SQLModel

from app.models.base import utcnow


class Audit(SQLModel, table=True):
    __tablename__ = "audits"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200, index=True)
    description: str = Field(default="", sa_column=Column(Text, nullable=False))
    ght_name: str = Field(default="", max_length=200)
    establishments: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    is_demo: bool = Field(default=False, index=True)
    created_by_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        index=True,
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class ApplicationBrick(SQLModel, table=True):
    __tablename__ = "application_bricks"
    __table_args__ = (
        CheckConstraint(
            "layer IN ('infrastructure', 'supports', 'metier')",
            name="ck_application_bricks_layer",
        ),
        CheckConstraint(
            "license_model BETWEEN 0 AND 5",
            name="ck_application_bricks_license",
        ),
        CheckConstraint(
            "jurisdiction BETWEEN 0 AND 5",
            name="ck_application_bricks_jurisdiction",
        ),
        CheckConstraint(
            "interoperability BETWEEN 0 AND 5",
            name="ck_application_bricks_interoperability",
        ),
        CheckConstraint(
            "operational_dependency BETWEEN 0 AND 5",
            name="ck_application_bricks_operational_dependency",
        ),
        CheckConstraint(
            "business_criticality IN (1, 3, 5)",
            name="ck_application_bricks_business_criticality",
        ),
        CheckConstraint(
            "status IN ('a_valider', 'valide')",
            name="ck_application_bricks_status",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    audit_id: int = Field(foreign_key="audits.id", index=True)
    name: str = Field(max_length=200, index=True)
    description: str = Field(default="", sa_column=Column(Text, nullable=False))
    editor: str = Field(default="", max_length=200)
    technology: str = Field(default="", max_length=300)
    app_type: str = Field(default="", max_length=120)
    responsible: str = Field(default="", max_length=200)
    establishment: str = Field(default="Établissement support", max_length=200, index=True)
    layer: str = Field(default="supports", max_length=32, index=True)
    external: bool = Field(default=False, index=True)
    source: str = Field(default="manuel", max_length=16)
    status: str = Field(default="a_valider", max_length=16, index=True)
    mercator_id: str | None = Field(default=None, max_length=100)
    security_need_a: int | None = Field(default=None)
    license_model: int = Field(default=2)
    jurisdiction: int = Field(default=2)
    interoperability: int = Field(default=3)
    operational_dependency: int = Field(default=3)
    business_criticality: int = Field(default=3)
    notes: str = Field(default="", sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        index=True,
    )
    username: str = Field(default="anonyme", max_length=100, index=True)
    action: str = Field(max_length=64, index=True)
    target_type: str | None = Field(default=None, max_length=64)
    target_id: int | None = Field(default=None)
    detail: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    ip_address: str | None = Field(default=None, max_length=64)
    user_agent: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )


class MercatorConfig(SQLModel, table=True):
    __tablename__ = "mercator_configs"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    base_url: str = Field(max_length=500)
    auth_mode: str = Field(default="token", max_length=16)
    username: str | None = Field(default=None, max_length=200)
    encrypted_token: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    encrypted_password: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    verify_tls: bool = Field(default=True)
    created_by_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        index=True,
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    last_used_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
