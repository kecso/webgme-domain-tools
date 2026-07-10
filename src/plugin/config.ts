import fs from "node:fs";
import type { PluginConfigEntry, PluginValueType } from "./types.js";

function isValueType(type: string): type is PluginValueType {
  return type === "string" || type === "boolean" || type === "number" || type === "integer";
}

export function coerceConfigValue(raw: string, valueType: PluginValueType | string): unknown {
  const type = isValueType(valueType) ? valueType : "string";
  if (type === "boolean") {
    const lower = raw.toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
    throw new Error('Invalid boolean value "' + raw + '" (use true or false)');
  }
  if (type === "number" || type === "integer") {
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      throw new Error('Invalid numeric value "' + raw + '" for type ' + type);
    }
    if (type === "integer" && !Number.isInteger(num)) {
      throw new Error('Invalid integer value "' + raw + '"');
    }
    return num;
  }
  return raw;
}

export function parseSetPairs(setArgs: string[] | undefined): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const item of setArgs ?? []) {
    const eq = item.indexOf("=");
    if (eq <= 0) {
      throw new Error('Invalid --set "' + item + '" (expected name=value)');
    }
    const name = item.slice(0, eq).trim();
    const value = item.slice(eq + 1);
    if (!name) throw new Error('Invalid --set "' + item + '" (missing name)');
    pairs[name] = value;
  }
  return pairs;
}

export function loadConfigFile(configFile: string | undefined): Record<string, unknown> {
  if (!configFile) return {};
  const abs = configFile;
  if (!fs.existsSync(abs)) {
    throw new Error("Config file does not exist: " + abs);
  }
  const parsed = JSON.parse(fs.readFileSync(abs, "utf8")) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config file must contain a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function resolvePluginConfig(
  configStructure: PluginConfigEntry[],
  options: {
    configFile?: string;
    set?: string[];
  },
): Record<string, unknown> {
  const defaults = Object.fromEntries(configStructure.map((entry) => [entry.name, entry.value]));
  const fromFile = loadConfigFile(options.configFile);
  const fromSet = parseSetPairs(options.set);
  const readOnly = new Set(
    configStructure.filter((entry) => entry.readOnly).map((entry) => entry.name),
  );
  const byName = new Map(configStructure.map((entry) => [entry.name, entry]));
  const resolved: Record<string, unknown> = { ...defaults, ...fromFile };

  for (const [name, raw] of Object.entries(fromSet)) {
    const entry = byName.get(name);
    if (!entry) {
      resolved[name] = raw;
      continue;
    }
    if (readOnly.has(name) && raw !== String(defaults[name])) {
      throw new Error('Configuration parameter "' + name + '" is read-only');
    }
    resolved[name] = coerceConfigValue(raw, entry.valueType);
  }

  for (const name of readOnly) {
    if (Object.hasOwn(fromFile, name) && fromFile[name] !== defaults[name]) {
      throw new Error('Configuration parameter "' + name + '" is read-only');
    }
  }

  for (const entry of configStructure) {
    const value = resolved[entry.name];
    validateConfigValue(entry.name, value, entry.valueType);
  }

  return resolved;
}

function validateConfigValue(name: string, value: unknown, valueType: PluginValueType | string): void {
  const type = isValueType(valueType) ? valueType : "string";
  if (value === undefined) return;
  if (type === "string" && typeof value !== "string") {
    throw new Error('Configuration "' + name + '" must be a string');
  }
  if (type === "boolean" && typeof value !== "boolean") {
    throw new Error('Configuration "' + name + '" must be a boolean');
  }
  if ((type === "number" || type === "integer") && typeof value !== "number") {
    throw new Error('Configuration "' + name + '" must be a number');
  }
  if (type === "integer" && typeof value === "number" && !Number.isInteger(value)) {
    throw new Error('Configuration "' + name + '" must be an integer');
  }
}
