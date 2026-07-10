import type { GmeCore, GmeNode } from "../session/gme-runtime.js";

export type SeedTreeFormat = "tree" | "flat" | "json";

export interface SeedTreeOptions {
  format?: SeedTreeFormat;
  at?: string;
  select?: string[];
}

export interface SeedNodeRow {
  path: string;
  name: string;
  metaType: string | null;
  isMeta: boolean;
}

function nodeName(core: GmeCore, node: GmeNode): string {
  const value = core.getAttribute(node, "name");
  return typeof value === "string" && value.length > 0 ? value : "(unnamed)";
}

function metaTypeName(core: GmeCore, node: GmeNode): string | null {
  const meta = core.getMetaType(node);
  if (!meta) return null;
  const value = core.getAttribute(meta, "name");
  return typeof value === "string" ? value : null;
}

function toRow(core: GmeCore, node: GmeNode): SeedNodeRow {
  return {
    path: core.getPath(node),
    name: nodeName(core, node),
    metaType: metaTypeName(core, node),
    isMeta: core.isMetaNode(node),
  };
}

export async function collectSeedNodes(
  core: GmeCore,
  rootNode: GmeNode,
  options: SeedTreeOptions,
): Promise<SeedNodeRow[]> {
  if (options.select && options.select.length > 0) {
    const rows: SeedNodeRow[] = [];
    for (const nodePath of options.select) {
      const node = await core.loadByPath(rootNode, nodePath);
      if (!node) {
        throw new Error('Selection path does not exist: "' + nodePath + '"');
      }
      rows.push(toRow(core, node));
    }
    return rows.sort((a, b) => a.path.localeCompare(b.path));
  }

  const start = options.at
    ? await core.loadByPath(rootNode, options.at)
    : rootNode;
  if (!start) {
    throw new Error('Node path does not exist: "' + (options.at ?? "") + '"');
  }

  const nodes = await core.loadSubTree(start);
  return nodes
    .map((node) => toRow(core, node))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function renderSeedTree(
  seedName: string,
  webgmexPath: string,
  rows: SeedNodeRow[],
  options: SeedTreeOptions = {},
): string {
  const format = options.format ?? "tree";

  if (format === "json") {
    return JSON.stringify({ seed: seedName, webgmex: webgmexPath, nodes: rows }, null, 2);
  }

  if (format === "flat") {
    return rows
      .map((row) =>
        [row.path, row.name, row.metaType ?? "", row.isMeta ? "meta" : "instance"].join("\t"),
      )
      .join("\n");
  }

  const lines = ["seed:" + seedName + "  (" + webgmexPath + ")", "  model/"];
  if (rows.length === 0) {
    lines.push("    (empty)");
  } else {
    for (const row of rows) {
      const tags: string[] = [];
      if (row.isMeta) tags.push("meta");
      if (row.metaType) tags.push("type:" + row.metaType);
      const suffix = tags.length > 0 ? "  [" + tags.join(", ") + "]" : "";
      lines.push("    " + row.path + "  " + row.name + suffix);
    }
  }
  return lines.join("\n");
}
