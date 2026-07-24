import fs from "node:fs";
import path from "node:path";
import { parseCardinalityToken } from "./cardinality.js";
import type {
  AttributeDef,
  ConceptBody,
  MemberRule,
  MetaDescriptor,
  TypeRef,
} from "./types.js";
import { isStructuredMemberRule } from "./types.js";

export interface MetalangParseResult {
  domain: string;
  descriptor: MetaDescriptor;
  /** Library names introduced via `library` blocks or `import` (sorted). */
  libraries: string[];
}

export class MetalangParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(message + " at " + line + ":" + column);
    this.name = "MetalangParseError";
  }
}

class Scanner {
  readonly source: string;
  i = 0;
  line = 1;
  column = 1;

  constructor(source: string) {
    this.source = source.replace(/^\uFEFF/, "");
  }

  peek(): string {
    return this.source[this.i] ?? "";
  }

  eof(): boolean {
    return this.i >= this.source.length;
  }

  advance(): string {
    const ch = this.source[this.i++] ?? "";
    if (ch === "\n") {
      this.line += 1;
      this.column = 1;
    } else if (ch !== "") {
      this.column += 1;
    }
    return ch;
  }

  match(expected: string): boolean {
    if (this.source.startsWith(expected, this.i)) {
      for (let n = 0; n < expected.length; n++) this.advance();
      return true;
    }
    return false;
  }

  skipTrivia(): void {
    for (;;) {
      while (!this.eof() && /[ \t\r\n]/.test(this.peek())) this.advance();
      if (this.match("//")) {
        while (!this.eof() && this.peek() !== "\n") this.advance();
        continue;
      }
      if (this.match("/*")) {
        while (!this.eof() && !this.match("*/")) this.advance();
        continue;
      }
      break;
    }
  }

  expect(ch: string): void {
    this.skipTrivia();
    if (!this.match(ch)) {
      throw new MetalangParseError('Expected "' + ch + '"', this.line, this.column);
    }
  }

  readIdentifier(): string {
    this.skipTrivia();
    if (!/[A-Za-z]/.test(this.peek())) {
      throw new MetalangParseError("Expected identifier", this.line, this.column);
    }
    let out = this.advance();
    while (/[A-Za-z0-9_]/.test(this.peek())) out += this.advance();
    return out;
  }

  readQualifiedName(): string {
    let name = this.readIdentifier();
    this.skipTrivia();
    while (this.peek() === ".") {
      this.advance();
      name += "." + this.readIdentifier();
      this.skipTrivia();
    }
    return name;
  }

  readString(): string {
    this.skipTrivia();
    if (this.peek() !== '"') {
      throw new MetalangParseError("Expected string literal", this.line, this.column);
    }
    this.advance();
    let out = "";
    while (!this.eof() && this.peek() !== '"') {
      const ch = this.advance();
      if (ch === "\\" && !this.eof()) out += this.advance();
      else out += ch;
    }
    if (this.peek() !== '"') {
      throw new MetalangParseError("Unterminated string", this.line, this.column);
    }
    this.advance();
    return out;
  }

  tryKeyword(word: string): boolean {
    this.skipTrivia();
    const start = this.i;
    const line = this.line;
    const column = this.column;
    if (!this.match(word)) return false;
    const next = this.peek();
    if (/[A-Za-z0-9_]/.test(next)) {
      this.i = start;
      this.line = line;
      this.column = column;
      return false;
    }
    return true;
  }
}

function qualifyRef(ref: string, library: string | null, localNames: Set<string>): string {
  if (ref.includes(".")) return ref;
  if (library && localNames.has(ref)) return library + "." + ref;
  return ref;
}

function qualifyTypeRef(
  ref: TypeRef,
  library: string | null,
  localNames: Set<string>,
): TypeRef {
  if (typeof ref === "string") return qualifyRef(ref, library, localNames);
  return ref.map((r) => qualifyRef(r, library, localNames));
}

function qualifyMemberRule(
  rule: MemberRule,
  library: string | null,
  localNames: Set<string>,
): MemberRule {
  const qualifyMap = (members: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [typeName, card] of Object.entries(members)) {
      out[qualifyRef(typeName, library, localNames)] = card;
    }
    return out;
  };
  if (isStructuredMemberRule(rule)) {
    return {
      ...(rule.global ? { global: rule.global } : {}),
      members: qualifyMap(rule.members),
    };
  }
  return qualifyMap(rule);
}

function qualifyConceptBody(
  body: ConceptBody,
  library: string | null,
  localNames: Set<string>,
): ConceptBody {
  const next: ConceptBody = { ...body };
  if (next.extends) next.extends = qualifyRef(next.extends, library, localNames);
  if (next.pointers) {
    const pointers: Record<string, TypeRef> = {};
    for (const [name, target] of Object.entries(next.pointers)) {
      pointers[name] = qualifyTypeRef(target, library, localNames);
    }
    next.pointers = pointers;
  }
  if (next.contains) next.contains = qualifyMemberRule(next.contains, library, localNames);
  if (next.sets) {
    const sets: Record<string, MemberRule> = {};
    for (const [name, rule] of Object.entries(next.sets)) {
      sets[name] = qualifyMemberRule(rule, library, localNames);
    }
    next.sets = sets;
  }
  return next;
}

