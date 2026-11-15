from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import ORMModel

MercatorAuthMode = Literal["password", "token"]
ImportFormat = Literal["auto", "csv", "json", "mercator"]


def _validate_http_url(value: str) -> str:
    cleaned = value.strip().rstrip("/")
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("L'URL Mercator doit être une URL http(s) valide.")
    if parsed.username or parsed.password:
        raise ValueError("Ne pas placer d'identifiants dans l'URL Mercator.")
    return cleaned


class MercatorImportRequest(BaseModel):
    audit_id: int
    config_id: int | None = None
    base_url: str | None = Field(default=None, max_length=500)
    auth_mode: MercatorAuthMode | None = None
    username: str | None = Field(default=None, max_length=200)
    password: str | None = Field(default=None, max_length=512)
    token: str | None = Field(default=None, max_length=4096)
    verify_tls: bool | None = None
    default_establishment: str = Field(default="Établissement support", max_length=200)
    save_config: bool = False
    config_name: str | None = Field(default=None, max_length=200)

    @field_validator("base_url")
    @classmethod
    def _check_base_url(cls, value: str | None) -> str | None:
        return _validate_http_url(value) if value else value


class MercatorConfigCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    base_url: str = Field(min_length=1, max_length=500)
    auth_mode: MercatorAuthMode = "token"
    username: str | None = Field(default=None, max_length=200)
    password: str | None = Field(default=None, max_length=512)
    token: str | None = Field(default=None, max_length=4096)
    verify_tls: bool = True

    @field_validator("base_url")
    @classmethod
    def _check_base_url(cls, value: str) -> str:
        return _validate_http_url(value)

    @model_validator(mode="after")
    def _check_credentials(self) -> "MercatorConfigCreate":
        if self.auth_mode == "token" and not self.token:
            raise ValueError("Un jeton Bearer est obligatoire en mode token.")
        if self.auth_mode == "password" and not (self.username and self.password):
            raise ValueError("Identifiant et mot de passe obligatoires en mode password.")
        return self


class MercatorConfigRead(ORMModel):
    id: int
    name: str
    base_url: str
    auth_mode: str
    username: str | None
    verify_tls: bool
    created_by_id: int | None
    created_at: datetime
    last_used_at: datetime | None
    has_token: bool = False
    has_password: bool = False


class ImportRowError(BaseModel):
    row: int
    message: str


class ImportReport(BaseModel):
    audit_id: int
    source: str
    imported: int
    duplicates: int
    invalid: int
    total_received: int
    by_layer: dict[str, int]
    warnings: list[str] = Field(default_factory=list)
    errors: list[ImportRowError] = Field(default_factory=list)
    imported_ids: list[int] = Field(default_factory=list)
    filename: str | None = None
