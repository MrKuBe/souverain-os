# AGENTS.md — SouverainOS

> **SouverainOS — Audit de Dépendance Numérique des SIH**
> Projet imaginé et conçu par **Bertrand Kuzbinski** (Responsable des Systèmes Numériques /
> Chef de Service Informatique hospitalier), dans le cadre de sa thèse professionnelle.
> Développé en **Vibecoding — Full-Stack Open Source**.

Ce fichier est le contrat de maintenance du projet. Tout agent (humain ou IA) qui modifie le
code doit lire ce document avant d'agir et préserver les règles métier, de sécurité et de
souveraineté décrites ici. Toute évolution de la formule de score, du mapping d'import ou du
modèle de sécurité impose une mise à jour explicite de ce fichier et des tests associés.

---

## 1. Règles non négociables

1. **100 % Open Source.** Toutes les dépendances doivent être sous licence libre OSI
   (GPL, MIT, Apache-2.0, BSD, MPL, etc.). Interdiction d'introduire une dépendance
   propriétaire, un SDK privateur ou une bibliothèque soumise à redevance.
2. **Zéro cloud tiers, zéro télémétrie, zéro IdP SaaS externe.**
   - Pas de Vercel, pas d'API Edge propriétaire, pas d'analytics hébergé, pas de Sentry SaaS,
     pas d'Auth0/Okta/Entra ID, pas de CDN obligatoire, pas de Google Fonts distant.
   - L'application doit fonctionner intégralement sur une infrastructure hospitalière
     auto-hébergée (Podman / Docker / Kubernetes OCI), y compris sans accès Internet.
   - Les polices et assets doivent être locaux ou fournis par la stack.
3. **Souveraineté des données.** Les audits réels (`is_demo=False`) ne quittent jamais
   l'infrastructure du GHT. Aucune télémétrie applicative, aucun appel sortant implicite.
   Les seuls appels sortants sont explicitement déclenchés par un utilisateur authentifié :
   connexion LDAP et import Mercator.
4. **Cloisonnement Démo / Réel.** Le jeu de démonstration (`is_demo=True`) est public,
   **strictement en lecture seule** (aucune écriture, même pour un administrateur).
   Les audits réels sont privés et soumis au RBAC.
5. **Traçabilité.** Connexions, imports, modifications, suppressions, exports et changements
   de configuration sont journalisés dans `audit_logs`. Ne jamais journaliser de mot de passe,
   token, clé ou secret.
6. **Pas de lock-in.** Le frontend est un build Next.js `standalone` autonome, la base est
   PostgreSQL standard, l'API est REST/OpenAPI. Aucune dépendance à un fournisseur de cloud.

---

## 2. Architecture

```
souverain-os/
├── AGENTS.md                 # Ce contrat de maintenance
├── LICENSE                   # GPL-3.0-or-later
├── README.md
├── VERSION                   # Source unique de version (vX.Y.Z)
├── .env.example
├── .dockerignore
├── compose.yaml              # Orchestration Podman/Docker (dev hot-reload)
├── compose.rootless.yaml     # Override Podman rootless (userns_mode: keep-id)
├── backend/
│   ├── Containerfile         # Image OCI production
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml        # Config Ruff / Pytest
│   ├── app/
│   │   ├── main.py           # Application FastAPI, lifespan, middlewares
│   │   ├── core/
│   │   │   ├── config.py     # Pydantic Settings (.env)
│   │   │   ├── database.py   # Engine SQLModel + session
│   │   │   ├── security.py   # Argon2, JWT, cookies, CSRF, chiffrement Fernet
│   │   │   └── version.py    # Lecture/validation de VERSION
│   │   ├── models/           # Tables SQLModel
│   │   ├── schemas/          # Contrats Pydantic v2 (entrée/sortie)
│   │   ├── services/
│   │   │   ├── auth.py       # Auth locale + LDAP/LDAPS, résolution RBAC
│   │   │   ├── scoring.py    # LOGIQUE MÉTIER DU SCORE (source de vérité)
│   │   │   ├── importers.py  # Mercator API/fichier, CSV/JSON génériques
│   │   │   ├── exports.py    # Rapports JSON / Markdown / CSV
│   │   │   └── seed.py       # Admin initial + données fictives du GHT démo
│   │   └── api/
│   │       ├── deps.py       # Dépendances auth, RBAC, CSRF, accès audit
│   │       └── routes/       # auth, audits, applications, dashboard, import,
│   │                         # simulation, exports, admin
│   └── tests/                # Tests unitaires (scoring, importers, version, exports)
└── frontend/                 # Next.js App Router autonome (Node.js 22+)
    ├── Containerfile         # multi-stage dev + production standalone
    ├── next.config.mjs
    ├── scripts/              # Synchronisation/contrôle de version
    ├── app/                  # accueil, audits/[id]/{dashboard,cartographie,simulation}, admin
    ├── components/           # ui, auth, layout, dashboard, cartographie, simulation,
    │                         # méthodologie, admin
    └── lib/                  # API SSR/navigateur, types, labels, critères, méthodologie
```

