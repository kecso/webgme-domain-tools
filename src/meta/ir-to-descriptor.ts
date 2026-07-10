import type { MetaAspectNodeIr, SeedMetaIr } from "../introspection/seed-meta.js";
import type { GmeCore, GmeNode } from "../session/gme-runtime.js";
import type { LoadedSeedContext } from "../session/project-session.js";
import { cardinalityFromMinMax } from "./cardinality.js";
import type {
  AttributeDef,
  ConceptBody,
  MemberRule,
  MembersMap,
  MetaDescriptor,
  TypeRef,
} from "./types.js";
import { isStructuredMemberRule } from "./types.js";

const SYSTEM_CONCEPTS = new Set(["FCO", "META"]);

interface JsonMetaChildren {
  items?: string[];
  minItems?: number[];
  maxItems?: number[];
  min?: number;
  max?: number;
}

interface JsonMetaPointer {
  items?: string[];
  minItems?: number[];
  maxItems?: number[];
  min?: number;
  max?: number;
}

interface JsonMetaAttribute {
  type?: string;
  enum?: string[];
}

function metaNodeName(core: GmeCore, node: GmeNode): string {
  const value = core.getAttribute(node, "name");
  return typeof value === "string" && value.length > 0 ? value : "(unnamed)";
}

function buildPathToNameMap(context: LoadedSeedContext): Map<string, string> {
  const metaByPath = context.core.getAllMetaNodes(context.rootNode);
  const map = new Map<string, string>();
  for (const [nodePath, node] of Object.entries(metaByPath)) {
    map.set(nodePath, metaNodeName(context.core, node));
  }
  return map;
}

function resolveTypeRef(paths: string[], pathToName: Map<string, string>): TypeRef | undefined {
  const names = paths
    .map((p) => pathToName.get(p))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  return names.sort((a, b) => a.localeCompare(b));
}

function buildMembersMap(
  items: string[],
  minItems: number[],
  maxItems: number[],
  pathToName: Map<string, string>,
): MembersMap | undefined {
  const members: MembersMap = {};
  for (let i = 0; i < items.length; i += 1) {
    const name = pathToName.get(items[i]);
    if (!name) continue;
    const card = cardinalityFromMinMax(minItems[i], maxItems[i]) ?? "*";
    members[name] = card;
  }
  return Object.keys(members).length > 0 ? members : undefined;
}

function sortMembersMap(members: MembersMap): MembersMap {
  return Object.fromEntries(
    Object.entries(members).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function buildMemberRule(
  block: JsonMetaChildren | JsonMetaPointer,
  pathToName: Map<string, string>,
): MemberRule | undefined {
  const items = block.items ?? [];
  if (items.length === 0) return undefined;

  const minItems = block.minItems ?? [];
  const maxItems = block.maxItems ?? [];
  const members = buildMembersMap(items, minItems, maxItems, pathToName);
  if (!members) return undefined;

  const sorted = sortMembersMap(members);
  const global = cardinalityFromMinMax(block.min, block.max);
  if (global) {
    return { global, members: sorted };
  }
  return sorted;
}

function mapAttributeDef(raw: JsonMetaAttribute): AttributeDef | undefined {
  const type = raw.type;
  if (!type) return undefined;
  if (type === "boolean") return "bool";
  if (type === "string" && Array.isArray(raw.enum) && raw.enum.length > 0) {
    return { type: "enum", values: [...raw.enum] };
  }
  if (type === "string") return "string";
  if (type === "integer") return "integer";
  if (type === "float") return "float";
  if (type === "asset") return "asset";
  return type;
}

function mapAttributes(meta: Record<string, unknown>): Record<string, AttributeDef> | undefined {
  const raw = meta.attributes as Record<string, JsonMetaAttribute> | undefined;
  if (!raw) return undefined;

  const attributes: Record<string, AttributeDef> = {};
  for (const [name, def] of Object.entries(raw)) {
    if (name === "name") continue;
    const mapped = mapAttributeDef(def);
    if (mapped) attributes[name] = mapped;
  }
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function mapPointers(
  meta: Record<string, unknown>,
  pathToName: Map<string, string>,
): { pointers: Record<string, TypeRef>; sets: Record<string, MemberRule> } {
  const raw = meta.pointers as Record<string, JsonMetaPointer> | undefined;
  const pointers: Record<string, TypeRef> = {};
  const sets: Record<string, MemberRule> = {};

  if (!raw) return { pointers, sets };

  for (const [name, rule] of Object.entries(raw)) {
    const max = rule.max ?? -1;
    const isPointer = max === 1;
    if (isPointer) {
      const target = resolveTypeRef(rule.items ?? [], pathToName);
      if (target) pointers[name] = target;
    } else {
      const memberRule = buildMemberRule(rule, pathToName);
      if (memberRule) sets[name] = memberRule;
    }
  }

  return { pointers, sets };
}

function conceptFromIrNode(
  node: MetaAspectNodeIr,
  context: LoadedSeedContext,
  pathToName: Map<string, string>,
): [string, ConceptBody] | undefined {
  if (SYSTEM_CONCEPTS.has(node.name)) return undefined;

  const metaNode = context.core.getAllMetaNodes(context.rootNode)[node.path];
  if (!metaNode) return undefined;

  const body: ConceptBody = {};
  const base = context.core.getBase(metaNode);
  if (base) {
    const baseName = metaNodeName(context.core, base);
    if (baseName !== "FCO") body.extends = baseName;
  }

  const attributes = mapAttributes(node.meta);
  if (attributes) body.attributes = attributes;

  const children = buildMemberRule(
    (node.meta.children ?? {}) as JsonMetaChildren,
    pathToName,
  );
  if (children) body.contains = children;

  const { pointers, sets } = mapPointers(node.meta, pathToName);
  if (Object.keys(pointers).length > 0) body.pointers = pointers;
  if (Object.keys(sets).length > 0) body.sets = sets;

  return [node.name, body];
}

export function irToDescriptor(ir: SeedMetaIr, context: LoadedSeedContext): MetaDescriptor {
  const pathToName = buildPathToNameMap(context);
  const concepts: Record<string, ConceptBody> = {};

  for (const node of ir.metaAspectSet) {
    const entry = conceptFromIrNode(node, context, pathToName);
    if (entry) concepts[entry[0]] = entry[1];
  }

  return { version: 1, concepts };
}

export function getMemberMap(rule: MemberRule): MembersMap {
  return isStructuredMemberRule(rule) ? rule.members : rule;
}

export function getMemberGlobal(rule: MemberRule): string | undefined {
  return isStructuredMemberRule(rule) ? rule.global : undefined;
}
