import type { GmeCore, GmeNode } from "../session/gme-runtime.js";

export type SeedTreeFormat = "tree" | "tree-verbose" | "flat" | "json";

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
  isLibraryRoot?: boolean;
  isLibraryElement?: boolean;
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
    isLibraryRoot:
      typeof core.isLibraryRoot === "function" ? Boolean(core.isLibraryRoot(node)) : false,
    isLibraryElement:
      typeof core.isLibraryElement === "function" ? Boolean(core.isLibraryElement(node)) : false,
  };
}

/** Library roots first among siblings; relative order within each group is preserved. */
function sortChildNodes(core: GmeCore, children: GmeNode[]): GmeNode[] {
  const libs: GmeNode[] = [];
  const rest: GmeNode[] = [];
  for (const child of children) {
    if (typeof core.isLibraryRoot === "function" && core.isLibraryRoot(child)) {
      libs.push(child);
    } else {
      rest.push(child);
    }
  }
  return libs.concat(rest);
}

function walkDepthFirst(core: GmeCore, node: GmeNode, rows: SeedNodeRow[]): void {
  rows.push(toRow(core, node));
  const children: GmeNode[] = [];
  for (const relid of core.getChildrenRelids(node)) {
    const child = core.getChild(node, relid);
    if (child) children.push(child);
  }
  for (const child of sortChildNodes(core, children)) {
    walkDepthFirst(core, child, rows);
  }
}

export function pathDepth(nodePath: string): number {
  if (!nodePath) return 0;
  return nodePath.split("/").filter(Boolean).length;
}

export function relidFromPath(nodePath: string): string {
  const parts = nodePath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function displayPath(nodePath: string): string {
  return nodePath || "/";
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
    return rows;
  }

  const start = options.at
    ? await core.loadByPath(rootNode, options.at)
    : rootNode;
  if (!start) {
    throw new Error('Node path does not exist: "' + (options.at ?? "") + '"');
  }

  await core.loadSubTree(start);
  const rows: SeedNodeRow[] = [];
  walkDepthFirst(core, start, rows);
  return rows;
}

function treePrefix(depth: number, isLast: boolean, parentContinues: boolean[]): string {
  if (depth === 0) return "";
  const ancestors = parentContinues
    .slice(0, depth - 1)
    .map((continues) => (continues ? "│  " : "   "))
    .join("");
  const branch = isLast ? "└─ " : "├─ ";
  return ancestors + branch;
}

function renderIndentedTreeLine(
  row: SeedNodeRow,
  depth: number,
  isLast: boolean,
  parentContinues: boolean[],
  verbose: boolean,
): string {
  const relid = relidFromPath(row.path);
  const label = relid || row.name;
  const prefix = treePrefix(depth, isLast, parentContinues);
  const pathTail = displayPath(row.path);
  let line = prefix + label;
  if (relid && row.name !== relid) {
    line += "  " + row.name;
  }
  line += "  " + pathTail;
  if (verbose) {
    const tags: string[] = [];
    if (row.isMeta) tags.push("meta");
    if (row.isLibraryRoot) tags.push("library-root");
    else if (row.isLibraryElement) tags.push("library");
    if (row.metaType) tags.push("type:" + row.metaType);
    if (tags.length > 0) line += "  [" + tags.join(", ") + "]";
  }
  return line;
}

function renderTreeBodySimple(rows: SeedNodeRow[], verbose: boolean): string[] {
  if (rows.length === 0) return ["(empty)"];

  const childrenByParent = new Map<string, SeedNodeRow[]>();
  for (const row of rows) {
    const parent = parentPath(row.path);
    const list = childrenByParent.get(parent) ?? [];
    list.push(row);
    childrenByParent.set(parent, list);
  }

  const lines: string[] = [];

  function walk(nodePath: string, depth: number, parentContinues: boolean[]): void {
    const row = rows.find((r) => r.path === nodePath);
    if (!row) return;

    const siblings = childrenByParent.get(parentPath(nodePath)) ?? [];
    const index = siblings.findIndex((s) => s.path === nodePath);
    const isLast = index === siblings.length - 1;

    lines.push(renderIndentedTreeLine(row, depth, isLast, parentContinues, verbose));

    const children = childrenByParent.get(nodePath) ?? [];
    const nextContinues = [...parentContinues, !isLast];
    for (const child of children) {
      walk(child.path, depth + 1, nextContinues);
    }
  }

  const roots = childrenByParent.get("__root__") ?? [];
  for (const root of roots) {
    walk(root.path, pathDepth(root.path), []);
  }

  return lines;
}

function parentPath(nodePath: string): string {
  if (!nodePath) return "__root__";
  const parts = nodePath.split("/").filter(Boolean);
  if (parts.length <= 1) return "__root__";
  return "/" + parts.slice(0, -1).join("/");
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

  const verbose = format === "tree-verbose";
  const header = "seed:" + seedName + "  (" + webgmexPath + ")";
  const body = renderTreeBodySimple(rows, verbose);
  return [header, ...body].join("\n");
}
