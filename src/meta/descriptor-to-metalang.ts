import { formatGlobalCardinality, formatMemberCardinality } from "./cardinality.js";
import { getMemberGlobal, getMemberMap } from "./ir-to-descriptor.js";
import type { AttributeDef, ConceptBody, MemberRule, MetaDescriptor, TypeRef } from "./types.js";

function formatTypeRef(ref: TypeRef): string {
  if (typeof ref === "string") return ref;
  return ref.join(" | ");
}

function formatAttributeDef(name: string, def: AttributeDef): string {
  if (typeof def === "string") {
    return `  ${name}: ${def};`;
  }
  if (def.type === "enum" && def.values) {
    return `  ${name}: enum[${def.values.join(", ")}];`;
  }
  return `  ${name}: ${def.type};`;
}

function formatTypedMemberList(members: Record<string, string>): string {
  return Object.entries(members)
    .map(([typeName, card]) => `${typeName}${formatMemberCardinality(card)}`)
    .join(", ");
}

function formatMemberRuleKeyword(keyword: "contains" | "set", name: string | undefined, rule: MemberRule): string {
  const global = getMemberGlobal(rule);
  const members = getMemberMap(rule);
  const memberList = formatTypedMemberList(members);
  let globalSuffix = "";
  if (global && global !== "*") {
    globalSuffix = `[${formatGlobalCardinality(global)}]`;
  }

  if (keyword === "contains") {
    return `  contains${globalSuffix} ${memberList};`;
  }
  return `  set ${name}${globalSuffix} -> ${memberList};`;
}

function renderConceptBody(body: ConceptBody, indent: string): string[] {
  const lines: string[] = [];

  if (body.attributes) {
    for (const [name, def] of Object.entries(body.attributes)) {
      lines.push(indent + formatAttributeDef(name, def).trimStart());
    }
  }

  if (body.pointers) {
    for (const [name, target] of Object.entries(body.pointers)) {
      lines.push(`${indent}${name} -> ${formatTypeRef(target)};`);
    }
  }

  if (body.contains) {
    lines.push(indent + formatMemberRuleKeyword("contains", undefined, body.contains).trimStart());
  }

  if (body.sets) {
    for (const [setName, rule] of Object.entries(body.sets)) {
      lines.push(indent + formatMemberRuleKeyword("set", setName, rule).trimStart());
    }
  }

  return lines;
}

/** Emit a concept using a display name (bare inside library blocks, FQN or bare at host level). */
function renderConcept(displayName: string, body: ConceptBody, indent = ""): string[] {
  const members = renderConceptBody(body, indent + "  ");
  if (members.length === 0) {
    if (body.extends) {
      return [`${indent}concept ${displayName} extends ${body.extends};`];
    }
    return [`${indent}concept ${displayName};`];
  }

  const head = body.extends
    ? `${indent}concept ${displayName} extends ${body.extends} {`
    : `${indent}concept ${displayName} {`;
  return [head, ...members, `${indent}}`];
}

function libraryOf(conceptName: string): string | null {
  const dot = conceptName.indexOf(".");
  return dot === -1 ? null : conceptName.slice(0, dot);
}

function bareName(conceptName: string): string {
  const dot = conceptName.lastIndexOf(".");
  return dot === -1 ? conceptName : conceptName.slice(dot + 1);
}

/**
 * Canonical MetaLang emit: host concepts top-level; library concepts grouped in
 * `library Lib { … }` blocks so definition origin is explicit.
 */
export function descriptorToMetalang(descriptor: MetaDescriptor, domain: string): string {
  const lines: string[] = [`domain ${domain}`, ""];

  const host: Array<[string, ConceptBody]> = [];
  const byLibrary = new Map<string, Array<[string, ConceptBody]>>();

  for (const [name, body] of Object.entries(descriptor.concepts)) {
    const lib = libraryOf(name);
    if (!lib) {
      host.push([name, body]);
      continue;
    }
    const list = byLibrary.get(lib) ?? [];
    list.push([name, body]);
    byLibrary.set(lib, list);
  }

  for (const [name, body] of host) {
    lines.push(...renderConcept(name, body));
    lines.push("");
  }

  const libNames = [...byLibrary.keys()].sort((a, b) => a.localeCompare(b));
  for (const lib of libNames) {
    lines.push(`library ${lib} {`);
    for (const [fqn, body] of byLibrary.get(lib)!) {
      lines.push(...renderConcept(bareName(fqn), body, "  "));
      lines.push("");
    }
    // drop trailing blank inside block before closing
    if (lines[lines.length - 1] === "") lines.pop();
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n").replace(/\n+$/, "\n");
}
