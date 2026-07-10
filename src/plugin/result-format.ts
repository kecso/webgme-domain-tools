import type { SerializedPluginMessage, SerializedPluginResult } from "./types.js";

export function serializePluginResult(result: {
  serialize?: () => SerializedPluginResult;
  success?: boolean;
  messages?: Array<{ serialize?: () => SerializedPluginMessage } | SerializedPluginMessage>;
  artifacts?: string[];
  error?: string | null;
}): SerializedPluginResult {
  if (typeof result.serialize === "function") {
    return result.serialize();
  }
  return {
    success: result.success === true,
    messages: (result.messages ?? []).map((message) => {
      if (typeof (message as { serialize?: () => SerializedPluginMessage }).serialize === "function") {
        return (message as { serialize: () => SerializedPluginMessage }).serialize();
      }
      return message as SerializedPluginMessage;
    }),
    artifacts: result.artifacts ?? [],
    error: result.error ?? null,
  };
}

export function formatPluginMessages(result: SerializedPluginResult): string[] {
  return (result.messages ?? []).map((message) => {
    const severity = message.severity ?? "info";
    const text = message.message ?? "";
    return "[" + severity + "] " + text;
  });
}

export function artifactWarnings(
  result: SerializedPluginResult,
  artifactsOut: string | undefined,
): string[] {
  const hashes = result.artifacts ?? [];
  if (hashes.length === 0) return [];
  if (artifactsOut) return [];
  return [
    hashes.length +
      " blob artifact(s) were produced but not persisted. " +
      "Use --artifacts-out <dir> to save them under the project cwd.",
  ];
}
