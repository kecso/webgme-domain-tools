import fs from "node:fs";
import path from "node:path";
import {
  formatUnknownPluginError,
  formatUnknownSeedError,
} from "./catalog-errors.js";
import {
  type CatalogEntry,
  type ComponentKind,
  COMPONENT_KINDS,
  REF_PREFIX,
  type SetupCatalog,
} from "./types.js";

const SETUP_FILE = "webgme-setup.json";

const BLOB_ARTIFACT_PLUGINS = new Set([
  "ModelToVerification",
  "ModelToConstraints",
  "SimulateMachine",
  "VerifyModel",
]);

interface SetupJson {
  components?: Partial<Record<ComponentKind, Record<string, { src?: string }>>>;
}

function findWebgmexFiles(seedDir: string): string[] {
  if (!fs.existsSync(seedDir)) return [];
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(".webgmex")) results.push(full);
    }
  };
  walk(seedDir);
  return results.sort();
}

function buildEntry(
  cwd: string,
  kind: ComponentKind,
  name: string,
  srcRel: string | undefined,
): CatalogEntry {
  const prefix = REF_PREFIX[kind];
  const ref = prefix + ":" + name;
  const src = srcRel ?? "";
  const absPath = src ? path.resolve(cwd, src) : cwd;
  const exists = src ? fs.existsSync(absPath) : false;
  const notes: string[] = [];
  let artifacts: string[] = [];
  let metadataPath: string | undefined;

  if (kind === "seeds") {
    artifacts = findWebgmexFiles(absPath);
    if (exists && artifacts.length === 0) {
      notes.push("missing .webgmex — expected " + name + ".webgmex");
    }
  }

  if (kind === "plugins") {
    const meta = path.join(absPath, "metadata.json");
    if (fs.existsSync(meta)) metadataPath = meta;
    else if (exists) notes.push("missing metadata.json");
    if (BLOB_ARTIFACT_PLUGINS.has(name)) notes.push("produces blob artifacts");
  }

  return { ref, kind, name, src, absPath, exists, artifacts, metadataPath, notes };
}

export function loadSetupCatalog(cwd: string): SetupCatalog {
  const setupPath = path.join(cwd, SETUP_FILE);
  if (!fs.existsSync(setupPath)) {
    throw new Error(
      "Missing " + SETUP_FILE + " at " + cwd + ". Run from a WebGME project root.",
    );
  }
  const raw = JSON.parse(fs.readFileSync(setupPath, "utf8")) as SetupJson;
  const components = raw.components ?? {};
  const catalog: SetupCatalog = {
    cwd,
    setupPath,
    seeds: [],
    plugins: [],
    visualizers: [],
    routers: [],
  };
  for (const kind of COMPONENT_KINDS) {
    const group = components[kind] ?? {};
    catalog[kind] = Object.keys(group)
      .sort()
      .map((name) => buildEntry(cwd, kind, name, group[name]?.src));
  }
  return catalog;
}

export function resolveSeed(catalog: SetupCatalog, name: string): CatalogEntry {
  const entry = catalog.seeds.find(
    (s) => s.name === name || s.ref === "seed:" + name,
  );
  if (!entry) throw new Error(formatUnknownSeedError(catalog, name));
  return entry;
}

export function resolvePlugin(catalog: SetupCatalog, name: string): CatalogEntry {
  const entry = catalog.plugins.find(
    (p) => p.name === name || p.ref === "plugin:" + name,
  );
  if (!entry) throw new Error(formatUnknownPluginError(catalog, name));
  return entry;
}