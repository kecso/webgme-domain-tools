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

function renderConceptBody(body: ConceptBody): string[] {
  const lines: string[] = [];

  if (body.attributes) {
    for (const [name, def] of Object.entries(body.attributes)) {
      lines.push(formatAttributeDef(name, def));
    }
  }

  if (body.pointers) {
    for (const [name, target] of Object.entries(body.pointers)) {
      lines.push(`  ${name} -> ${formatTypeRef(target)};`);
    }
  }

  if (body.contains) {
    lines.push(formatMemberRuleKeyword("contains", undefined, body.contains));
  }

  if (body.sets) {
    for (const [setName, rule] of Object.entries(body.sets)) {
      lines.push(formatMemberRuleKeyword("set", setName, rule));
    }
  }

  return lines;
}

function renderConcept(name: string, body: ConceptBody): string[] {
  const members = renderConceptBody(body);
  if (members.length === 0) {
    if (body.extends) {
      return [`concept ${name} extends ${body.extends};`];
    }
    return [`concept ${name};`];
  }

  const head = body.extends
    ? `concept ${name} extends ${body.extends} {`
    : `concept ${name} {`;
  return [head, ...members, "}"];
}

export function descriptorToMetalang(descriptor: MetaDescriptor, domain: string): string {
  const lines: string[] = [`domain ${domain}`, ""];

  for (const [name, body] of Object.entries(descriptor.concepts)) {
    lines.push(...renderConcept(name, body));
    lines.push("");
  }

  return lines.join("\n").replace(/\n+$/, "\n");
}
