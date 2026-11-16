export interface ScoreThreshold {
  max: number;
  range: string;
  label: string;
  color: "green" | "blue" | "orange" | "red";
}

export interface CriterionReference {
  code: "C1" | "C2" | "C3" | "C4" | "C5";
  field: string;
  label: string;
  scale: string;
  question: string;
  sources: string[];
}

export interface MethodologySource {
  short: string;
  title: string;
  publisher: string;
  usage: string;
}

export const SCORE_THRESHOLDS: ScoreThreshold[] = [
  {
    max: 25,
    range: "0–25",
    label: "Souveraineté maîtrisée",
    color: "green",
  },
  {
    max: 50,
    range: "26–50",
    label: "Dépendance modérée / Hybride",
    color: "blue",
  },
  {
    max: 75,
    range: "51–75",
    label: "Dépendance élevée",
    color: "orange",
  },
  {
    max: 100,
    range: "76–100",
    label: "Verrouillage critique / Risque systémique",
    color: "red",
  },
];

export const CRITERION_REFERENCES: CriterionReference[] = [
  {
    code: "C1",
    field: "license_model",
    label: "Licence & code",
    scale: "0 libre → 5 SaaS fermé",
    question:
      "Le code peut-il être audité, modifié, redistribué et poursuivi sans dépendre d'un éditeur ?",
    sources: ["SILL / DINUM", "FLOSS Criteria", "EU Score"],
  },
  {
    code: "C2",
    field: "jurisdiction",
    label: "Juridiction & gouvernance",
    scale: "0 France/UE → 5 CLOUD Act/FISA",
    question:
      "L'éditeur ou l'hébergeur est-il exposé à une législation extraterritoriale ou à une gouvernance non maîtrisée ?",
    sources: ["IRN — aDRI 2026", "EU Score", "CLOUD Act / FISA"],
  },
  {
    code: "C3",
    field: "interoperability",
    label: "Interopérabilité & réversibilité",
    scale: "0 standards ouverts → 5 fermé",
    question:
      "Les données et interfaces peuvent-elles être exportées, migrées et réutilisées avec des standards ouverts ?",
    sources: ["CI-SIS / ANS", "HL7 FHIR", "DICOM", "HPRIM", "SQL standard"],
  },
  {
    code: "C4",
    field: "operational_dependency",
    label: "Dépendance opérationnelle & MCO",
    scale: "0 interne/communauté → 5 mono-éditeur",
    question:
      "Le maintien en condition opérationnelle repose-t-il sur des compétences internes, une communauté, ou un fournisseur unique ?",
    sources: ["IRN — Compétences & Écosystème", "MaturiN-H"],
  },
  {
    code: "C5",
    field: "business_criticality",
    label: "Criticité métier",
    scale: "1 faible · 3 moyenne · 5 vitale",
    question:
      "Quel serait l'impact d'une indisponibilité ou d'une compromission sur la continuité des soins ?",
    sources: ["CaRE / HAS", "DICP", "Mercator — security_need_a"],
  },
];

export const METHODOLOGY_SOURCES: MethodologySource[] = [
  {
    short: "SILL / DINUM",
    title: "Socle Interministériel de Logiciels Libres",
    publisher: "DINUM",
    usage: "Évaluation des licences, de l'ouverture du code et des alternatives libres (C1).",
  },
  {
    short: "FLOSS Criteria",
    title: "Grille d'évaluation des logiciels libres",
    publisher: "Référentiel FLOSS Criteria",
    usage: "Critères de liberté, de communauté et de pérennité du code (C1).",
  },
  {
    short: "EU Score",
    title: "European open source assessment",
    publisher: "Référentiel EU Score",
    usage: "Lecture européenne de la souveraineté, de la gouvernance et de la réversibilité (C1, C2).",
  },
  {
    short: "IRN — aDRI 2026",
    title: "Indice de Résilience Numérique",
    publisher: "aDRI 2026",
    usage: "Exposition juridictionnelle, compétences, écosystème et résilience fournisseur (C2, C4).",
  },
  {
    short: "CLOUD Act / FISA",
    title: "Lois américaines d'accès extraterritorial aux données",
    publisher: "États-Unis",
    usage: "Qualification des risques juridictionnels des éditeurs et hébergeurs soumis au droit américain (C2).",
  },
  {
    short: "CI-SIS / ANS",
    title: "Cadre d'Interopérabilité des Systèmes d'Information de Santé",
    publisher: "Agence du Numérique en Santé",
    usage: "Référentiel d'interopérabilité et de sécurité des échanges de santé (C3).",
  },
  {
    short: "HL7 FHIR",
    title: "Fast Healthcare Interoperability Resources",
    publisher: "HL7",
    usage: "Standard d'échange et d'exposition des données de santé (C3).",
  },
  {
    short: "DICOM",
    title: "Digital Imaging and Communications in Medicine",
    publisher: "DICOM Standards Committee",
    usage: "Standard d'imagerie médicale et de réversibilité des données (C3).",
  },
  {
    short: "HPRIM",
    title: "Standard d'échanges laboratoire",
    publisher: "HPRIM",
    usage: "Interopérabilité des systèmes de laboratoire (C3).",
  },
  {
    short: "SQL standard",
    title: "Norme ISO/IEC 9075",
    publisher: "ISO / IEC",
    usage: "Réversibilité et portabilité des données relationnelles (C3).",
  },
  {
    short: "MaturiN-H",
    title: "Grille de maturité numérique hospitalière",
    publisher: "ANAP / ANS",
    usage: "Maturité, compétences et gouvernance des systèmes hospitaliers (C4, C5, pondération des couches).",
  },
  {
    short: "CaRE / HAS",
    title: "Critères d'évaluation de la qualité et de la résilience",
    publisher: "Haute Autorité de Santé",
    usage: "Criticité métier et impact sur la continuité des soins (C5).",
  },
  {
    short: "DICP",
    title: "Données et processus critiques",
    publisher: "Référentiel DICP",
    usage: "Qualification de la criticité des données et des processus hospitaliers (C5).",
  },
  {
    short: "Mercator",
    title: "security_need_a — besoin de disponibilité",
    publisher: "Cartographie Mercator",
    usage: "Pré-remplissage de la criticité métier importée : 1 → 1, 2 → 3, 3/4 → 5 (C5).",
  },
];

export const METHODOLOGY_FORMULAS = {
  base: "B = (C1 + C2 + C3 + C4) / 4",
  factor: "F = 0,5 + 0,5 × (C5 / 5)",
  unit: "Score unitaire = arrondi((B / 5) × F × 100, 2)",
  layer: "Score couche = Σ(Score unitaire × C5) / Σ(C5)",
  global:
    "Score global = Σ(poids couche × score couche) / Σ(poids des couches non vides)",
  weights: "Infrastructure 25 % · Supports 30 % · Métier 45 %",
} as const;
