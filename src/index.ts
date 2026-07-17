export { loadSetupCatalog, resolveSeed, resolvePlugin } from "./catalog/setup-catalog.js";
export type { SetupCatalog, CatalogEntry, ComponentKind } from "./catalog/types.js";
export { renderRepoTree } from "./introspection/repo-tree.js";
export { irToDescriptor } from "./meta/ir-to-descriptor.js";
export type { MetaDescriptor } from "./meta/types.js";
export {
  installPlugin,
  uninstallPlugin,
  formatPluginList,
  parseInstallTarget,
  validatePluginDirectory,
} from "./plugin/install.js";
export {
  getWebdotHome,
  listInstalled,
  getInstalled,
  WEBDOT_HOME_ENV,
} from "./plugin/install-registry.js";
