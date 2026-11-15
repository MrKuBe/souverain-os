import contextlib
import logging
import ssl
from typing import Any
from urllib.parse import urlparse

from ldap3 import NONE, SUBTREE, Connection, Server, Tls
from ldap3.core.exceptions import LDAPBindError, LDAPException
from ldap3.utils.conv import escape_filter_chars
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.models.base import utcnow
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()


class AuthenticationError(Exception):
    """Erreur d'authentification générique."""


class InvalidCredentialsError(AuthenticationError):
    """Identifiants refusés."""


class DirectoryUnavailableError(AuthenticationError):
    """Annuaire LDAP injoignable ou mal configuré."""


def find_user_by_username(session: Session, username: str) -> User | None:
    return session.exec(
        select(User).where(func.lower(User.username) == username.strip().casefold())
    ).first()


def create_local_user(
    session: Session,
    *,
    username: str,
    password: str,
    role: str,
    email: str | None = None,
    full_name: str | None = None,
) -> User:
    cleaned = username.strip()
    if find_user_by_username(session, cleaned):
        raise ValueError("Ce nom d'utilisateur existe déjà.")
    user = User(
        username=cleaned,
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=role,
        auth_source="local",
        is_active=True,
    )
    session.add(user)
    session.flush()
    return user


def authenticate_user(session: Session, username: str, password: str) -> User:
    cleaned = username.strip()
    if not cleaned or not password:
        raise InvalidCredentialsError("Identifiants invalides.")

    local_user = find_user_by_username(session, cleaned)
    mode = settings.auth_mode

    if mode == "local":
        return _authenticate_local(local_user, password)

    if mode == "ldap":
        return _authenticate_ldap_and_upsert(session, cleaned, password)

    if local_user is not None and local_user.auth_source == "local":
        # Priorité stricte au compte local : jamais de bascule LDAP sur un login local.
        return _authenticate_local(local_user, password)

    if not settings.auth_allow_ldap_fallback:
        raise InvalidCredentialsError("Identifiants invalides.")

    return _authenticate_ldap_and_upsert(session, cleaned, password, local_user)


def _authenticate_local(user: User | None, password: str) -> User:
    if user is None or user.auth_source != "local":
        raise InvalidCredentialsError("Identifiants invalides.")
    if not user.is_active or not user.hashed_password:
        raise InvalidCredentialsError("Identifiants invalides.")
    if not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Identifiants invalides.")
    return user


def _ldap_server() -> Server:
    if not settings.ldap_server_url or not settings.ldap_base_dn:
        raise DirectoryUnavailableError("Annuaire LDAP non configuré.")

    raw_url = settings.ldap_server_url
    if "://" not in raw_url:
        raw_url = f"ldap://{raw_url}"
    parsed = urlparse(raw_url)
    if parsed.scheme not in {"ldap", "ldaps"} or not parsed.hostname:
        raise DirectoryUnavailableError("URL LDAP invalide.")

    use_ssl = settings.ldap_use_ssl or parsed.scheme == "ldaps"
    port = parsed.port or (636 if use_ssl else 389)
    tls = None
    if use_ssl:
        tls = Tls(
            validate=ssl.CERT_REQUIRED if settings.ldap_tls_validate else ssl.CERT_NONE,
            ca_certs_file=settings.ldap_ca_cert_file or None,
        )
    return Server(
        parsed.hostname,
        port=port,
        use_ssl=use_ssl,
        tls=tls,
        get_info=NONE,
        connect_timeout=settings.ldap_timeout_seconds,
    )


def _service_connection(server: Server) -> Connection:
    try:
        connection = Connection(
            server,
            user=settings.ldap_bind_dn or None,
            password=settings.ldap_bind_password or None,
            auto_bind=True,
            receive_timeout=settings.ldap_timeout_seconds,
            raise_exceptions=True,
        )
    except LDAPException as exc:
        raise DirectoryUnavailableError("Annuaire LDAP indisponible.") from exc
    return connection


def _entry_values(entry: Any, attribute: str) -> list[str]:
    try:
        values = entry[attribute].values
    except (KeyError, TypeError):
        return []
    return [str(value) for value in values if value not in (None, "")]


def _entry_first(entry: Any, attribute: str) -> str | None:
    values = _entry_values(entry, attribute)
    return values[0] if values else None


def _cn_from_dn(dn: str) -> str | None:
    for part in dn.split(","):
        token = part.strip()
        if token.lower().startswith("cn="):
            return token[3:].strip()
    return None


def _group_matches(group_dns: list[str], configured: str | None) -> bool:
    if not configured:
        return False
    target = configured.strip()
    target_cn = _cn_from_dn(target) if "=" in target else target
    for group_dn in group_dns:
        if group_dn.casefold() == target.casefold():
            return True
        group_cn = _cn_from_dn(group_dn)
        if target_cn and group_cn and group_cn.casefold() == target_cn.casefold():
            return True
    return False


def _resolve_role(member_of: list[str]) -> str:
    if _group_matches(member_of, settings.ldap_admin_group_dn):
        return "admin_ght"
    if _group_matches(member_of, settings.ldap_auditeur_group_dn):
        return "auditeur"
    if _group_matches(member_of, settings.ldap_lecteur_group_dn):
        return "lecteur_direction"
    return settings.ldap_default_role


def _authenticate_ldap_and_upsert(
    session: Session,
    username: str,
    password: str,
    existing: User | None = None,
) -> User:
    server = _ldap_server()
    service = _service_connection(server)
    try:
        search_filter = settings.ldap_user_filter.replace(
            "{username}", escape_filter_chars(username)
        )
        try:
            service.search(
                settings.ldap_base_dn,
                search_filter,
                search_scope=SUBTREE,
                attributes=[
                    settings.ldap_attribute_uid,
                    settings.ldap_attribute_email,
                    settings.ldap_attribute_display_name,
                    settings.ldap_attribute_memberof,
                ],
                size_limit=2,
            )
        except LDAPException as exc:
            raise DirectoryUnavailableError("Échec de la recherche LDAP.") from exc

        entries = list(service.entries)
        if len(entries) != 1:
            raise InvalidCredentialsError("Identifiants invalides.")
        entry = entries[0]
        user_dn = entry.entry_dn
        member_of = _entry_values(entry, settings.ldap_attribute_memberof)
        role = _resolve_role(member_of)
        email = _entry_first(entry, settings.ldap_attribute_email)
        full_name = _entry_first(entry, settings.ldap_attribute_display_name)
    finally:
        with contextlib.suppress(LDAPException):
            service.unbind()

    try:
        user_connection = Connection(
            server,
            user=user_dn,
            password=password,
            auto_bind=True,
            read_only=True,
            receive_timeout=settings.ldap_timeout_seconds,
            raise_exceptions=True,
        )
        user_connection.unbind()
    except LDAPBindError as exc:
        raise InvalidCredentialsError("Identifiants invalides.") from exc
    except LDAPException as exc:
        raise DirectoryUnavailableError("Annuaire LDAP indisponible.") from exc

    user = existing if existing is not None else find_user_by_username(session, username)
    if user is not None:
        if user.auth_source == "local":
            raise InvalidCredentialsError("Identifiants invalides.")
        if not user.is_active:
            raise InvalidCredentialsError("Identifiants invalides.")
        user.email = email or user.email
        user.full_name = full_name or user.full_name
        user.role = role
        user.updated_at = utcnow()
    else:
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=None,
            role=role,
            auth_source="ldap",
            is_active=True,
        )
    session.add(user)
    session.flush()
    return user
