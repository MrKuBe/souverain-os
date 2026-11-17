# SouverainOS — Audit de Dépendance Numérique des SIH

<p>
  <img src="./docs/badges/version.svg" alt="Version v0.3.0" />
  <img src="./docs/badges/license.svg" alt="Licence GPL-3.0-or-later" />
</p>

> Projet imaginé et conçu par **Bertrand Kuzbinski** (Responsable des Systèmes Numériques /
> Chef de Service Informatique hospitalier), dans le cadre de sa thèse professionnelle.
> Développé en **Vibecoding — Full-Stack Open Source** avec **OpenCode**, et l'assistance
> d'un **modèle de langage Open Weight** (poids ouverts). Les choix de conception, les
> règles métier et la validation finale restent humains.

SouverainOS mesure la dépendance numérique d'un Groupement Hospitalier de Territoire (GHT)
à partir d'une cartographie applicative en trois couches : **Infrastructure (25 %)**,
**Supports (30 %)** et **Métier (45 %)**. Chaque brique est notée sur cinq critères
(licence, juridiction, interopérabilité, MCO, criticité) ; le score global est classé de
« Souveraineté maîtrisée » à « Verrouillage critique ».

La version **v0.3.0** ajoute la fiche « Méthodologie & Sources » accessible depuis toutes les
pages, des explications contextuelles sur les scores et critères, un versioning sémantique
centralisé et une documentation d'exploitation Podman rootless/SELinux renforcée.

## Garanties

- 100 % open source, **GPL-3.0-or-later**, auto-hébergeable (Podman / Docker / OCI).
- Aucun cloud tiers, aucune télémétrie, aucun IdP SaaS.
- Démonstration publique strictement en lecture seule ; audits réels privés et journalisés.
- Authentification locale Argon2 + LDAP/LDAPS (AD, OpenLDAP, FreeIPA), JWT, CSRF.
- Import Mercator (API ou export fichier), CSV/JSON, export JSON/Markdown/CSV.
- Formule de score et règles d'import figées dans [`AGENTS.md`](./AGENTS.md) et couvertes
  par les tests.
- Références et méthode consultables directement dans l'application, sans ressource
  distante.
- Signalement privé des vulnérabilités via la politique [`SECURITY.md`](./SECURITY.md).

### Données de démonstration et marques

Les audits de démonstration (`is_demo=true`), leurs établissements et leurs applications
sont fictifs et ne contiennent aucune donnée patient réelle. Les noms de produits et marques
cités restent la propriété de leurs titulaires et servent uniquement à illustrer la méthode
d'analyse. Aucun résultat de démonstration ne constitue une évaluation officielle d'un
fournisseur.

## Démarrage (développement, hot-reload)

Prérequis : Podman 4+ (ou Docker), Podman Compose, Node.js 22+ pour les vérifications
frontend locales.

```bash
cp .env.example .env
# Remplacer SECRET_KEY, POSTGRES_PASSWORD et ADMIN_PASSWORD
podman compose up --build        # ou docker compose up --build
```

- Frontend : <http://localhost:3000>
- API / OpenAPI : <http://localhost:8000/docs>
- Healthcheck : <http://localhost:8000/healthz>

Au premier démarrage, les tables sont créées, l'administrateur local est créé depuis
`ADMIN_USERNAME` / `ADMIN_PASSWORD`, et le GHT fictif de démonstration est chargé
(`SEED_ON_STARTUP=true`, idempotent).

### Podman rootless, SELinux et droits des volumes

Le projet est conçu pour tourner sans privilèges. Sur Fedora/RHEL avec SELinux, les
volumes de sources utilisent le label privé **`:Z`** dans `compose.yaml` (et non `:z`, qui
partage le label entre conteneurs). Ne jamais désactiver SELinux pour faire fonctionner
l'application.

Vérifier les plages subordinate UID/GID de l'utilisateur rootless :

```bash
grep "^$(id -un):" /etc/subuid /etc/subgid
loginctl enable-linger "$USER"   # si le service doit survivre à la déconnexion
```

Pour un poste Podman rootless où l'utilisateur hôte doit être conservé dans les conteneurs
applicatifs, utiliser l'override fourni :