function parseAttributeType(sc: Scanner): AttributeDef {
  sc.skipTrivia();
  if (sc.tryKeyword("enum")) {
    sc.expect("[");
    const values: string[] = [];
    for (;;) {
      sc.skipTrivia();
      if (sc.peek() === '"') values.push(sc.readString());
      else values.push(sc.readIdentifier());
      sc.skipTrivia();
      if (sc.peek() === "]") break;
      sc.expect(",");
    }
    sc.expect("]");
    return { type: "enum", values };
  }
  const typeName = sc.readIdentifier();
  const allowed = ["string", "bool", "float", "integer", "asset"];
  if (!allowed.includes(typeName)) {
    throw new MetalangParseError(
      'Unknown attribute type "' + typeName + '"',
      sc.line,
      sc.column,
    );
  }
  return typeName;
}

function parseMemberCardinality(sc: Scanner): string {
  sc.skipTrivia();
  if (sc.peek() === "*" || sc.peek() === "+" || sc.peek() === "?") {
    return parseCardinalityToken(sc.advance());
  }
  if (sc.peek() === ":") {
    sc.advance();
    sc.skipTrivia();
    let token = "";
    while (/[0-9.*]/.test(sc.peek())) token += sc.advance();
    return parseCardinalityToken(token);
  }
  return "*";
}

function parseGlobalCardSuffix(sc: Scanner): string | undefined {
  sc.skipTrivia();
  if (sc.peek() !== "[") return undefined;
  sc.advance();
  sc.skipTrivia();
  let token = "";
  while (!sc.eof() && sc.peek() !== "]") token += sc.advance();
  sc.expect("]");
  return parseCardinalityToken(token.trim());
}

function parseTypedMemberList(sc: Scanner): Record<string, string> {
  const members: Record<string, string> = {};
  for (;;) {
    const typeName = sc.readQualifiedName();
    const card = parseMemberCardinality(sc);
    members[typeName] = card;
    sc.skipTrivia();
    if (sc.peek() !== ",") break;
    sc.advance();
  }
  return members;
}

function parseTypeRefList(sc: Scanner): TypeRef {
  const parts = [sc.readQualifiedName()];
  sc.skipTrivia();
  while (sc.peek() === "|") {
    sc.advance();
    parts.push(sc.readQualifiedName());
    sc.skipTrivia();
  }
  return parts.length === 1 ? parts[0]! : parts;
}

function parseConceptBody(sc: Scanner): ConceptBody {
  const body: ConceptBody = {};
  sc.expect("{");
  for (;;) {
    sc.skipTrivia();
    if (sc.peek() === "}") {
      sc.advance();
      break;
    }
    if (sc.tryKeyword("contains")) {
      const global = parseGlobalCardSuffix(sc);
      const members = parseTypedMemberList(sc);
      sc.expect(";");
      body.contains = global ? { global, members } : members;
      continue;
    }
    if (sc.tryKeyword("set")) {
      const setName = sc.readIdentifier();
      const global = parseGlobalCardSuffix(sc);
      sc.expect("-");
      if (!sc.match(">")) {
        throw new MetalangParseError('Expected "->"', sc.line, sc.column);
      }
      const members = parseTypedMemberList(sc);
      sc.expect(";");
      if (!body.sets) body.sets = {};
      body.sets[setName] = global ? { global, members } : members;
      continue;
    }

    const name = sc.readIdentifier();
    sc.skipTrivia();
    if (sc.match("->")) {
      const target = parseTypeRefList(sc);
      sc.expect(";");
      if (!body.pointers) body.pointers = {};
      body.pointers[name] = target;
      continue;
    }
    sc.expect(":");
    const attr = parseAttributeType(sc);
    sc.expect(";");
    if (!body.attributes) body.attributes = {};
    body.attributes[name] = attr;
  }
  return body;
}

function parseConceptDecl(sc: Scanner): { name: string; body: ConceptBody } {
  if (!sc.tryKeyword("concept")) {
    throw new MetalangParseError('Expected "concept"', sc.line, sc.column);
  }
  const name = sc.readQualifiedName();
  let extendsName: string | undefined;
  if (sc.tryKeyword("extends")) {
    extendsName = sc.readQualifiedName();
  }
  sc.skipTrivia();
  let body: ConceptBody;
  if (sc.peek() === "{") {
    body = parseConceptBody(sc);
  } else {
    sc.expect(";");
    body = {};
  }
  if (extendsName) body.extends = extendsName;
  return { name, body };
}

