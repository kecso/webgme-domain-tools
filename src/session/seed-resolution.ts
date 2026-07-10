import { CLI_NAME } from "../cli-brand.js";
import type { CatalogEntry, SetupCatalog } from "../catalog/types.js";
import { formatUnknownSeedError } from "../catalog/catalog-errors.js";

export class AmbiguousSeedError extends Error {
  readonly candidates: string[];

  constructor(candidates: string[]) {
    super(formatAmbiguousSeedMessage(candidates));
    this.name = "AmbiguousSeedError";
    this.candidates = candidates;
  }
}

function formatAmbiguousSeedMessage(candidates: string[]): string {
  const lines = candidates.map((name) => "  seed:" + name);
  return [
    "Ambiguous seed name — multiple matches:",
    ...lines,
    "",
    "Use the full seed name, e.g.: " + CLI_NAME + " tree --seed " + candidates[0],
  ].join("\n");
}

function bareSeedName(name: string): string {
  return name.startsWith("seed:") ? name.slice("seed:".length) : name;
}

function uniqueSorted(names: string[]): string[] {
  return [...new Set(names)].sort();
}

export function resolveSeedSelection(catalog: SetupCatalog, rawName: string): CatalogEntry {
  const name = bareSeedName(rawName);
  const seeds = catalog.seeds;

  const exact = seeds.filter((s) => s.name === name);
  if (exact.length === 1) return exact[0];

  const caseInsensitive = seeds.filter((s) => s.name.toLowerCase() === name.toLowerCase());
  if (caseInsensitive.length === 1) return caseInsensitive[0];
  if (caseInsensitive.length > 1) {
    throw new AmbiguousSeedError(uniqueSorted(caseInsensitive.map((s) => s.name)));
  }

  const prefix = seeds.filter((s) => s.name.toLowerCase().startsWith(name.toLowerCase()));
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) {
    throw new AmbiguousSeedError(uniqueSorted(prefix.map((s) => s.name)));
  }

  throw new Error(formatUnknownSeedError(catalog, name));
}

export function primaryWebgmexPath(entry: CatalogEntry): string {
  if (entry.artifacts.length === 0) {
    throw new Error(
      "Seed \"" + entry.name + "\" has no " + entry.name + ".webgmex. " +
        "Run: " + CLI_NAME + " tree repo --kind seeds",
    );
  }
  return entry.artifacts[0];
}
