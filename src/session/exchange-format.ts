import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** v1 snapshot package (legacy seed / single-tree export). */
export type ExchangeFormat = "snapshot" | "repository";

export interface ProjectJsonSummary {
  format: ExchangeFormat;
  formatVersion?: number;
  exportMode?: string;
  branchName?: string;
  commitHash?: string;
  rootHash?: string;
  branches: Record<string, string>;
  tags: Record<string, string>;
  commits: Array<{
    _id: string;
    message?: string;
    time?: number;
    parents?: string[];
    root?: string;
  }>;
}

export function isRepositoryProjectJson(projectJson: Record<string, unknown>): boolean {
  return projectJson.formatVersion === 2 && projectJson.exportMode === "repository";
}

export function detectExchangeFormat(projectJson: Record<string, unknown>): ExchangeFormat {
  return isRepositoryProjectJson(projectJson) ? "repository" : "snapshot";
}

/**
 * Read `project.json` from a `.webgmex` zip without importing into storage.
 */
export function readProjectJsonFromWebgmex(webgmexPath: string): Record<string, unknown> {
  if (!fs.existsSync(webgmexPath)) {
    throw new Error("webgmex not found: " + webgmexPath);
  }
  const AdmZip = require("adm-zip") as new (pathOrBuffer?: string | Buffer) => {
    getEntry: (name: string) => { entryName: string } | null;
    readAsText: (entry: { entryName: string }) => string;
  };
  const zip = new AdmZip(webgmexPath);
  const entry = zip.getEntry("project.json");
  if (!entry) {
    throw new Error("Invalid .webgmex (missing project.json): " + webgmexPath);
  }
  return JSON.parse(zip.readAsText(entry)) as Record<string, unknown>;
}

export function summarizeProjectJson(projectJson: Record<string, unknown>): ProjectJsonSummary {
  const format = detectExchangeFormat(projectJson);
  const branches =
    format === "repository" && projectJson.branches && typeof projectJson.branches === "object"
      ? (projectJson.branches as Record<string, string>)
      : projectJson.branchName && projectJson.commitHash
        ? { [String(projectJson.branchName)]: String(projectJson.commitHash) }
        : {};
  const tags =
    format === "repository" && projectJson.tags && typeof projectJson.tags === "object"
      ? (projectJson.tags as Record<string, string>)
      : {};
  const commits =
    format === "repository" && Array.isArray(projectJson.commits)
      ? (projectJson.commits as ProjectJsonSummary["commits"])
      : [];

  return {
    format,
    formatVersion: typeof projectJson.formatVersion === "number" ? projectJson.formatVersion : undefined,
    exportMode: typeof projectJson.exportMode === "string" ? projectJson.exportMode : undefined,
    branchName: typeof projectJson.branchName === "string" ? projectJson.branchName : undefined,
    commitHash: typeof projectJson.commitHash === "string" ? projectJson.commitHash : undefined,
    rootHash: typeof projectJson.rootHash === "string" ? projectJson.rootHash : undefined,
    branches,
    tags,
    commits,
  };
}

export function summarizeWebgmex(webgmexPath: string): ProjectJsonSummary {
  return summarizeProjectJson(readProjectJsonFromWebgmex(webgmexPath));
}

/** Default branch for a package: master if present, else first branch, else "master". */
export function defaultBranchName(summary: ProjectJsonSummary): string {
  if (summary.branches.master) return "master";
  const names = Object.keys(summary.branches);
  if (names.length > 0) return names[0];
  return summary.branchName ?? "master";
}

export function shouldExportWithHistory(format: ExchangeFormat): boolean {
  return format === "repository";
}
