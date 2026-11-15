from datetime import datetime

from sqlalchemy import Column, DateTime, String
from sqlmodel import Field, SQLModel

from app.models.base import utcnow


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(
        sa_column=Column(String(100), unique=True, index=True, nullable=False),
    )
    email: str | None = Field(default=None, max_length=255)
    full_name: str | None = Field(default=None, max_length=200)
    hashed_password: str | None = Field(default=None, max_length=255)
    role: str = Field(default="lecteur_direction", max_length=32, index=True)
    auth_source: str = Field(default="local", max_length=16)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    last_login_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
