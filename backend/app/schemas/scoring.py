from pydantic import BaseModel, Field

from app.schemas.common import Layer


class ClassificationRead(BaseModel):
    label: str
    color: str
    level: str


class LayerScoreRead(BaseModel):
    key: Layer
    label: str
    weight: float
    effective_weight: float
    score: float | None
    count: int
    classification: ClassificationRead | None


class AxisScoreRead(BaseModel):
    key: str
    label: str
    score: float


class PrimaryRiskRead(BaseModel):
    key: str
    label: str
    value: int


class VulnerabilityRead(BaseModel):
    application_id: int | None
    name: str
    layer: str
    layer_label: str
    establishment: str
    score: float
    business_criticality: int
    primary_risk: PrimaryRiskRead


class ScoreReportRead(BaseModel):
    global_score: float
    classification: ClassificationRead
    evaluated: bool
    layers: list[LayerScoreRead]
    axes: list[AxisScoreRead]
    top_vulnerabilities: list[VulnerabilityRead]
    application_count: int


class DashboardRead(BaseModel):
    audit_id: int
    score: ScoreReportRead
    total_applications: int
    external_count: int
    status_counts: dict[str, int]
    layer_counts: dict[str, int]
    establishment_counts: dict[str, int]


class SimulationSwap(BaseModel):
    application_id: int
    alternative_name: str | None = Field(default=None, max_length=200)
    license_model: int | None = Field(default=None, ge=0, le=5)
    jurisdiction: int | None = Field(default=None, ge=0, le=5)
    interoperability: int | None = Field(default=None, ge=0, le=5)
    operational_dependency: int | None = Field(default=None, ge=0, le=5)


class SimulationRequest(BaseModel):
    swaps: list[SimulationSwap] = Field(min_length=1, max_length=500)


class SimulationChange(BaseModel):
    application_id: int | None
    name: str
    alternative_name: str | None
    before_score: float
    after_score: float
    delta: float


class SimulationResponse(BaseModel):
    audit_id: int
    persisted: bool = False
    message: str = "Simulation non persistée : aucun score n'a été enregistré."
    before: ScoreReportRead
    after: ScoreReportRead
    delta: float
    changes: list[SimulationChange]
