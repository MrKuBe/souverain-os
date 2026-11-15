from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["admin_ght", "auditeur", "lecteur_direction"]
Layer = Literal["infrastructure", "supports", "metier"]
BrickStatus = Literal["a_valider", "valide"]
BrickSource = Literal["manuel", "mercator", "csv", "json"]

WRITER_ROLES: frozenset[str] = frozenset({"admin_ght", "auditeur"})
ADMIN_ROLES: frozenset[str] = frozenset({"admin_ght"})
READER_ROLES: frozenset[str] = frozenset(
    {"admin_ght", "auditeur", "lecteur_direction"}
)

LicenseScore = Annotated[int, Field(ge=0, le=5)]
BusinessCriticality = Literal[1, 3, 5]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    detail: str


class ApplicationCriteria(BaseModel):
    license_model: LicenseScore
    jurisdiction: LicenseScore
    interoperability: LicenseScore
    operational_dependency: LicenseScore
    business_criticality: BusinessCriticality
