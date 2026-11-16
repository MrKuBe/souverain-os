export interface CriterionOption {
  value: number;
  label: string;
  description: string;
}

export interface CriterionDefinition {
  key: "license_model" | "jurisdiction" | "interoperability" | "operational_dependency";
  label: string;
  shortLabel: string;
  description: string;
  options: CriterionOption[];
}

export const DEPENDENCY_CRITERIA: CriterionDefinition[] = [
  {
    key: "license_model",
    label: "Licence & code",
    shortLabel: "Licence",
    description: "Liberté du code, ouverture des sources et réversibilité juridique du modèle de licence.",
    options: [
      { value: 0, label: "Libre", description: "Logiciel libre, code ouvert, licence OSI." },
      { value: 1, label: "Open core", description: "Composants libres majoritaires, extension propriétaire." },
      { value: 2, label: "Mixte / inconnu", description: "Modèle partiellement ouvert ou à confirmer." },
      { value: 3, label: "Propriétaire réversible", description: "Licence fermée avec clause de réversibilité." },
      { value: 4, label: "Propriétaire fermé", description: "Licence propriétaire sans garantie de réversibilité." },
      { value: 5, label: "SaaS fermé", description: "Service externe fermé, code et données non maîtrisés." },
    ],
  },
  {
    key: "jurisdiction",
    label: "Juridiction & gouvernance",
    shortLabel: "Juridiction",
    description: "Pays de rattachement de l'éditeur et exposition aux législations extraterritoriales.",
    options: [
      { value: 0, label: "France / UE", description: "Éditeur ou communauté sous gouvernance européenne." },
      { value: 1, label: "UE avec gouvernance partagée", description: "Chaîne de valeur majoritairement européenne." },
      { value: 2, label: "Mixte / inconnu", description: "Juridiction non documentée ou multi-éditeurs." },
      { value: 3, label: "Pays allié hors CLOUD Act", description: "Pays tiers sans législation extraterritoriale majeure." },
      { value: 4, label: "Zone à risque", description: "Exposition juridique partielle ou indirecte." },
      { value: 5, label: "CLOUD Act / FISA", description: "Éditeur soumis aux législations américaines." },
    ],
  },
  {
    key: "interoperability",
    label: "Interopérabilité & réversibilité",
    shortLabel: "Interopérabilité",
    description: "Capacité à exporter, migrer et s'interfacer sans dépendance à un format fermé.",
    options: [
      { value: 0, label: "Standards ouverts", description: "FHIR, HL7, DICOM, SQL, OpenAPI ou export complet." },
      { value: 1, label: "Standards documentés", description: "Standards ouverts sur les flux principaux." },
      { value: 2, label: "Export partiel", description: "Export disponible mais incomplet ou non documenté." },
      { value: 3, label: "API documentée", description: "API ou export documenté, sans standard ouvert complet." },
      { value: 4, label: "Export limité", description: "Migration complexe ou dépendante de l'éditeur." },
      { value: 5, label: "Fermé", description: "Format ou interface fermés, réversibilité non garantie." },
    ],
  },
  {
    key: "operational_dependency",
    label: "Dépendance opérationnelle & MCO",
    shortLabel: "MCO",
    description: "Dépendance à un fournisseur unique pour le maintien en condition opérationnelle.",
    options: [
      { value: 0, label: "Interne / communauté", description: "Compétences internes ou communauté libre active." },
      { value: 1, label: "Support communautaire", description: "Support principalement communautaire et documenté." },
      { value: 2, label: "Multi-fournisseurs", description: "Plusieurs intégrateurs ou prestataires possibles." },
      { value: 3, label: "Mixte / inconnu", description: "MCO partagé ou à confirmer." },
      { value: 4, label: "Mono-intégrateur", description: "MCO dépendant d'un intégrateur unique." },
      { value: 5, label: "Mono-éditeur / SaaS", description: "MCO et évolution dépendants d'un seul éditeur." },
    ],
  },
];

export const CRITICALITY_OPTIONS = [
  { value: 1, label: "Faible", description: "Impact limité en cas d'indisponibilité." },
  { value: 3, label: "Moyenne", description: "Impact significatif sur l'activité hospitalière." },
  { value: 5, label: "Vitale", description: "Continuité des soins ou sécurité directement affectée." },
] as const;

export interface AllCriterionDefinition {
  key:
    | "license_model"
    | "jurisdiction"
    | "interoperability"
    | "operational_dependency"
    | "business_criticality";
  label: string;
  shortLabel: string;
  description: string;
  options: CriterionOption[];
}

export const ALL_CRITERIA: AllCriterionDefinition[] = [
  ...DEPENDENCY_CRITERIA,
  {
    key: "business_criticality",
    label: "Criticité métier",
    shortLabel: "Criticité",
    description: "Criticité hospitalière de la brique, utilisée comme coefficient multiplicateur.",
    options: CRITICALITY_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      description: option.description,
    })),
  },
];
