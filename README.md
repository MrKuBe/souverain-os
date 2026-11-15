# SouverainOS — Audit de Dépendance Numérique des SIH

> Projet imaginé et conçu par **Bertrand Kuzbinski** (Responsable des Systèmes Numériques /
> Chef de Service Informatique hospitalier), dans le cadre de sa thèse professionnelle.
> Développé en **Vibecoding — Full-Stack Open Source**.

SouverainOS mesure la dépendance numérique d'un Groupement Hospitalier de Territoire (GHT)
à partir d'une cartographie applicative en trois couches : **Infrastructure (25 %)**,
**Supports (30 %)** et **Métier (45 %)**. Chaque brique est notée sur cinq critères
(licence, juridiction, interopérabilité, MCO, criticité) ; le score global est classé de
« Souveraineté maîtrisée » à « Verrouillage critique ».

## Garanties

- 100 % open source, **GPL-3.0-or-later**, auto-hébergeable (Podman / Docker / OCI).
- Aucun cloud tiers, aucune télémétrie, aucun IdP SaaS.
- Démonstration publique strictement en lecture seule ; audits réels privés et journalisés.
- Authentification locale Argon2 + LDAP/LDAPS (AD, OpenLDAP, FreeIPA), JWT, CSRF.
- Import Mercator (API ou export fichier), CSV/JSON, export JSON/Markdown/CSV.
- Formule de score et règles d'import figées dans [`AGENTS.md`](./AGENTS.md) et couvertes
  par les tests.

## Démarrage (développement, hot-reload)

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

## Structure

```
backend/   FastAPI + SQLModel + PostgreSQL, scoring et importeurs isolés
frontend/  Next.js App Router standalone (généré après validation du backend)
compose.yaml, Containerfiles, .env.example
AGENTS.md  contrat de maintenance, formule de score et mapping d'import
LICENSE    GPL-3.0-or-later
```

## Vérifications backend

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
ruff check app tests
pytest -q
```

## Production

Servir exclusivement en HTTPS derrière un reverse proxy open source, passer
`ENVIRONMENT=production`, `COOKIE_SECURE=true`, `SEED_ON_STARTUP=false` après le premier
déploiement, et protéger la base sur un réseau interne. Voir la section 9 d'`AGENTS.md`.

---

*Conçu par Bertrand Kuzbinski — Développé en Vibecoding (Full-Stack Open Source).*
