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

function resolveSeedArtifacts(
  seedDir: string,
  seedName: string,
  exists: boolean,
): { artifacts: string[]; notes: string[] } {
  const notes: string[] = [];
  if (!exists) return { artifacts: [], notes };

  const all = findWebgmexFiles(seedDir);
  const expectedBasename = seedName + ".webgmex";
  const primary = all.find((f) => path.basename(f) === expectedBasename);
  const ignored = all.filter((f) => path.basename(f) !== expectedBasename);

  if (all.length === 0) {
    notes.push("missing .webgmex — expected " + seedName + ".webgmex");
    return { artifacts: [], notes };
  }

  if (!primary) {
    notes.push("missing .webgmex — expected " + seedName + ".webgmex");
  }

  for (const file of ignored) {
    notes.push(
      "ignored .webgmex: " +
        path.basename(file) +
        " (tool uses " +
        expectedBasename +
        " only)",
    );
  }

  return { artifacts: primary ? [primary] : [], notes };
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
    const resolved = resolveSeedArtifacts(absPath, name, exists);
    artifacts = resolved.artifacts;
    notes.push(...resolved.notes);
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
  const bare = name.startsWith("seed:") ? name.slice("seed:".length) : name;
  const entry = catalog.seeds.find((s) => s.name === bare || s.ref === "seed:" + bare);
  if (!entry) throw new Error(formatUnknownSeedError(catalog, bare));
  return entry;
}

export function resolvePlugin(catalog: SetupCatalog, name: string): CatalogEntry {
  const bare = name.startsWith("plugin:") ? name.slice("plugin:".length) : name;
  const entry = catalog.plugins.find((p) => p.name === bare || p.ref === "plugin:" + bare);
  if (!entry) throw new Error(formatUnknownPluginError(catalog, bare));
  return entry;
}