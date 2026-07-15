import type { LoadedSeedContext } from "../session/project-session.js";
import type { GmeNode } from "../session/gme-runtime.js";
import { renderSeedMetaOutput, type SeedMetaFormat } from "./seed-meta-render.js";

export type { SeedMetaFormat };
export { renderSeedMetaOutput };

export interface MetaAspectNodeIr {
  path: string;
  name: string;
  /** core.getNamespace — empty string when the node is not in a library namespace. */
  namespace: string;
  /** core.getFullyQualifiedName — equals name when namespace is empty. */
  fullyQualifiedName: string;
  /** true when the meta node comes from an attached library. */
  libraryElement: boolean;
  meta: Record<string, unknown>;
}

export interface SeedMetaIr {
  seed: string;
  branch: string;
  webgmex: string;
  /** Library roots attached to the project (core.getLibraryNames). */
  libraries: string[];
  metaAspectSet: MetaAspectNodeIr[];
}

function metaNodeName(core: LoadedSeedContext["core"], node: GmeNode): string {
  const value = core.getAttribute(node, "name");
  return typeof value === "string" && value.length > 0 ? value : "(unnamed)";
}

function readNamespace(core: LoadedSeedContext["core"], node: GmeNode): string {
  if (typeof core.getNamespace !== "function") return "";
  const value = core.getNamespace(node);
  return typeof value === "string" ? value : "";
}

function readFullyQualifiedName(
  core: LoadedSeedContext["core"],
  node: GmeNode,
  fallbackName: string,
): string {
  if (typeof core.getFullyQualifiedName !== "function") return fallbackName;
  const value = core.getFullyQualifiedName(node);
  return typeof value === "string" && value.length > 0 ? value : fallbackName;
}

function readLibraryNames(core: LoadedSeedContext["core"], root: GmeNode): string[] {
  if (typeof core.getLibraryNames !== "function") return [];
  const names = core.getLibraryNames(root);
  if (!Array.isArray(names)) return [];
  return names.filter((n): n is string => typeof n === "string").sort((a, b) => a.localeCompare(b));
}

export function buildSeedMetaIr(context: LoadedSeedContext): SeedMetaIr {
  const metaByPath = context.core.getAllMetaNodes(context.rootNode);
  const metaAspectSet = Object.entries(metaByPath)
    .map(([path, node]) => {
      const name = metaNodeName(context.core, node);
      const libraryElement =
        typeof context.core.isLibraryElement === "function"
          ? Boolean(context.core.isLibraryElement(node))
          : false;
      return {
        path,
        name,
        namespace: readNamespace(context.core, node),
        fullyQualifiedName: readFullyQualifiedName(context.core, node, name),
        libraryElement,
        meta: context.core.getJsonMeta(node),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    seed: context.seedName,
    branch: context.branchName,
    webgmex: context.webgmexPath,
    libraries: readLibraryNames(context.core, context.rootNode),
    metaAspectSet,
  };
}

/** @deprecated Use renderSeedMetaOutput */
export function renderSeedMeta(
  ir: SeedMetaIr,
  format: "json" | "tree" = "json",
  context?: LoadedSeedContext,
): string {
  return renderSeedMetaOutput(ir, format, context);
}
