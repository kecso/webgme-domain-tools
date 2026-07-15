import type {
  AttributeDef,
  AttributeMeta,
  ConceptBody,
  MemberRule,
  MetaDescriptor,
  TypeRef,
} from "./types.js";
import { getMemberGlobal, getMemberMap } from "./ir-to-descriptor.js";

export interface MetaTsGenerateOptions {
  /** Seed / domain name used in the file header. */
  seedName: string;
  /** Optional TS namespace wrapping all exports. */
  namespace?: string;
}

function isValidTsIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function quoteProp(name: string): string {
  return isValidTsIdentifier(name) ? name : JSON.stringify(name);
}

function attributeValueType(def: AttributeDef): string {
  if (typeof def === "string") {
    switch (def) {
      case "bool":
        return "boolean";
      case "integer":
        return "number";
      case "float":
        return "number";
      case "string":
        return "string";
      case "asset":
        return "string";
      default:
        return "unknown";
    }
  }
  const meta = def as AttributeMeta;
  if (meta.type === "enum" && Array.isArray(meta.values) && meta.values.length > 0) {
    return meta.values.map((v) => JSON.stringify(v)).join(" | ");
  }
  if (meta.type === "boolean" || meta.type === "bool") return "boolean";
  if (meta.type === "integer" || meta.type === "float") return "number";
  if (meta.type === "string" || meta.type === "asset") return "string";
  return "unknown";
}

function typeRefToTs(ref: TypeRef): string {
  if (typeof ref === "string") return JSON.stringify(ref);
  return ref.map((r) => JSON.stringify(r)).join(" | ");
}

function renderAttributesInterface(concept: string, body: ConceptBody): string | null {
  const attrs = body.attributes;
  if (!attrs || Object.keys(attrs).length === 0) return null;
  const lines = Object.entries(attrs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, def]) => `  ${quoteProp(name)}: ${attributeValueType(def)};`);
  return `export interface ${concept}Attributes {\n${lines.join("\n")}\n}`;
}

function renderPointersInterface(concept: string, body: ConceptBody): string | null {
  const pointers = body.pointers;
  if (!pointers || Object.keys(pointers).length === 0) return null;
  const lines = Object.entries(pointers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ref]) => `  ${quoteProp(name)}: ${typeRefToTs(ref)};`);
  return `export interface ${concept}Pointers {\n${lines.join("\n")}\n}`;
}

function renderMemberMapType(rule: MemberRule): string {
  const members = getMemberMap(rule);
  const global = getMemberGlobal(rule);
  const entries = Object.entries(members)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, card]) => `  ${quoteProp(name)}: ${JSON.stringify(card)};`);
  if (global) {
    entries.unshift(`  readonly __global?: ${JSON.stringify(global)};`);
  }
  return `{\n${entries.join("\n")}\n}`;
}

function renderContainsType(concept: string, body: ConceptBody): string | null {
  if (!body.contains) return null;
  return `export type ${concept}Contains = ${renderMemberMapType(body.contains)};`;
}

function renderSetsType(concept: string, body: ConceptBody): string | null {
  const sets = body.sets;
  if (!sets || Object.keys(sets).length === 0) return null;
  const lines = Object.entries(sets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rule]) => `  ${quoteProp(name)}: ${renderMemberMapType(rule)};`);
  return `export interface ${concept}Sets {\n${lines.join("\n")}\n}`;
}

function indentBlock(source: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return source
    .split("\n")
    .map((line) => (line.length === 0 ? line : pad + line))
    .join("\n");
}

function renderDeclarations(descriptor: MetaDescriptor): string {
  const conceptNames = Object.keys(descriptor.concepts).sort((a, b) => a.localeCompare(b));
  for (const name of conceptNames) {
    if (!isValidTsIdentifier(name)) {
      throw new Error(
        'Concept name "' +
          name +
          '" is not a valid TypeScript identifier; rename in the metamodel or extend the generator',
      );
    }
  }

  const blocks: string[] = [];

  if (conceptNames.length === 0) {
    blocks.push("export type MetaConceptName = never;", "");
    blocks.push("export const MetaConcepts = {} as const;", "");
  } else {
    blocks.push(
      "export type MetaConceptName =",
      ...conceptNames.map(
        (n, i) => "  | " + JSON.stringify(n) + (i === conceptNames.length - 1 ? ";" : ""),
      ),
      "",
    );
    blocks.push("export const MetaConcepts = {");
    for (const name of conceptNames) {
      blocks.push("  " + name + ": " + JSON.stringify(name) + ",");
    }
    blocks.push("} as const satisfies Record<string, MetaConceptName>;", "");
  }

  const attrsParts: string[] = [];
  const pointersParts: string[] = [];
  const containsParts: string[] = [];
  const setsParts: string[] = [];

  for (const name of conceptNames) {
    const body = descriptor.concepts[name];
    const attrs = renderAttributesInterface(name, body);
    if (attrs) {
      blocks.push(attrs, "");
      attrsParts.push("  " + name + ": " + name + "Attributes;");
    } else {
      attrsParts.push("  " + name + ": Record<string, never>;");
    }

    const pointers = renderPointersInterface(name, body);
    if (pointers) {
      blocks.push(pointers, "");
      pointersParts.push("  " + name + ": " + name + "Pointers;");
    }

    const contains = renderContainsType(name, body);
    if (contains) {
      blocks.push(contains, "");
      containsParts.push("  " + name + ": " + name + "Contains;");
    }

    const sets = renderSetsType(name, body);
    if (sets) {
      blocks.push(sets, "");
      setsParts.push("  " + name + ": " + name + "Sets;");
    }
  }

  blocks.push("export type AttributesByConcept = {", ...attrsParts, "};", "");

  if (pointersParts.length > 0) {
    blocks.push("export type PointersByConcept = {", ...pointersParts, "};", "");
  } else {
    blocks.push("export type PointersByConcept = Record<string, never>;", "");
  }

  if (containsParts.length > 0) {
    blocks.push("export type ContainsByConcept = {", ...containsParts, "};", "");
  } else {
    blocks.push("export type ContainsByConcept = Record<string, never>;", "");
  }

  if (setsParts.length > 0) {
    blocks.push("export type SetsByConcept = {", ...setsParts, "};", "");
  } else {
    blocks.push("export type SetsByConcept = Record<string, never>;", "");
  }

  return blocks.join("\n").replace(/\n+$/, "") + "\n";
}

/**
 * Emit TypeScript types from a MetaDescriptor (F14).
 * Pure transform — no I/O.
 */
export function descriptorToMetaTs(
  descriptor: MetaDescriptor,
  options: MetaTsGenerateOptions,
): string {
  const header =
    "/**\n" +
    " * Generated by webdot generate meta-ts — do not edit by hand.\n" +
    " * Seed: " +
    options.seedName +
    "\n" +
    " */\n\n";

  const declarations = renderDeclarations(descriptor);

  if (!options.namespace) {
    return header + declarations;
  }

  if (!isValidTsIdentifier(options.namespace)) {
    throw new Error('Namespace "' + options.namespace + '" is not a valid TypeScript identifier');
  }

  return (
    header +
    "export namespace " +
    options.namespace +
    " {\n" +
    indentBlock(declarations.replace(/\n+$/, ""), 2) +
    "\n}\n"
  );
}