function mergeConcepts(
  into: Record<string, ConceptBody>,
  name: string,
  body: ConceptBody,
  sc: Scanner,
): void {
  if (into[name]) {
    throw new MetalangParseError('Duplicate concept "' + name + '"', sc.line, sc.column);
  }
  into[name] = body;
}

function loadImportedLibrary(
  libraryName: string,
  fromPath: string,
  baseDir: string,
  seen: Set<string>,
): { concepts: Record<string, ConceptBody> } {
  const abs = path.resolve(baseDir, fromPath);
  if (seen.has(abs)) {
    throw new Error('Circular metalang import: "' + abs + '"');
  }
  seen.add(abs);
  if (!fs.existsSync(abs)) {
    throw new Error('Imported metalang not found: "' + abs + '"');
  }
  const source = fs.readFileSync(abs, "utf8");
  const nested = parseMetalang(source, { baseDir: path.dirname(abs), seenImports: seen });
  // Imported file's host concepts become Lib.*; nested libraries keep their FQNs.
  const concepts: Record<string, ConceptBody> = {};
  const localNames = new Set(
    Object.keys(nested.descriptor.concepts).filter((k) => !k.includes(".")),
  );
  for (const [name, body] of Object.entries(nested.descriptor.concepts)) {
    if (name.includes(".")) {
      concepts[name] = body;
      continue;
    }
    const qName = libraryName + "." + name;
    concepts[qName] = qualifyConceptBody(body, libraryName, localNames);
  }
  return { concepts };
}

export interface ParseMetalangOptions {
  /** Directory used to resolve `import … from "…"` paths. */
  baseDir?: string;
  /** Internal: track import cycles. */
  seenImports?: Set<string>;
}

/**
 * Parse MetaLang source into a flat MetaDescriptor (library concepts keyed by FQN).
 */
export function parseMetalang(
  source: string,
  options: ParseMetalangOptions = {},
): MetalangParseResult {
  const sc = new Scanner(source);
  const concepts: Record<string, ConceptBody> = {};
  const libraries = new Set<string>();
  let domain = "Domain";
  const baseDir = options.baseDir ?? process.cwd();
  const seen = options.seenImports ?? new Set<string>();

  sc.skipTrivia();
  while (!sc.eof()) {
    if (sc.tryKeyword("domain")) {
      domain = sc.readQualifiedName();
      sc.skipTrivia();
      continue;
    }
    if (sc.tryKeyword("import")) {
      const libName = sc.readIdentifier();
      if (!sc.tryKeyword("from")) {
        throw new MetalangParseError('Expected "from"', sc.line, sc.column);
      }
      const fromPath = sc.readString();
      libraries.add(libName);
      const imported = loadImportedLibrary(libName, fromPath, baseDir, seen);
      for (const [name, body] of Object.entries(imported.concepts)) {
        mergeConcepts(concepts, name, body, sc);
      }
      sc.skipTrivia();
      continue;
    }
    if (sc.tryKeyword("library")) {
      const libName = sc.readIdentifier();
      libraries.add(libName);
      sc.expect("{");
      const local: { name: string; body: ConceptBody }[] = [];
      for (;;) {
        sc.skipTrivia();
        if (sc.peek() === "}") {
          sc.advance();
          break;
        }
        local.push(parseConceptDecl(sc));
      }
      const localNames = new Set(local.map((c) => c.name.split(".").pop()!));
      for (const entry of local) {
        const bare = entry.name.includes(".")
          ? entry.name.slice(entry.name.lastIndexOf(".") + 1)
          : entry.name;
        const qName = libName + "." + bare;
        mergeConcepts(
          concepts,
          qName,
          qualifyConceptBody(entry.body, libName, localNames),
          sc,
        );
      }
      sc.skipTrivia();
      continue;
    }
    if (sc.tryKeyword("concept")) {
      // Rewind keyword consumption: parseConceptDecl expects "concept".
      // tryKeyword already consumed it — feed a tiny scanner shim by re-parsing.
      // Easiest: unread isn't available; call body parse manually.
      const name = sc.readQualifiedName();
      let extendsName: string | undefined;
      if (sc.tryKeyword("extends")) extendsName = sc.readQualifiedName();
      sc.skipTrivia();
      let body: ConceptBody;
      if (sc.peek() === "{") body = parseConceptBody(sc);
      else {
        sc.expect(";");
        body = {};
      }
      if (extendsName) body.extends = extendsName;
      mergeConcepts(concepts, name, body, sc);
      sc.skipTrivia();
      continue;
    }
    if (sc.eof()) break;
    throw new MetalangParseError(
      'Unexpected token near "' + sc.peek() + '"',
      sc.line,
      sc.column,
    );
  }

  return {
    domain,
    descriptor: { version: 1, concepts },
    libraries: [...libraries].sort((a, b) => a.localeCompare(b)),
  };
}

export function parseMetalangFile(filePath: string): MetalangParseResult {
  const abs = path.resolve(filePath);
  const source = fs.readFileSync(abs, "utf8");
  return parseMetalang(source, { baseDir: path.dirname(abs) });
}
