export type ComponentKind = "seeds" | "plugins" | "visualizers" | "routers";

export const COMPONENT_KINDS: ComponentKind[] = [
  "seeds",
  "plugins",
  "visualizers",
  "routers",
];

export const REF_PREFIX: Record<ComponentKind, string> = {
  seeds: "seed",
  plugins: "plugin",
  visualizers: "viz",
  routers: "router",
};

export interface CatalogEntry {
  ref: string;
  kind: ComponentKind;
  name: string;
  src: string;
  absPath: string;
  exists: boolean;
  artifacts: string[];
  metadataPath?: string;
  notes: string[];
}

export interface SetupCatalog {
  cwd: string;
  setupPath: string;
  seeds: CatalogEntry[];
  plugins: CatalogEntry[];
  visualizers: CatalogEntry[];
  routers: CatalogEntry[];
}

export function entriesForKind(catalog: SetupCatalog, kind: ComponentKind): CatalogEntry[] {
  return catalog[kind];
}

export function allEntries(catalog: SetupCatalog): CatalogEntry[] {
  return [...catalog.seeds, ...catalog.plugins, ...catalog.visualizers, ...catalog.routers];
}
