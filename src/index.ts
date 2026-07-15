export { loadSetupCatalog, resolveSeed, resolvePlugin } from "./catalog/setup-catalog.js";
export type { SetupCatalog, CatalogEntry, ComponentKind } from "./catalog/types.js";
export { renderRepoTree } from "./introspection/repo-tree.js";
export { descriptorToMetaTs } from "./meta/descriptor-to-meta-ts.js";
export { irToDescriptor } from "./meta/ir-to-descriptor.js";
export type { MetaDescriptor } from "./meta/types.js";
export { runGenerateMetaTsCommand } from "./commands/generate.js";