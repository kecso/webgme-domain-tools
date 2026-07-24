import type { GmeCore, GmeNode } from "../session/gme-runtime.js";
import type { LoadedSeedContext } from "../session/project-session.js";
import { cardinalityToMinMax } from "./cardinality.js";
import { getMemberGlobal, getMemberMap } from "./ir-to-descriptor.js";
import type {
  AttributeDef,
  ConceptBody,
  MemberRule,
  MetaDescriptor,
  TypeRef,
} from "./types.js";

const SYSTEM_CONCEPTS = new Set(["FCO", "META"]);
const META_SET_NAME = "MetaAspectSet";

function requireApi<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error("core." + name + " is not available");
  return value;
}

function nodeName(core: GmeCore, node: GmeNode): string {
  const value = core.getAttribute(node, "name");
  return typeof value === "string" && value.length > 0 ? value : "(unnamed)";
}

export function findNamedMetaNode(
  core: GmeCore,
  root: GmeNode,
  name: string,
): GmeNode | null {
  const all = core.getAllMetaNodes(root);
  for (const node of Object.values(all)) {
    if (nodeName(core, node) === name) return node;
  }
  return null;
}

/** Remove host domain meta concepts (keep FCO + META sheet). Library nodes are left alone. */
export function clearHostDomainMeta(context: LoadedSeedContext): void {
  const core = context.core;
  const deleteNode = requireApi(core.deleteNode, "deleteNode");
  const delMember = requireApi(core.delMember, "delMember");
  const isLib =
    typeof core.isLibraryElement === "function"
      ? (n: GmeNode) => Boolean(core.isLibraryElement!(n))
      : () => false;

  const meta = core.getAllMetaNodes(context.rootNode);
  const toDelete: GmeNode[] = [];
  for (const node of Object.values(meta)) {
    const name = nodeName(core, node);
    if (SYSTEM_CONCEPTS.has(name)) continue;
    if (isLib(node)) continue;
    toDelete.push(node);
  }
  for (const node of toDelete) {
    delMember(context.rootNode, META_SET_NAME, core.getPath(node));
    deleteNode(node);
  }
}

function attributeMetaValue(def: AttributeDef): Record<string, unknown> {
  if (typeof def === "string") {
    return { type: def === "bool" ? "boolean" : def };
  }
  const out: Record<string, unknown> = {
    type: def.type === "bool" ? "boolean" : def.type,
  };
  if (def.type === "enum" && def.values) out.enum = def.values;
  if (def.hidden !== undefined) out.hidden = def.hidden;
  if (def.readOnly !== undefined) out.readOnly = def.readOnly;
  if (def.min !== undefined) out.min = def.min;
  if (def.max !== undefined) out.max = def.max;
  if (def.default !== undefined) out.default = def.default;
  return out;
}

function asTypeList(ref: TypeRef): string[] {
  return typeof ref === "string" ? [ref] : ref;
}

function resolveConcept(
  name: string,
  byName: Map<string, GmeNode>,
): GmeNode {
  const node = byName.get(name);
  if (!node) throw new Error('Unknown concept reference "' + name + '"');
  return node;
}

function applyMemberRule(
  core: GmeCore,
  owner: GmeNode,
  rule: MemberRule,
  byName: Map<string, GmeNode>,
  kind: "contains" | "set",
  setName?: string,
): void {
  const members = getMemberMap(rule);
  const global = getMemberGlobal(rule);

  if (kind === "contains") {
    const setChildMeta = requireApi(core.setChildMeta, "setChildMeta");
    for (const [typeName, card] of Object.entries(members)) {
      const { min, max } = cardinalityToMinMax(card);
      setChildMeta(owner, resolveConcept(typeName, byName), min, max);
    }
    if (global && global !== "*") {
      const limits = cardinalityToMinMax(global);
      requireApi(core.setChildrenMetaLimits, "setChildrenMetaLimits")(
        owner,
        limits.min,
        limits.max,
      );
    }
    return;
  }

  const pointerName = setName!;
  const setTarget = requireApi(core.setPointerMetaTarget, "setPointerMetaTarget");
  const setLimits = requireApi(core.setPointerMetaLimits, "setPointerMetaLimits");
  for (const [typeName, card] of Object.entries(members)) {
    const { min, max } = cardinalityToMinMax(card);
    setTarget(owner, pointerName, resolveConcept(typeName, byName), min, max);
  }
  if (global && global !== "*") {
    const limits = cardinalityToMinMax(global);
    setLimits(owner, pointerName, limits.min, limits.max);
  } else {
    // Sets without an explicit global stay unbounded (min 0, max -1).
    setLimits(owner, pointerName, 0, -1);
  }
}

/**
 * Apply a flat host MetaDescriptor onto an open project (FCO + META must exist).
 * Concept keys must be bare host names (no library FQNs).
 * Call after libraries are attached so FQN targets (Lib.Concept) resolve.
 */
