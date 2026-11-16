import { readFileSync } from "node:fs";
import path from "node:path";

let cachedVersion: string | null = null;

export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;

  const candidates = [
    path.join(process.cwd(), "VERSION"),
    path.join(process.cwd(), "..", "VERSION"),
    "/etc/souverainos/VERSION",
  ];

  for (const candidate of candidates) {
    try {
      const match = /^v(\d+\.\d+\.\d+)$/.exec(
        readFileSync(/* turbopackIgnore: true */ candidate, "utf8").trim(),
      );
      if (match) {
        cachedVersion = match[1];
        return cachedVersion;
      }
    } catch {
      // Essayer l'emplacement suivant.
    }
  }

  throw new Error(
    "Fichier VERSION introuvable ou invalide. Montez la racine du projet dans le conteneur.",
  );
}

export const APP_VERSION = getAppVersion();