**Séparation stricte :**
- Les routes ne contiennent **aucune** logique métier de score ou de mapping.
- `services/scoring.py` est l'unique implémentation de la formule de score.
- `services/importers.py` est l'unique implémentation du mapping Mercator/CSV/JSON.
- `core/security.py` contient les primitives cryptographiques et sessions.
- `services/auth.py` contient l'authentification locale et l'annuaire.
- Le frontend ne recalcule jamais le score : il consomme l'API.

---

## 3. Stack et contraintes techniques

| Couche | Technologie | Contraintes |
|---|---|---|
| Frontend | Next.js App Router, TypeScript strict, Tailwind CSS, Node.js 22+ | `output: 'standalone'`, images `unoptimized`, aucune dépendance Vercel. Icônes `lucide-react`, graphiques `recharts` uniquement. |
| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLModel | Typage systématique, OpenAPI exposé sur `/docs` avec Swagger UI auto-hébergé (sans CDN). ReDoc désactivé. |
| Base | PostgreSQL 16 | Initialisation automatique + seed idempotent. |
| Conteneurs | OCI (Podman/Docker) | Dev : volumes sources + hot-reload. Prod : images autonomes non-root. |

Le titre OpenAPI doit rester : **« SouverainOS API — Auteur : Bertrand Kuzbinski »**.

---

## 4. Sécurité, cloisonnement et RBAC

### 4.1 Modes d'authentification (`AUTH_MODE`)

- `local` : uniquement les comptes locaux (Argon2).
- `ldap` : uniquement l'annuaire LDAP/LDAPS.
- `hybrid` (défaut) : priorité stricte au compte local. Si un compte local existe pour le
  login, seule son authentification locale est tentée : aucun repli LDAP. Si aucun compte
  local n'existe (ou si le compte trouvé est de source `ldap`), l'annuaire est sollicité
  uniquement lorsque `AUTH_ALLOW_LDAP_FALLBACK=true`. En mode `ldap`, un login en collision
  avec un compte local est refusé : le local conserve toujours la priorité.

Les comptes locaux utilisent **Argon2** via `pwdlib`. Un administrateur initial est créé au
démarrage depuis `ADMIN_USERNAME` / `ADMIN_PASSWORD` (jamais écrasé ensuite).

### 4.2 Rôles

| Rôle | Lecture audits réels | Écriture cartographie | Création/suppression audit | Logs & utilisateurs | Exports réels |
|---|---|---|---|---|---|
| `admin_ght` | oui | oui | créer + supprimer | oui | oui |
| `auditeur` | oui | oui | créer | non | oui |
| `lecteur_direction` | oui | non | non | non | oui |

Le rôle par défaut d'un utilisateur LDAP sans groupe reconnu est `lecteur_direction`
(`LDAP_DEFAULT_ROLE`). Les groupes LDAP sont comparés au DN ou au `cn` configuré.