export function applyHostDescriptor(
  context: LoadedSeedContext,
  descriptor: MetaDescriptor,
  options: { clearHost?: boolean } = {},
): void {
  const core = context.core;
  const createNode = requireApi(core.createNode, "createNode");
  const setAttribute = requireApi(core.setAttribute, "setAttribute");
  const addMember = requireApi(core.addMember, "addMember");
  const setBase = requireApi(core.setBase, "setBase");
  const setAttributeMeta = requireApi(core.setAttributeMeta, "setAttributeMeta");
  const setPointerMetaTarget = requireApi(core.setPointerMetaTarget, "setPointerMetaTarget");
  const setPointerMetaLimits = requireApi(core.setPointerMetaLimits, "setPointerMetaLimits");

  const fco = findNamedMetaNode(core, context.rootNode, "FCO");
  const metaSheet = findNamedMetaNode(core, context.rootNode, "META");
  if (!fco || !metaSheet) {
    throw new Error("Template project must contain FCO and META meta nodes");
  }

  if (options.clearHost !== false) {
    clearHostDomainMeta(context);
  }

  const byName = new Map<string, GmeNode>();
  // Seed map with every existing meta node (FQN + simple name for host).
  for (const node of Object.values(core.getAllMetaNodes(context.rootNode))) {
    const simple = nodeName(core, node);
    byName.set(simple, node);
    if (typeof core.getFullyQualifiedName === "function") {
      const fqn = core.getFullyQualifiedName(node);
      if (typeof fqn === "string" && fqn.length > 0) byName.set(fqn, node);
    }
  }
  byName.set("FCO", fco);
  byName.set("META", metaSheet);

  // Pass 1: create nodes under META, register in MetaAspectSet.
  for (const [name, body] of Object.entries(descriptor.concepts)) {
    if (name.includes(".")) {
      throw new Error('Host descriptor must not contain library FQN "' + name + '"');
    }
    if (SYSTEM_CONCEPTS.has(name)) continue;
    const node = createNode({ parent: metaSheet, base: fco });
    setAttribute(node, "name", name);
    addMember(context.rootNode, META_SET_NAME, node);
    byName.set(name, node);
    void body;
  }

  // Pass 2: inheritance + attributes + relations.
  for (const [name, body] of Object.entries(descriptor.concepts)) {
    if (SYSTEM_CONCEPTS.has(name)) continue;
    const node = byName.get(name)!;
    if (body.extends && body.extends !== "FCO") {
      setBase(node, resolveConcept(body.extends, byName));
    }
    if (body.attributes) {
      for (const [attrName, def] of Object.entries(body.attributes)) {
        setAttributeMeta(node, attrName, attributeMetaValue(def));
      }
    }
    if (body.pointers) {
      for (const [ptrName, target] of Object.entries(body.pointers)) {
        for (const typeName of asTypeList(target)) {
          setPointerMetaTarget(node, ptrName, resolveConcept(typeName, byName), -1, 1);
        }
        setPointerMetaLimits(node, ptrName, 1, 1);
      }
    }
    if (body.contains) {
      applyMemberRule(core, node, body.contains, byName, "contains");
    }
    if (body.sets) {
      for (const [setName, rule] of Object.entries(body.sets)) {
        applyMemberRule(core, node, rule, byName, "set", setName);
      }
    }
  }
}

export function splitDescriptorLibraries(descriptor: MetaDescriptor): {
  host: MetaDescriptor;
  libraries: Record<string, MetaDescriptor>;
} {
  const hostConcepts: MetaDescriptor["concepts"] = {};
  const libraries: Record<string, MetaDescriptor["concepts"]> = {};
  for (const [name, body] of Object.entries(descriptor.concepts)) {
    const dot = name.indexOf(".");
    if (dot === -1) {
      hostConcepts[name] = body;
      continue;
    }
    const lib = name.slice(0, dot);
    const bare = name.slice(dot + 1);
    if (!libraries[lib]) libraries[lib] = {};
    libraries[lib]![bare] = stripLibraryPrefixFromBody(body, lib);
  }
  return {
    host: { version: 1, concepts: hostConcepts },
    libraries: Object.fromEntries(
      Object.entries(libraries).map(([lib, concepts]) => [lib, { version: 1 as const, concepts }]),
    ),
  };
}

function stripLibraryPrefixFromBody(body: ConceptBody, lib: string): ConceptBody {
  const prefix = lib + ".";
  const strip = (ref: string) => (ref.startsWith(prefix) ? ref.slice(prefix.length) : ref);
  const stripRef = (ref: TypeRef): TypeRef =>
    typeof ref === "string" ? strip(ref) : ref.map(strip);
  const stripRule = (rule: MemberRule): MemberRule => {
    const members = getMemberMap(rule);
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(members)) next[strip(k)] = v;
    const global = getMemberGlobal(rule);
    return global ? { global, members: next } : next;
  };
  const out: ConceptBody = { ...body };
  if (out.extends) out.extends = strip(out.extends);
  if (out.pointers) {
    const pointers: Record<string, TypeRef> = {};
    for (const [k, v] of Object.entries(out.pointers)) pointers[k] = stripRef(v);
    out.pointers = pointers;
  }
  if (out.contains) out.contains = stripRule(out.contains);
  if (out.sets) {
    const sets: Record<string, MemberRule> = {};
    for (const [k, v] of Object.entries(out.sets)) sets[k] = stripRule(v);
    out.sets = sets;
  }
  return out;
}
