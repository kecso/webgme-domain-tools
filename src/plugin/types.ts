export type PluginValueType = "string" | "boolean" | "number" | "integer";

export interface PluginConfigEntry {
  name: string;
  displayName?: string;
  description?: string;
  value: unknown;
  valueType: PluginValueType | string;
  readOnly?: boolean;
  writeAccessRequired?: boolean;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version?: string;
  description?: string;
  configStructure?: PluginConfigEntry[];
  writeAccessRequired?: boolean;
  disableServerSideExecution?: boolean;
  disableBrowserSideExecution?: boolean;
}

export interface SerializedPluginMessage {
  severity?: string;
  message?: string;
  nodeId?: string;
}

export interface SerializedPluginResult {
  success: boolean;
  pluginName?: string;
  pluginId?: string;
  messages?: SerializedPluginMessage[];
  artifacts?: string[];
  error?: string | null;
  commits?: unknown[];
  projectId?: string | null;
  startTime?: string | null;
  finishTime?: string | null;
}

export interface PluginInfo {
  id: string;
  name: string;
  version?: string;
  description?: string;
  metadataPath?: string;
  src: string;
  configStructure: PluginConfigEntry[];
  defaults: Record<string, unknown>;
}

export interface PluginRunOutput {
  success: boolean;
  plugin: string;
  seed: string;
  branch: string;
  activeNode: string;
  activeSelection: string[];
  config: Record<string, unknown>;
  result: SerializedPluginResult;
  warnings: string[];
}