### 4.3 Cloisonnement des données

- `GET` sur un audit `is_demo=True` : **public**, y compris score, dashboard, simulation et
  export JSON/Markdown/CSV.
- `GET` sur un audit `is_demo=False` : authentification obligatoire (tout rôle).
- Toute écriture (audit, brique, import) : authentification + CSRF + rôle `admin_ght` ou
  `auditeur`.
- Toute écriture sur un audit démo est refusée (`403`) **même pour un admin**.
- `DELETE` d'un audit réel : `admin_ght` uniquement.
- `audit_logs` : lecture réservée à `admin_ght`.
- La simulation What-If ne persiste rien et est donc autorisée sur la démo publique.

### 4.4 Sessions

- JWT signé **HS256** par défaut, **RS256** possible via fichiers PEM
  (`JWT_ALGORITHM`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`).
- Jeton dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` piloté par `COOKIE_SECURE`
  (obligatoire en production HTTPS).
- Support complémentaire `Authorization: Bearer <token>` pour les clients API automatisés.
- **CSRF double-submit** : cookie lisible `souverainos_csrf` + header `X-CSRF-Token` exigé
  sur toute requête mutante authentifiée par cookie. Les requêtes Bearer en sont exemptées.
- Déconnexion : suppression des cookies + journalisation.

### 4.5 Secrets

- `SECRET_KEY` sert à signer les JWT HS256 **et** à dériver la clé Fernet des secrets
  Mercator : `fernet_key = urlsafe_b64encode(SHA-256(SECRET_KEY))`.
- Les tokens/mots de passe Mercator ne sont jamais renvoyés par l'API ni journalisés.
- Changer `SECRET_KEY` invalide les sessions et rend les secrets Mercator illisibles :
  opération de rotation à documenter et planifier.
- `MERCATOR_VERIFY_TLS` et `LDAP_TLS_VALIDATE` doivent rester à `true` en production ;
  les passer à `false` uniquement pour un CA interne maîtrisé, avec justification.

### 4.6 En-têtes HTTP

Le backend applique : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `Permissions-Policy` restrictive, CSP `default-src 'none'`
pour l'API, HSTS si HTTPS, `Cache-Control: no-store` sur l'authentification.
Le frontend applique sa propre CSP et ne charge aucune ressource distante.

---

## 5. Modèle de données (tables)

- `users` : `username` unique, `email`, `full_name`, `hashed_password` (nullable pour LDAP),
  `role`, `auth_source` (`local`/`ldap`), `is_active`, horodatages.
- `audits` : `name`, `description`, `ght_name`, `establishments` (JSON), `is_demo`,
  `created_by_id`, horodatages. `is_demo` est immuable via l'API.
- `application_bricks` : `audit_id`, identité (`name`, `description`, `editor`, `technology`,
  `app_type`, `responsible`, `establishment`), `layer` (`infrastructure`/`supports`/`metier`),
  `external`, `source` (`manuel`/`mercator`/`csv`/`json`), `status`
  (`a_valider`/`valide`), `mercator_id`, `security_need_a`, les 5 critères, `notes`.
- `audit_logs` : `user_id` nullable, `username` figé, `action`, `target_type`, `target_id`,
  `detail` JSON, `ip_address`, `user_agent`, `created_at`.
- `mercator_configs` : URL, mode d'auth, secrets **chiffrés Fernet**, `verify_tls`,
  créateur, dernier usage.

`application_bricks.layer` doit être l'une des trois valeurs exactes ci-dessus. Les couches
et pondérations sont centralisées dans `scoring.py` (`LAYER_WEIGHTS`) — ne pas les dupliquer.

---

## 6. Formule de score — SOURCE DE VÉRITÉ

Implémentation : `backend/app/services/scoring.py`. Toute modification doit être testée dans
`backend/tests/test_scoring.py` et documentée ici.

### 6.1 Critères par brique

| Critère | Champ | Échelle |
|---|---|---|
| C1 — Licence & code | `license_model` | 0 (libre) → 5 (SaaS fermé) |
| C2 — Juridiction & gouvernance | `jurisdiction` | 0 (FR/UE) → 5 (CLOUD Act/FISA) |
| C3 — Interopérabilité & réversibilité | `interoperability` | 0 (standards ouverts) → 5 (fermé) |
| C4 — Dépendance opérationnelle & MCO | `operational_dependency` | 0 (interne/communauté) → 5 (mono-éditeur) |
| C5 — Criticité métier GHT | `business_criticality` | **1** (faible), **3** (moyenne), **5** (vitale) |

C1 à C4 sont des entiers de 0 à 5. C5 est restreint à `{1, 3, 5}`.

### 6.2 Score unitaire d'une application (0–100)

Soit `B = (C1 + C2 + C3 + C4) / 4` (moyenne brute, 0–5).
Soit `F = 0.5 + 0.5 × (C5 / 5)` → `F = 0.6` (C5=1), `0.8` (C5=3), `1.0` (C5=5).

```
Score_unitaire = arrondi( (B / 5) × F × 100 , 2 )
```

La criticité agit comme **coefficient multiplicateur pondéré** : une brique vitale voit son
score de dépendance amplifié (facteur 1.0), une brique peu critique atténuée (facteur 0.6).
Le score reste borné à 100.

### 6.3 Score d'une couche

Moyenne des scores unitaires pondérée par la criticité métier :

```
Score_couche = arrondi( Σ(Score_unitaire_i × C5_i) / Σ(C5_i) , 2 )
```

### 6.4 Score global du GHT

Pondérations officielles : **Infrastructure 25 %, Supports 30 %, Métier 45 %**.

```
Score_global = arrondi( Σ(w_L × Score_couche_L) / Σ(w_L) , 2 )
```

`w_L` ne somme que sur les couches **non vides**, puis est renormalisé. Un audit sans aucune
brique retourne `global_score = 0`, `evaluated = false`. Les poids affichés restent les poids
officiels.

### 6.5 Classification (seuils continus)

| Score | Libellé | Couleur |
|---|---|---|
| `≤ 25` | Souveraineté maîtrisée | `green` |
| `≤ 50` | Dépendance modérée / Hybride | `blue` |
| `≤ 75` | Dépendance élevée | `orange` |
| `> 75` | Verrouillage critique / Risque systémique | `red` |

Un audit sans aucune brique n'est **pas évalué** : `global_score = 0`,
`evaluated = false`, aucune couche n'a de score, et la classification affichée est
**« Non évalué »** avec la couleur `gray`.

### 6.6 Axes du radar

Pour chaque critère C1→C5, axe = moyenne du critère normalisé sur 100 :
`axe = arrondi( moyenne(C / 5 × 100), 2 )`. L'axe C5 représente l'intensité de criticité du
portefeuille, pas un risque de dépendance à lui seul.

### 6.7 Top vulnérabilités

Tri décroissant par score unitaire, puis par criticité, puis par nom. Maximum 5 briques.
Le « risque principal » est le critère C1–C4 le plus élevé (en cas d'égalité, l'ordre
C2 juridiction, C1 licence, C4 MCO, C3 interopérabilité).

### 6.8 Transparence méthodologique dans l'interface

Le frontend expose une fiche « Méthodologie & Sources » et des tooltips contextuels sur le
dashboard, la cartographie, le formulaire de brique et la simulation. Les contenus sont
centralisés dans `frontend/lib/methodology.ts` et ne doivent pas dupliquer la logique de
calcul : formules, seuils et sources sont descriptifs, les valeurs restent calculées par
`scoring.py`.

Références affichées : SILL/DINUM, FLOSS Criteria, EU Score, IRN/aDRI 2026,
CLOUD Act/FISA, CI-SIS/ANS, HL7 FHIR, DICOM, HPRIM, SQL standard, MaturiN-H, CaRE/HAS,
DICP et `security_need_a` Mercator. Les tooltips doivent rester accessibles au clavier et
ne chargent aucune ressource distante.

---

## 7. Mapping d'import — RÈGLES OFFICIELLES

Implémentation : `backend/app/services/importers.py`.

### 7.1 Connecteur Mercator

Deux modes d'authentification supportés :
1. `POST {base_url}/api/login` avec `{"login": "...", "password": "..."}`,
   headers `Accept: application/json` / `Content-Type: application/json`, puis extraction de
   `access_token` (tolérance `token` / `data.access_token`).
2. `Authorization: Bearer <Personal Access Token>` direct.

Collecte, avec `Accept: application/json` :
`GET /api/applications`, `/api/application-blocks`, `/api/databases`, `/api/logical-servers`.
La pagination Laravel (`data`, `meta.last_page`, `links.next`) est suivie ; les réponses
tableau simple sont acceptées. Limite de sécurité : 100 pages par endpoint.

Champs mappés : `name`, `description`, `technology`, `type`, `responsible`,
`vendor` → `cpe_vendor` → `cpe_product` (fallback éditeur), `external`, `security_need_a`,
`id` → `mercator_id`.

### 7.2 Criticité métier Mercator

`security_need_a` (Disponibilité, 1–4) → C5 : `1 → 1`, `2 → 3`, `3 → 5`, `4 → 5`.
Valeur absente/invalide → `3` avec avertissement.

### 7.3 Déduction de la couche

1. Objets issus de `databases` et `logical-servers` → **`infrastructure`**.
2. Sinon, mots-clés **métier** prioritaires → `metier` :
   `dpi`, `dossier patient`, `sgl`, `laboratoire`, `lims`, `pacs`, `ris`, `imagerie`,
   `dicom`, `gam`, `pharmacie`, `biomédical`, `gmao`, `soins`, `patient`, `urgences`,
   `bloc`, `maternité`, `télémédecine`, `portail patient`, `stérilisation`, `oncologie`.
3. Puis mots-clés **supports** → `supports` :
   `messagerie`, `mail`, `exchange`, `m365`, `microsoft 365`, `teams`, `visio`,
   `collaboration`, `nextcloud`, `bluemind`, `ged`, `bureautique`, `office`, `libreoffice`,
   `itsm`, `cmdb`, `glpi`, `helpdesk`, `service desk`, `intranet`, `sharepoint`, `wiki`.
4. Puis mots-clés **infrastructure** → `infrastructure` :
   `serveur`, `server`, `hyperviseur`, `vmware`, `proxmox`, `base de données`, `database`,
   `oracle`, `postgres`, `mysql`, `sql server`, `annuaire`, `active directory`, `ldap`,
   `freeipa`, `samba`, `stockage`, `sauvegarde`, `réseau`, `firewall`, `pare-feu`,
   `hébergement`, `cloud`, `kubernetes`, `docker`, `linux`, `windows server`.
5. Défaut : **`supports`**.

La recherche est insensible à la casse et aux accents. Le mot-clé métier gagne toujours
(« serveur PACS » = métier).

### 7.4 Pré-scoring heuristique

Les briques importées sont marquées `status = "a_valider"` et `source = "mercator"`.
Les heuristiques ci-dessous sont **indicatives**, jamais définitives :

- **Licence** : technologies libres connues (PostgreSQL, MariaDB, Linux, Proxmox, GLPI,
  Nextcloud, Samba, FreeIPA, Apache, Nginx, Orthanc, etc.) → 0 ; éditeurs propriétaires
  → 4 ; SaaS externe propriétaire → 5 ; inconnu → 2.
- **Juridiction** : éditeurs/organisations UE/FR → 0 ; éditeurs américains
  (Microsoft, Oracle, VMware/Broadcom, Google, AWS, Cisco, SAP? — SAP = UE) → 5 ;
  inconnu → 2.
- **Interopérabilité** : standards explicites (FHIR, HL7, DICOM, SQL, OpenAPI, export) → 0 ;
  API documentée ou SaaS → 3 ; inconnu → 3.
- **MCO** : écosystème libre/communauté → 0–1 ; éditeur unique/SaaS → 5 ; inconnu → 3.
- **Criticité** : cf. 7.2.
- Chaque brique importée porte une note expliquant les heuristiques appliquées.

Dédoublonnage : clé normalisée (nom sans casse/accents + couche). Les doublons sont ignorés
et comptés dans le rapport. Un import ne supprime jamais de brique existante.

### 7.5 CSV générique

- Encodage UTF-8 (BOM accepté), séparateur `;` ou `,` auto-détecté.
- Colonnes canoniques : `name`, `layer`, `establishment`, `description`, `editor`,
  `technology`, `app_type`, `responsible`, `external`, `license_model`, `jurisdiction`,
  `interoperability`, `operational_dependency`, `business_criticality`, `status`, `notes`.
- Alias français acceptés : `nom`, `couche`, `etablissement`, `editeur`, `technologie`,
  `type`, `responsable`, `externe`, `modele_licence`, `juridiction`, `interoperabilite`,
  `dependance_operationnelle`, `criticite`, `statut`.
- `layer` accepte `infrastructure|infra|couche1`, `supports|support|couche2`,
  `metier|métier|couche3`.
- `external` accepte `true/false`, `oui/non`, `1/0`, `yes/no`.
- `business_criticality` doit valoir 1, 3 ou 5 (valeurs 2/4 refusées ou ramenées ? —
  **refusées** : la grille officielle n'autorise que 1, 3, 5).
- Les lignes valides sont importées, les lignes invalides sont listées avec leur numéro.
- Un gabarit CSV vierge est téléchargeable via l'API.

### 7.6 JSON générique et export Mercator

- JSON générique : tableau de briques ou objet `{"applications": [...]}`.
- Export Mercator : objet contenant `applications`, `application-blocks`, `databases`,
  `logical-servers` ; même mapping que l'API.
- Taille maximale configurable (`MAX_IMPORT_ROWS`, défaut 5000).

---

## 8. Conventions de code

### Backend

- Python 3.12+, annotations complètes, pas de `Any` non justifié.
- Pydantic v2 / SQLModel ; les schémas d'entrée valident les échelles métier.
- Les erreurs API utilisent le format FastAPI `{"detail": "..."}` (messages en français).
- Les routes sont minces : validation → service → réponse. Journaliser les actions sensibles.
- Dates en UTC, sérialisation ISO 8601.
- Aucun secret dans les logs, réponses, messages d'erreur ou rapports d'import.
- Tests : `pytest`, fonctions pures privilégiées. Lancer `ruff check app tests` et `pytest`.
- Ne pas créer de table ou de champ sans mettre à jour ce document et le seed si pertinent.

### Frontend

- TypeScript `strict`, pas de `any`, composants serveur par défaut, client uniquement si
  interaction (simulateur, formulaires, thème).
- Aucun appel direct à un service tiers ; toutes les données passent par l'API SouverainOS.
- Identité visuelle sobre, accessible (contrastes AA), responsive, thème clair/sombre.
- Mentions obligatoires : en-tête « SouverainOS — Audit de Dépendance Numérique des SIH »,
  bandeau de contexte. Footer exact :
  `SouverainOS vX.Y.Z — Conçu par Bertrand Kuzbinski (Vibecoding — Full-Stack Open Source)`,
  où `X.Y.Z` provient exclusivement de `VERSION`.
- Les composants de méthodologie ne chargent aucune ressource distante et respectent
  l'accessibilité clavier (focus, Escape, fermeture hors zone).

### Versioning et releases

- `VERSION` à la racine est l'unique source de version, format strict `vMAJOR.MINOR.PATCH`.
- La version est exposée par `/healthz`, `/docs` (OpenAPI), les exports JSON/Markdown/CSV,
  `frontend/package.json`, `frontend/package-lock.json` et le footer.
- `npm run version:sync` aligne les manifests frontend ; `npm run version:check` échoue si
  `VERSION` et les manifests divergent. Le build exécute ce contrôle via `prebuild`.
- Convention : `v0.x.y` pendant le développement, `v1.0.0` pour la soutenance.
- Chaque release utilise un **tag Git annoté** (`git tag -a vX.Y.Z -m "..."`), jamais un
  tag léger. Un tag publié n'est jamais déplacé : incrémenter la version.
- Les contextes Docker sont la racine du dépôt afin que `VERSION` soit inclus dans les
  images backend et frontend. `VERSION` est copié dans `/etc/souverainos/VERSION`, hors
  des volumes de sources : un changement de version impose de reconstruire les images.

---

## 9. Exploitation

### Développement (hot-reload)

```bash
cp .env.example .env
# éditer les secrets
podman compose up --build        # ou docker compose up --build
# Podman rootless : ajouter -f compose.rootless.yaml
# Frontend : http://localhost:3000
# API/docs  : http://localhost:8000/docs
```

SELinux : les volumes de sources utilisent `:Z` (label privé). L'override
`compose.rootless.yaml` applique `userns_mode: keep-id` sous Podman uniquement ; ne pas
désactiver SELinux et ne pas utiliser `--privileged` pour contourner un problème de droits.

### Vérifications backend

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
ruff check app tests
pytest -q
```

### Vérifications frontend

Node.js 22+ est requis (Tailwind CSS 4). Le build échoue sous Node 20.18.

```bash
cd frontend
npm ci
npm run version:check
npm run typecheck
npm run build
```

### Production

- Builder les images sans le montage des sources (cibles finales des Containerfiles) avec
  la racine du dépôt comme contexte afin d'inclure `VERSION` :
  `podman build -f backend/Containerfile -t souverainos-backend .` et
  `podman build --target runner -f frontend/Containerfile ... .`
- Frontend : builder la cible `runner` avec l'URL publique de l'API
  (`--build-arg NEXT_PUBLIC_API_URL=https://api.example.fr`), puis fournir au runtime
  `API_INTERNAL_URL` pour les appels SSR internes ; le CSP est figé au build.
- Servir exclusivement en HTTPS (reverse proxy open source : Caddy, Traefik, Nginx).
- `COOKIE_SECURE=true`, `ENVIRONMENT=production`, `SEED_ON_STARTUP=false` après le premier
  déploiement, `SECRET_KEY` fort et sauvegardé, secrets dans un gestionnaire interne.
- Restreindre l'accès réseau : la base ne doit jamais être exposée hors du réseau interne.
- Ajouter un rate-limiting des connexions au niveau du reverse proxy (ou Redis interne si
  plusieurs réplicas) — non implémenté dans le MVP mono-processus.
- Sauvegarder la base PostgreSQL et tester la restauration.
- Vérifier la conformité RGPD/ANSSI/HDS de l'hébergement avant tout audit réel.

---

## 10. Definition of Done d'une évolution

1. La logique métier reste dans `scoring.py` / `importers.py` ; aucune duplication.
2. Les tests unitaires couvrent la nouvelle règle (score, mapping, sécurité, version).
3. `ruff check`, `pytest`, `npm run version:check`, `npm run typecheck` et `npm run build`
   passent.
4. Aucun identifiant, token ou donnée patient dans les fixtures ou les logs.
5. Ce document est mis à jour si une règle métier, de sécurité, d'import ou de versioning
   change.
6. Le cloisonnement Démo / Réel et le mode lecture seule de la démo sont vérifiés.
7. La fiche « Méthodologie & Sources », les tooltips et le footer restent synchronisés avec
   `VERSION` et les sources documentées.
