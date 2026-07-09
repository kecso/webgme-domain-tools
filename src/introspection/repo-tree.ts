import path from "node:path";
import {
  type CatalogEntry,
  type ComponentKind,
  COMPONENT_KINDS,
  entriesForKind,
  type SetupCatalog,
} from "../catalog/types.js";

export type RepoTreeFormat = "tree" | "flat" | "json";

export interface RepoTreeOptions {
  kinds?: ComponentKind[];
  format?: RepoTreeFormat;
}

function rel(catalog: SetupCatalog, abs: string): string {
  return path.relative(catalog.cwd, abs).split(path.sep).join("/");
}

function formatEntryLines(catalog: SetupCatalog, entry: CatalogEntry): string[] {
  const lines: string[] = [];
  lines.push("    " + entry.ref);
  lines.push("      src:  " + entry.src + (entry.exists ? "" : "  (missing)"));
  if (entry.kind === "seeds") {
    if (entry.artifacts.length > 0) {
      for (const a of entry.artifacts) {
        lines.push("      file: " + rel(catalog, a) + "  (ok)");
      }
    } else if (entry.notes.length > 0) {
      lines.push("      file: (" + entry.notes[0] + ")");
    }
  }
  if (entry.kind === "plugins" && entry.metadataPath) {
    lines.push("      meta: " + rel(catalog, entry.metadataPath) + "  (ok)");
  } else if (entry.kind === "plugins" && entry.exists) {
    lines.push("      meta: (missing metadata.json)");
  }
  for (const note of entry.notes) {
    if (note.startsWith("produces") || note.startsWith("ignored")) {
      lines.push("      note: " + note);
    }
  }
  return lines;
}

export function renderRepoTree(
  catalog: SetupCatalog,
  options: RepoTreeOptions = {},
): string {
  const format = options.format ?? "tree";
  const kinds = options.kinds ?? [...COMPONENT_KINDS];

  if (format === "json") {
    const payload: Record<string, CatalogEntry[]> = {};
    for (const kind of kinds) payload[kind] = entriesForKind(catalog, kind);
    return JSON.stringify(
      { setup: rel(catalog, catalog.setupPath), components: payload },
      null,
      2,
    );
  }

  if (format === "flat") {
    const rows: string[] = [];
    for (const kind of kinds) {
      for (const e of entriesForKind(catalog, kind)) {
        rows.push([e.ref, e.src, e.exists ? "ok" : "missing"].join("\t"));
      }
    }
    return rows.join("\n");
  }

  const lines: string[] = [
    "repository  (" + rel(catalog, catalog.setupPath) + ")",
  ];
  for (const kind of kinds) {
    lines.push("  " + kind + "/");
    const entries = entriesForKind(catalog, kind);
    if (entries.length === 0) lines.push("    (none)");
    else {
      for (const entry of entries) lines.push(...formatEntryLines(catalog, entry));
    }
  }
  return lines.join("\n");
}