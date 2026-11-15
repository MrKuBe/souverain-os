import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from app.api.routes import admin, applications, audits, auth, exports, imports, simulation
from app.core.config import get_settings
from app.core.database import engine, init_database, wait_for_database
from app.services.seed import seed_database

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s : %(message)s",
)
logger = logging.getLogger("souverainos")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Démarrage de SouverainOS (%s).", settings.environment)
    if settings.uses_placeholder_secret and not settings.is_production:
        logger.warning("SECRET_KEY utilise la valeur d'exemple : à remplacer avant usage réel.")
    if not settings.cookie_secure and not settings.is_production:
        logger.info("COOKIE_SECURE=false (développement HTTP local uniquement).")
    if settings.auth_mode in {"ldap", "hybrid"} and not settings.ldap_server_url:
        logger.info("LDAP non configuré : seuls les comptes locaux seront utilisables.")
    await run_in_threadpool(wait_for_database)
    await run_in_threadpool(init_database)
    if settings.seed_on_startup:
        await run_in_threadpool(seed_database)
    logger.info("Initialisation terminée.")
    yield
    engine.dispose()
    logger.info("Arrêt de SouverainOS.")


app = FastAPI(
    title="SouverainOS API — Auteur : Bertrand Kuzbinski",
    description=(
        "API d'audit et de scoring de la dépendance numérique des Systèmes "
        "d'Information Hospitaliers. Projet conçu par Bertrand Kuzbinski, "
        "développé en Vibecoding Full-Stack Open Source."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_tags=[
        {"name": "Santé", "description": "Disponibilité de l'API et de la base."},
        {"name": "Authentification", "description": "Sessions locales et LDAP/LDAPS."},
        {"name": "Audits", "description": "Audits GHT, scores et tableaux de bord."},
        {"name": "Cartographie", "description": "Briques applicatives et critères."},
        {"name": "Import & Interopérabilité", "description": "Mercator, CSV et JSON."},
        {"name": "Simulation", "description": "Trajectoires What-If non persistées."},
        {"name": "Exports", "description": "Rapports JSON, Markdown et CSV."},
        {"name": "Administration", "description": "Utilisateurs et journals d'audit."},
    ],
)

if settings.allowed_hosts_list:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials="*" not in settings.cors_origins_list,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", settings.csrf_header_name],
    max_age=600,
)

STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.middleware("http")
async def security_headers(request: Request, call_next: Any):
    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    )
    if request.url.path == "/docs":
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
            "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; "
            "object-src 'none'; base-uri 'self'",
        )
    else:
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )
    if request.url.path.startswith(f"{settings.api_prefix}/auth"):
        response.headers.setdefault("Cache-Control", "no-store")
    if settings.cookie_secure or request.url.scheme == "https":
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    safe_errors = [
        {
            "loc": [str(part) for part in error.get("loc", [])],
            "type": error.get("type", "validation_error"),
            "msg": error.get("msg", "Valeur invalide."),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Données invalides dans la requête.",
            "errors": safe_errors,
        },
    )


@app.get("/", tags=["Santé"])
def root() -> dict[str, str]:
    return {
        "name": "SouverainOS",
        "description": "Audit de Dépendance Numérique des SIH",
        "author": "Bertrand Kuzbinski",
        "version": settings.app_version,
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


@app.get("/healthz", tags=["Santé"])
def healthz() -> JSONResponse:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Healthcheck base de données en échec.")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Base de données indisponible."},
        )
    return JSONResponse(
        content={"status": "ok", "service": "souverainos", "version": settings.app_version}
    )


@app.get("/docs", include_in_schema=False)
def custom_swagger_ui():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{settings.app_name} — Documentation",
        swagger_js_url="/static/swagger-ui/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui/swagger-ui.css",
        swagger_favicon_url="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    )


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(audits.router, prefix=settings.api_prefix)
app.include_router(applications.router, prefix=settings.api_prefix)
app.include_router(imports.router, prefix=settings.api_prefix)
app.include_router(simulation.router, prefix=settings.api_prefix)
app.include_router(exports.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
