"""Lecture de la version applicative depuis le fichier VERSION racine."""

import re
from functools import lru_cache
from pathlib import Path

VERSION_PATTERN = re.compile(r"^v(?P<version>\d+\.\d+\.\d+)$")


class VersionFileError(RuntimeError):
    """Le fichier VERSION est absent, illisible ou invalide."""


def parse_version(content: str) -> str:
    """Valide le format `vMAJOR.MINOR.PATCH` et retourne la version sans préfixe."""
    match = VERSION_PATTERN.fullmatch(content.strip())
    if match is None:
        raise VersionFileError(
            "Le fichier VERSION doit contenir une version sémantique au format vX.Y.Z."
        )
    return match.group("version")


def version_file_candidates() -> tuple[Path, ...]:
    """Emplacements connus : dépôt local, backend, image OCI et répertoire courant."""
    module_path = Path(__file__).resolve()
    return (
        module_path.parents[3] / "VERSION",
        module_path.parents[2] / "VERSION",
        Path("/etc/souverainos/VERSION"),
        Path("/app/VERSION"),
        Path.cwd() / "VERSION",
        Path.cwd().parent / "VERSION",
    )


@lru_cache(maxsize=1)
def get_app_version() -> str:
    """Retourne la version partagée par l'API, les exports et le frontend."""
    for candidate in version_file_candidates():
        if candidate.is_file():
            return parse_version(candidate.read_text(encoding="utf-8"))
    raise VersionFileError(
        "Fichier VERSION introuvable. La racine du projet doit être incluse dans le build."
    )
