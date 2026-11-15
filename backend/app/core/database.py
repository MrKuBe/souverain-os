import logging
import time
from collections.abc import Iterator

from sqlalchemy import create_engine, text
from sqlmodel import Session, SQLModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_connect_args: dict[str, object] = {}
if settings.database_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    echo=settings.sql_echo,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=_connect_args,
)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def wait_for_database(max_attempts: int = 30, delay_seconds: float = 2.0) -> None:
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Base de données indisponible (tentative %s/%s).",
                attempt,
                max_attempts,
            )
            time.sleep(delay_seconds)
    raise RuntimeError("Impossible de joindre la base de données PostgreSQL.") from last_error


def init_database() -> None:
    import app.models  # noqa: F401 - enregistre toutes les tables SQLModel

    SQLModel.metadata.create_all(engine)
