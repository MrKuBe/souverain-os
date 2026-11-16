import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(frontendRoot, "..");
const versionPath = [
  path.join(frontendRoot, "VERSION"),
  path.join(projectRoot, "VERSION"),
  "/etc/souverainos/VERSION",
].find((candidate) => existsSync(candidate));
const checkOnly = process.argv.includes("--check");

if (!versionPath) {
  console.error("Fichier VERSION introuvable à la racine du projet.");
  process.exit(1);
}

const rawVersion = (await readFile(versionPath, "utf8")).trim();
const match = /^v(\d+\.\d+\.\d+)$/.exec(rawVersion);
if (!match) {
  console.error(`VERSION invalide : "${rawVersion}" (format attendu vX.Y.Z).`);
  process.exit(1);
}
const version = match[1];

const manifests = [
  { file: path.join(frontendRoot, "package.json"), update: (data) => ({ ...data, version }) },
  {
    file: path.join(frontendRoot, "package-lock.json"),
    update: (data) => ({
      ...data,
      version,
      packages: {
        ...data.packages,
        "": { ...data.packages[""], version },
      },
    }),
  },
];

let stale = false;
for (const manifest of manifests) {
  const data = JSON.parse(await readFile(manifest.file, "utf8"));
  const expected = manifest.update(data);
  const current = manifest.file.endsWith("package-lock.json")
    ? data.version === version && data.packages?.[""]?.version === version
    : data.version === version;

  if (!current) {
    stale = true;
    if (!checkOnly) {
      await writeFile(manifest.file, `${JSON.stringify(expected, null, 2)}\n`, "utf8");
      console.log(`Version synchronisée : ${path.relative(projectRoot, manifest.file)} → ${version}`);
    }
  }
}

if (checkOnly && stale) {
  console.error("Versions frontend désynchronisées. Exécutez npm run version:sync.");
  process.exit(1);
}

if (!stale) {
  console.log(`Versions frontend déjà alignées sur ${rawVersion}.`);
}
