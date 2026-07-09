import type { SetupCatalog } from "./types.js";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

function suggestName(input: string, names: string[]): string | undefined {
  if (names.length === 0) return undefined;
  const ranked = names
    .map((n) => ({ n, d: levenshtein(input.toLowerCase(), n.toLowerCase()) }))
    .sort((a, b) => a.d - b.d);
  return ranked[0].d <= 3 ? ranked[0].n : undefined;
}

function formatList(catalog: SetupCatalog, kind: "seeds" | "plugins"): string {
  const entries = catalog[kind];
  const lines = entries.map((e) => "  " + e.ref);
  return [
    "",
    "Available " + kind + " (run: domain-tools tree repo --kind " + kind + "):",
    ...lines,
  ].join("\n");
}

export function formatUnknownSeedError(catalog: SetupCatalog, name: string): string {
  const hint = suggestName(name, catalog.seeds.map((s) => s.name));
  const didYouMean = hint ? "\nDid you mean: seed:" + hint + "?" : "";
  return "Unknown seed \"" + name + "\"." + formatList(catalog, "seeds") + didYouMean;
}

export function formatUnknownPluginError(catalog: SetupCatalog, name: string): string {
  const hint = suggestName(name, catalog.plugins.map((p) => p.name));
  const didYouMean = hint ? "\nDid you mean: plugin:" + hint + "?" : "";
  return "Unknown plugin \"" + name + "\"." + formatList(catalog, "plugins") + didYouMean;
}