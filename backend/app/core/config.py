from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "change-me-with-a-long-random-secret-before-any-real-use"
DEFAULT_ADMIN_PASSWORD = "change-me-admin-password-12-caracteres-minimum"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "SouverainOS API — Auteur : Bertrand Kuzbinski"
    app_version: str = "0.1.0"
    environment: Literal["development", "production", "test"] = "development"
    api_prefix: str = "/api"
    log_level: str = "INFO"
    secret_key: str = DEFAULT_SECRET_KEY

    cors_origins: str = "http://localhost:3000"
    allowed_hosts: str = "localhost,127.0.0.1,backend,frontend,testserver"

    database_url: str = (
        "postgresql+psycopg://souverainos:souverainos@localhost:5432/souverainos"
    )
    sql_echo: bool = False

    seed_on_startup: bool = True
    seed_demo_data: bool = True

    admin_username: str = "admin"
    admin_password: str = DEFAULT_ADMIN_PASSWORD
    admin_email: str = "admin@souverainos.local"
    admin_full_name: str = "Administrateur SouverainOS"

    auth_mode: Literal["local", "ldap", "hybrid"] = "hybrid"
    auth_allow_ldap_fallback: bool = True
    ldap_default_role: Literal[
        "admin_ght", "auditeur", "lecteur_direction"
    ] = "lecteur_direction"

    jwt_algorithm: Literal["HS256", "RS256"] = "HS256"
    jwt_issuer: str = "souverainos"
    jwt_audience: str = "souverainos-web"
    jwt_private_key_path: str = ""
    jwt_public_key_path: str = ""
    access_token_expire_minutes: int = 480

    cookie_secure: bool = False
    cookie_domain: str | None = None
    access_cookie_name: str = "souverainos_access"
    csrf_cookie_name: str = "souverainos_csrf"
    csrf_header_name: str = "X-CSRF-Token"

    ldap_server_url: str = ""
    ldap_use_ssl: bool = False
    ldap_tls_validate: bool = True
    ldap_ca_cert_file: str = ""
    ldap_base_dn: str = ""
    ldap_bind_dn: str = ""
    ldap_bind_password: str = ""
    ldap_user_filter: str = "(uid={username})"
    ldap_attribute_uid: str = "uid"
    ldap_attribute_email: str = "mail"
    ldap_attribute_display_name: str = "cn"
    ldap_attribute_memberof: str = "memberOf"
    ldap_admin_group_dn: str = ""
    ldap_auditeur_group_dn: str = ""
    ldap_lecteur_group_dn: str = ""
    ldap_timeout_seconds: int = 8

    mercator_verify_tls: bool = True
    mercator_timeout_seconds: int = 20
    max_import_rows: int = 5000
    max_upload_bytes: int = 20 * 1024 * 1024
    password_min_length: int = 12

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def uses_placeholder_secret(self) -> bool:
        return self.secret_key == DEFAULT_SECRET_KEY

    @property
    def uses_placeholder_admin_password(self) -> bool:
        return self.admin_password == DEFAULT_ADMIN_PASSWORD

    @model_validator(mode="after")
    def _validate_security(self) -> "Settings":
        if self.jwt_algorithm == "RS256":
            if not self.jwt_private_key_path or not self.jwt_public_key_path:
                raise ValueError(
                    "JWT_ALGORITHM=RS256 exige JWT_PRIVATE_KEY_PATH et JWT_PUBLIC_KEY_PATH."
                )
            for raw_path in (self.jwt_private_key_path, self.jwt_public_key_path):
                if not Path(raw_path).is_file():
                    raise ValueError(f"Clé JWT introuvable : {raw_path}")

        if self.auth_mode in {"ldap", "hybrid"} and self.ldap_server_url:
            if not self.ldap_base_dn:
                raise ValueError("LDAP_BASE_DN est obligatoire lorsque LDAP_SERVER_URL est défini.")
            if "{username}" not in self.ldap_user_filter:
                raise ValueError(
                    "LDAP_USER_FILTER doit contenir le marqueur {username}."
                )

        if self.is_production:
            if self.uses_placeholder_secret or len(self.secret_key) < 32:
                raise ValueError(
                    "En production, SECRET_KEY doit être une valeur aléatoire d'au moins "
                    "32 caractères (générer avec secrets.token_urlsafe(64))."
                )
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE doit être true en production HTTPS.")
            if self.uses_placeholder_admin_password:
                raise ValueError("En production, ADMIN_PASSWORD doit être remplacé.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
