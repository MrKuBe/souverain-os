export type Role = "admin_ght" | "auditeur" | "lecteur_direction";
export type Layer = "infrastructure" | "supports" | "metier";
export type BrickStatus = "a_valider" | "valide";
export type BrickSource = "manuel" | "mercator" | "csv" | "json";
export type BusinessCriticality = 1 | 3 | 5;
export type ClassificationColor = "green" | "blue" | "orange" | "red" | "gray";

export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  auth_source: "local" | "ldap" | string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Audit {
  id: number;
  name: string;
  description: string;
  ght_name: string;
  establishments: string[];
  is_demo: boolean;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditListItem extends Audit {
  application_count: number;
  global_score: number;
  classification: string;
  classification_color: ClassificationColor;
  evaluated: boolean;
}

export interface Application {
  id: number;
  audit_id: number;
  name: string;
  description: string;
  editor: string;
  technology: string;
  app_type: string;
  responsible: string;
  establishment: string;
  layer: Layer;
  external: boolean;
  source: BrickSource;
  status: BrickStatus;
  mercator_id: string | null;
  security_need_a: number | null;
  license_model: number;
  jurisdiction: number;
  interoperability: number;
  operational_dependency: number;
  business_criticality: BusinessCriticality;
  notes: string;
  created_at: string;
  updated_at: string;
  unit_score: number | null;
}

export interface Classification {
  label: string;
  color: ClassificationColor;
  level: string;
}

export interface LayerScore {
  key: Layer;
  label: string;
  weight: number;
  effective_weight: number;
  score: number | null;
  count: number;
  classification: Classification | null;
}

export interface AxisScore {
  key: string;
  label: string;
  score: number;
}

export interface PrimaryRisk {
  key: string;
  label: string;
  value: number;
}

export interface Vulnerability {
  application_id: number | null;
  name: string;
  layer: string;
  layer_label: string;
  establishment: string;
  score: number;
  business_criticality: number;
  primary_risk: PrimaryRisk;
}

export interface ScoreReport {
  global_score: number;
  classification: Classification;
  evaluated: boolean;
  layers: LayerScore[];
  axes: AxisScore[];
  top_vulnerabilities: Vulnerability[];
  application_count: number;
}

export interface Dashboard {
  audit_id: number;
  score: ScoreReport;
  total_applications: number;
  external_count: number;
  status_counts: Record<string, number>;
  layer_counts: Record<string, number>;
  establishment_counts: Record<string, number>;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportReport {
  audit_id: number;
  source: string;
  imported: number;
  duplicates: number;
  invalid: number;
  total_received: number;
  by_layer: Record<string, number>;
  warnings: string[];
  errors: ImportRowError[];
  imported_ids: number[];
  filename: string | null;
}

export interface MercatorConfig {
  id: number;
  name: string;
  base_url: string;
  auth_mode: "token" | "password";
  username: string | null;
  verify_tls: boolean;
  created_by_id: number | null;
  created_at: string;
  last_used_at: string | null;
  has_token: boolean;
  has_password: boolean;
}

export interface SimulationSwap {
  application_id: number;
  alternative_name?: string | null;
  license_model?: number | null;
  jurisdiction?: number | null;
  interoperability?: number | null;
  operational_dependency?: number | null;
}

export interface SimulationChange {
  application_id: number | null;
  name: string;
  alternative_name: string | null;
  before_score: number;
  after_score: number;
  delta: number;
}

export interface SimulationResponse {
  audit_id: number;
  persisted: boolean;
  message: string;
  before: ScoreReport;
  after: ScoreReport;
  delta: number;
  changes: SimulationChange[];
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}