```bash
podman compose -f compose.yaml -f compose.rootless.yaml up --build
```

Cet override applique `userns_mode: keep-id` au backend et au frontend. Il est réservé à
Podman : Docker Compose ne reconnaît pas `keep-id`. En cas d'erreur de permission sur un
volume, vérifier d'abord le label `:Z`, les droits du répertoire et l'UID du processus,
sans recourir à `--privileged`.

## Configuration LDAP / Active Directory / FreeIPA

L'annuaire se configure **exclusivement côté serveur**, dans le fichier `.env` à la racine
du projet (ou via les variables d'environnement du déploiement). Il n'existe volontairement
pas d'écran d'administration LDAP : le mot de passe du compte de service reste hors de la
base et n'est jamais exposé par l'API. Après modification, recréer le backend pour recharger
la configuration :

```bash
podman compose up -d --force-recreate backend
```

### Modes d'authentification

| `AUTH_MODE` | Comportement |
|---|---|
| `local` | Comptes locaux Argon2 uniquement ; LDAP ignoré. |
| `ldap` | Annuaire uniquement ; un identifiant en collision avec un compte local est refusé. |
| `hybrid` | Défaut. Un compte local existant garde la priorité absolue ; sinon l'annuaire est sollicité si `AUTH_ALLOW_LDAP_FALLBACK=true`. |

En mode `hybrid`, aucun repli LDAP n'est tenté pour un identifiant local existant, même si
le mot de passe local est faux. En mode `ldap`, l'administrateur local initial n'est plus
utilisable : conserver un accès de secours ou revenir temporairement à `AUTH_MODE=local`.
`AUTH_ALLOW_LDAP_FALLBACK` n'a d'effet qu'en mode `hybrid`.

### Procédure de mise en service

1. **Créer un compte de service** en lecture seule sur la branche LDAP concernée. Ce compte
   sert uniquement à rechercher l'utilisateur et ses groupes ; SouverainOS teste ensuite le
   mot de passe de l'utilisateur par un second bind.
2. **Renseigner les paramètres** dans `.env`, avec des DN complets et un filtre contenant
   obligatoirement `{username}`. Le login est échappé contre l'injection LDAP avant
   substitution.
3. **Protéger le fichier** : `chmod 600 .env`, ne jamais le versionner, et en production
   utiliser le gestionnaire de secrets de l'infrastructure.
4. **Recréer le backend** avec la commande ci-dessus, puis se connecter via l'onglet
   **Annuaire LDAP** de la fenêtre de connexion.
5. **Vérifier le rôle** obtenu. À la première connexion, un utilisateur LDAP est créé dans
   la table `users` avec `auth_source=ldap` et sans mot de passe local. Les connexions
   suivantes actualisent son email, son nom et son rôle depuis l'annuaire ; un compte
   désactivé dans SouverainOS reste refusé.

### Exemple Active Directory

```dotenv
AUTH_MODE=hybrid
AUTH_ALLOW_LDAP_FALLBACK=true

LDAP_SERVER_URL=ldaps://ad.example.local:636
LDAP_USE_SSL=true
LDAP_TLS_VALIDATE=true
LDAP_CA_CERT_FILE=
LDAP_BASE_DN=DC=example,DC=local
LDAP_BIND_DN=CN=souverainos,OU=Services,DC=example,DC=local
LDAP_BIND_PASSWORD=mot-de-passe-du-compte-de-service

LDAP_USER_FILTER=(sAMAccountName={username})
LDAP_ATTRIBUTE_UID=sAMAccountName
LDAP_ATTRIBUTE_EMAIL=mail
LDAP_ATTRIBUTE_DISPLAY_NAME=displayName
LDAP_ATTRIBUTE_MEMBEROF=memberOf

LDAP_ADMIN_GROUP_DN=CN=SouverainOS-Admins,OU=Groupes,DC=example,DC=local
LDAP_AUDITEUR_GROUP_DN=CN=SouverainOS-Auditeurs,OU=Groupes,DC=example,DC=local
LDAP_LECTEUR_GROUP_DN=CN=SouverainOS-Lecteurs,OU=Groupes,DC=example,DC=local
LDAP_DEFAULT_ROLE=lecteur_direction
LDAP_TIMEOUT_SECONDS=8
```

### Variantes OpenLDAP et FreeIPA

```dotenv
# OpenLDAP
LDAP_USER_FILTER=(uid={username})
LDAP_ATTRIBUTE_UID=uid
LDAP_ATTRIBUTE_EMAIL=mail
LDAP_ATTRIBUTE_DISPLAY_NAME=cn
LDAP_ATTRIBUTE_MEMBEROF=memberOf

# FreeIPA (mêmes conventions usuelles)
LDAP_USER_FILTER=(uid={username})
LDAP_ATTRIBUTE_UID=uid
LDAP_ATTRIBUTE_EMAIL=mail
LDAP_ATTRIBUTE_DISPLAY_NAME=cn
LDAP_ATTRIBUTE_MEMBEROF=memberOf
```

La recherche doit retourner **exactement une entrée** dans `LDAP_BASE_DN` ; zéro ou
plusieurs résultats sont refusés. `LDAP_ATTRIBUTE_MEMBEROF` doit être présent sur l'entrée
utilisateur (overlay `memberOf` pour OpenLDAP, plugin équivalent pour FreeIPA). Les groupes
sont comparés par DN complet, avec repli sur le `cn` ; utiliser des DN complets évite les
ambiguïtés entre groupes de même nom.

### Résolution des rôles

L'ordre de priorité est strict :

1. `LDAP_ADMIN_GROUP_DN` → `admin_ght` ;
2. `LDAP_AUDITEUR_GROUP_DN` → `auditeur` ;
3. `LDAP_LECTEUR_GROUP_DN` → `lecteur_direction` ;
4. sinon `LDAP_DEFAULT_ROLE`.

Le rôle est recalculé à chaque connexion LDAP réussie. Un utilisateur sans groupe reconnu
reçoit donc le rôle par défaut, `lecteur_direction` dans l'exemple.

### TLS et CA interne

Utiliser `ldaps://` (port 636) ou `LDAP_USE_SSL=true`. `LDAP_TLS_VALIDATE=true` est
obligatoire en production ; ne le passer à `false` que pour un laboratoire isolé. Pour une
autorité de certification interne, monter le PEM dans le conteneur backend et référencer
son chemin interne :

```yaml
# compose.override.yaml — exemple de montage du CA interne
services:
  backend:
    volumes:
      - ./certs/ca-interne.pem:/etc/ssl/certs/ca-interne.pem:ro,Z
```

```dotenv
LDAP_CA_CERT_FILE=/etc/ssl/certs/ca-interne.pem
```

LDAPS en SSL direct est pris en charge ; **StartTLS sur le port 389 n'est pas implémenté**.

### Diagnostic

- **« Annuaire d'authentification indisponible »** : vérifier l'URL, le port, le certificat,
  le CA interne, le compte de bind et l'accessibilité réseau depuis le conteneur backend.
- **« Identifiants invalides »** : vérifier `LDAP_BASE_DN`, `LDAP_USER_FILTER`, l'unicité de
  l'entrée et le bind utilisateur.
- **Rôle inattendu** : vérifier la présence de `memberOf` sur l'entrée, les DN de groupes et
  l'ordre de priorité ci-dessus.
- **Compte local bloquant le LDAP en mode `hybrid`** : utiliser un autre identifiant ou
  passer temporairement en mode `ldap` pour le test.

Pour revenir à une authentification strictement locale, définir `AUTH_MODE=local` et
recréer le backend. Les comptes LDAP déjà synchronisés restent en base mais ne disposent
d'aucun mot de passe local et ne peuvent donc plus se connecter.

## Méthodologie de score et sources

La logique officielle est implémentée **uniquement** dans
`backend/app/services/scoring.py` et détaillée dans `AGENTS.md`. Le frontend ne recalcule
jamais un score : il affiche les valeurs de l'API.

### Démarche d'audit

La méthode suit cinq étapes reproductibles :

1. **Délimiter le périmètre** : établissements du GHT, applications, services rendus et
   responsabilités internes.
2. **Cartographier les briques** : identité, éditeur, technologie, hébergement, couche
   fonctionnelle et statut de validation.
3. **Qualifier chaque brique** sur les cinq critères, en conservant la preuve ou la source
   de chaque notation (contrat, fiche éditeur, SILL/DINUM, DICP, analyse technique).
4. **Calculer et prioriser** : score unitaire, score par couche, score global et top des
   vulnérabilités.
5. **Simuler et décider** : trajectoire What-If pour mesurer l'effet d'un remplacement ou
   d'une réduction de dépendance, sans modifier l'audit.

Les imports Mercator, CSV et JSON ne produisent qu'un **pré-scoring heuristique** avec le
statut « À valider ». La qualification définitive relève d'un auditeur humain.

### Les cinq critères

| Code | Dimension | Échelle | Références principales |
|---|---|---|---|
| C1 | Licence & code | 0 libre → 5 SaaS fermé | SILL/DINUM, FLOSS Criteria, EU Score |
| C2 | Juridiction & gouvernance | 0 France/UE → 5 CLOUD Act/FISA | IRN (aDRI 2026), EU Score, CLOUD Act/FISA |
| C3 | Interopérabilité & réversibilité | 0 standards ouverts → 5 fermé | CI-SIS/ANS, HL7 FHIR, DICOM, HPRIM, SQL |
| C4 | Dépendance opérationnelle & MCO | 0 interne/communauté → 5 mono-éditeur | IRN « Compétences & Écosystème », MaturiN-H |
| C5 | Criticité métier GHT | 1 faible · 3 moyenne · 5 vitale | CaRE/HAS, DICP, Mercator `security_need_a` |

La structuration en trois couches et leur pondération s'appuient sur les grilles
MaturiN-H, ANAP et ANS. Ces références sont des grilles de lecture : elles ne constituent
pas une certification automatique de conformité.

### Formule officielle

```text
B = (C1 + C2 + C3 + C4) / 4
F = 0,5 + 0,5 × (C5 / 5)          # 0,6 (C5=1) · 0,8 (C5=3) · 1,0 (C5=5)
Score unitaire = arrondi((B / 5) × F × 100, 2)

Score couche = arrondi(Σ(Score unitaire × C5) / Σ(C5), 2)
Score global = arrondi(Σ(poids couche × score couche) / Σ(poids couches non vides), 2)
Poids officiels = Infrastructure 25 % · Supports 30 % · Métier 45 %
```

Un audit sans aucune brique n'est pas évalué : score `0`, aucune couche notée,
classification **« Non évalué »**. Les couches vides sont exclues puis les poids restants
sont renormalisés.

| Score | Classification |
|---:|---|
| 0–25 | Souveraineté maîtrisée |
| 26–50 | Dépendance modérée / Hybride |
| 51–75 | Dépendance élevée |
| 76–100 | Verrouillage critique / Risque systémique |

### Limites d'interprétation

Le score est un **indicateur d'aide à la décision**, pas une certification de conformité,
une mesure de sécurité ou un jugement automatique sur un éditeur. Il dépend du périmètre
retenu, de la qualité des preuves et de la date de l'audit. Deux audits ne sont comparables
que si leur périmètre, leurs règles de notation et leur niveau de complétude sont
explicitement rapprochés.

La fiche **Méthodologie & Sources** de l'interface reprend les formules, les seuils, les
sources et ces limites. Elle est accessible au clavier et sans appel réseau.

## Import Mercator, CSV et JSON

### Mercator

1. Ouvrir un audit réel en écriture, puis **Cartographie → Importer → Mercator**.
2. Renseigner l'URL de base, le mode d'authentification (Personal Access Token ou
   login/mot de passe), et conserver la vérification TLS active en production.
3. Lancer l'import : SouverainOS interroge les applications, blocs applicatifs, bases de
   données et serveurs logiques, puis déduit couche et criticité.
4. Les briques sont créées avec le statut **À valider**. Le pré-scoring est heuristique :
   un auditeur doit vérifier chaque critère avant validation.

Les secrets Mercator sont chiffrés avec Fernet et ne sont jamais renvoyés par l'API ni
journalisés. La criticité `security_need_a` est convertie en C5 : `1 → 1`, `2 → 3`,
`3/4 → 5`.

### CSV / JSON

- Télécharger le **gabarit CSV** depuis l'interface d'import ou l'API.
- Encodage UTF-8 (BOM accepté), séparateur `;` ou `,` détecté automatiquement.
- Colonnes canoniques : `name`, `layer`, `establishment`, `description`, `editor`,
  `technology`, `app_type`, `responsible`, `external`, `license_model`, `jurisdiction`,
  `interoperability`, `operational_dependency`, `business_criticality`, `status`, `notes`.
- Alias français acceptés (`nom`, `couche`, `etablissement`, `editeur`, `technologie`,
  `responsable`, `externe`, `modele_licence`, `juridiction`, `interoperabilite`,
  `dependance_operationnelle`, `criticite`, `statut`).
- `layer` accepte `infrastructure|infra|couche1`, `supports|support|couche2`,
  `metier|métier|couche3`.
- `business_criticality` doit valoir exactement **1, 3 ou 5** ; les lignes invalides sont
  refusées et listées avec leur numéro.
- Le JSON accepte un tableau de briques ou `{"applications": [...]}`. L'export Mercator
  fichier est également supporté.
- Un import ne supprime jamais une brique existante. Les doublons (nom normalisé + couche)
  sont ignorés et comptés. Limite par défaut : 5 000 lignes.

## Versioning et releases

La version est centralisée dans le fichier racine **`VERSION`** au format `vX.Y.Z`.
Elle est synchronisée avec :

- `/healthz` et le schéma OpenAPI `/docs` ;
- les exports JSON, Markdown et CSV ;
- `frontend/package.json`, `frontend/package-lock.json` et le footer ;
- les images OCI, via le contexte de build racine ; `VERSION` est copié dans
  `/etc/souverainos/VERSION`, hors des volumes de sources montés en développement.

Convention : versions `v0.x.y` pendant le développement, **`v1.0.0` pour la soutenance**.
Les releases sont marquées par des **tags Git annotés**, jamais par des tags légers.

```bash
npm --prefix frontend run version:sync   # aligne les manifests sur VERSION
npm --prefix frontend run version:check  # vérifie en CI
git tag -a v0.3.0 -m "SouverainOS v0.3.0 — méthodologie et documentation"
```

Ne jamais déplacer ou réécrire un tag publié : incrémenter la version et créer un nouveau
tag. Les builds Docker utilisent désormais la racine du dépôt pour inclure `VERSION`.
Après une modification de `VERSION`, reconstruire les images pour actualiser
`/etc/souverainos/VERSION`.

## Structure

```
backend/      FastAPI + SQLModel + PostgreSQL, scoring et importeurs isolés
frontend/     Next.js App Router standalone : dashboard, cartographie, simulation, admin
docs/badges/  Badges statiques locaux (aucun service distant)
compose.yaml  Orchestration Podman/Docker dev
compose.rootless.yaml  Override Podman rootless (`userns_mode: keep-id`)
AGENTS.md     Contrat de maintenance, formule de score et mapping d'import
VERSION       Source unique de la version applicative
LICENSE       GPL-3.0-or-later
```

## Vérifications backend

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
ruff check app tests
pytest -q
```

## Vérifications frontend

Node.js 22+ est requis (Tailwind CSS 4 ; le build échoue sous Node 20.18).

```bash
cd frontend
npm ci
npm run version:check
npm run typecheck
npm run build
```

## Production

Les deux images se construisent depuis la racine du dépôt :

```bash
podman build -f backend/Containerfile -t souverainos-backend .
podman build --target runner -f frontend/Containerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.fr \
  -t souverainos-frontend .
```

Fournir ensuite `API_INTERNAL_URL` au runtime frontend pour les appels SSR internes. Le CSP
est figé au build : builder l'image avec l'URL publique définitive.

Servir exclusivement en HTTPS derrière un reverse proxy open source, passer
`ENVIRONMENT=production`, `COOKIE_SECURE=true`, `SEED_ON_STARTUP=false` après le premier
déploiement, et protéger la base sur un réseau interne. Voir la section 9 d'`AGENTS.md`.

---

*Conçu par Bertrand Kuzbinski — Développé en Vibecoding (Full-Stack Open Source).*

Dépôt : <https://github.com/MrKuBe/Souverain-os>
