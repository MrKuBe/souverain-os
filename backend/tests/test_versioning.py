import json
from pathlib import Path

import pytest

from app.core.version import VersionFileError, get_app_version, parse_version

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_version_is_read_from_root_file() -> None:
    raw = (PROJECT_ROOT / "VERSION").read_text(encoding="utf-8")
    assert raw.strip() == f"v{get_app_version()}"
    assert get_app_version() == parse_version(raw)


def test_frontend_manifests_share_the_same_version() -> None:
    version = get_app_version()
    package = json.loads((PROJECT_ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
    lock = json.loads(
        (PROJECT_ROOT / "frontend" / "package-lock.json").read_text(encoding="utf-8")
    )
    assert package["version"] == version
    assert lock["version"] == version
    assert lock["packages"][""]["version"] == version


@pytest.mark.parametrize("value", ["0.3.0", "v0.3", "v0.3.0-rc1", "version 0.3.0", ""])
def test_invalid_version_formats_are_rejected(value: str) -> None:
    with pytest.raises(VersionFileError):
        parse_version(value)


def test_semantic_version_is_stripped_of_prefix() -> None:
    assert parse_version("v1.12.3\n") == "1.12.3"
