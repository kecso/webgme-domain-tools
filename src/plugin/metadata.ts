import fs from "node:fs";
import type { CatalogEntry } from "../catalog/types.js";
import type { PluginConfigEntry, PluginInfo, PluginMetadata } from "./types.js";

export function loadPluginMetadata(entry: CatalogEntry): PluginMetadata {
  if (!entry.metadataPath) {
    throw new Error(
      'Plugin "' + entry.name + '" has no metadata.json. Run: webdot tree repo --kind plugins',
    );
  }
  if (!entry.exists) {
    throw new Error('Plugin "' + entry.name + '" src path is missing: ' + entry.src);
  }
  return JSON.parse(fs.readFileSync(entry.metadataPath, "utf8")) as PluginMetadata;
}

export function configDefaults(configStructure: PluginConfigEntry[] | undefined): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const entry of configStructure ?? []) {
    defaults[entry.name] = entry.value;
  }
  return defaults;
}

export function buildPluginInfo(entry: CatalogEntry): PluginInfo {
  const metadata = loadPluginMetadata(entry);
  const configStructure = metadata.configStructure ?? [];
  return {
    id: metadata.id ?? entry.name,
    name: metadata.name ?? entry.name,
    version: metadata.version,
    description: metadata.description,
    metadataPath: entry.metadataPath,
    src: entry.src,
    configStructure,
    defaults: configDefaults(configStructure),
  };
}

export function renderPluginInfo(info: PluginInfo): string {
  return JSON.stringify(info, null, 2);
}
