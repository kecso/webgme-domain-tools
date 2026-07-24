import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSessionLogger,
  loadGmeConfigForProject,
  loadGmeRuntime,
} from "../session/gme-runtime.js";
import {
  closeProjectSession,
  openProjectSession,
  resumeProjectSession,
  suspendProjectSession,
  type LoadedSeedContext,
} from "../session/project-session.js";
import { shouldExportWithHistory } from "../session/exchange-format.js";
import { applyHostDescriptor, clearHostDomainMeta, splitDescriptorLibraries } from "./apply-descriptor.js";
import {
  parseMetalangFile,
  type MetalangParseResult,
} from "./metalang-to-descriptor.js";
import type { MetaDescriptor } from "./types.js";

const PACKAGE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_TEMPLATE = path.join(
  PACKAGE_ROOT,
  "test/fixtures/sample-project/src/seeds/StateModel/StateModel.webgmex",
);

export interface ImportMetaLangOptions {
  /** Path to the host `.metalang` file. */
  file: string;
  /** Output `.webgmex` path (create-only). */
  out: string;
  /** Template project that already has FCO + META (default: StateModel fixture). */
  templateWebgmex?: string;
  cwd?: string;
  branchName?: string;
}

export interface ImportMetaLangResult {
  out: string;
  domain: string;
  libraries: string[];
  commitHash: string;
}

function resolveTemplate(cwd: string, explicit?: string): string {
  if (explicit) return path.resolve(cwd, explicit);
  const candidates = [
    path.resolve(cwd, "test/fixtures/sample-project/src/seeds/StateModel/StateModel.webgmex"),
    DEFAULT_TEMPLATE,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    "No template .webgmex with FCO/META found. Pass templateWebgmex explicitly.",
  );
}

async function persistContext(
  ctx: LoadedSeedContext,
  gmeConfig: Record<string, unknown>,
  outFile: string,
  message: string,
): Promise<string> {
  const { bridge } = loadGmeRuntime();
  const logger = createSessionLogger(gmeConfig);
  if (!bridge.persistProjectCommit) {
    throw new Error("persistProjectCommit is not available on the GME bridge");
  }
  const committed = await bridge.persistProjectCommit({
    project: ctx.project,
    core: ctx.core,
    rootNode: ctx.rootNode,
    branchName: ctx.branchName,
    parentCommitHash: ctx.importResult.commitHash,
    message,
  });
  await bridge.exportProjectToFile({
    project: ctx.project,
    branchName: ctx.branchName,
    gmeConfig,
    logger,
    outFile,
    withHistory: shouldExportWithHistory(ctx.exchangeFormat),
  });
  return typeof committed.commitHash === "string"
    ? committed.commitHash
    : String(committed.commitHash);
}

async function buildLibraryPackage(options: {
  cwd: string;
  template: string;
  libraryName: string;
  descriptor: MetaDescriptor;
  outFile: string;
}): Promise<void> {
  const gmeConfig = loadGmeConfigForProject(options.cwd);
  const suspended = suspendProjectSession();
  try {
    const ctx = await openProjectSession({
      cwd: options.cwd,
      webgmexPath: options.template,
      seedName: options.libraryName,
    });
    try {
      applyHostDescriptor(ctx, options.descriptor);
      await persistContext(
        ctx,
        gmeConfig,
        options.outFile,
        "builds library package [" + options.libraryName + "]",
      );
    } finally {
      await closeProjectSession();
    }
  } finally {
    await resumeProjectSession(suspended);
  }
}

/**
 * Apply a parsed MetaLang document onto an open host project: rebuild host meta,
 * build library packages to temp files, attach via addLibrary (GUI-like).
 */
export async function materializeMetalangOnContext(
  ctx: LoadedSeedContext,
  parsed: MetalangParseResult,
  options: { cwd: string; templateWebgmex: string; gmeConfig: Record<string, unknown> },
): Promise<string[]> {
  const { host, libraries } = splitDescriptorLibraries(parsed.descriptor);

  // Build library packages before mutating the host session — openProjectSession
  // closes any prior session/database.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-ml-libs-"));
  const libraryFiles: Array<{ name: string; file: string }> = [];
  try {
    for (const [libName, libDesc] of Object.entries(libraries)) {
      const libFile = path.join(workDir, libName + ".webgmex");
      await buildLibraryPackage({
        cwd: options.cwd,
        template: options.templateWebgmex,
        libraryName: libName,
        descriptor: libDesc,
        outFile: libFile,
      });
      libraryFiles.push({ name: libName, file: libFile });
    }

    // Host session must already be open (caller owns it). Clear, attach, then apply host.
    clearHostDomainMeta(ctx);

    const { bridge } = loadGmeRuntime();
    const logger = createSessionLogger(options.gmeConfig);
    for (const lib of libraryFiles) {
      if (!bridge.attachLibraryFromWebgmex) {
        throw new Error("attachLibraryFromWebgmex is not available on the GME bridge");
      }
      await bridge.attachLibraryFromWebgmex({
        project: ctx.project,
        core: ctx.core,
        rootNode: ctx.rootNode,
        libraryName: lib.name,
        libraryWebgmex: lib.file,
        gmeConfig: options.gmeConfig,
        logger,
      });
    }

    applyHostDescriptor(ctx, host, { clearHost: false });
    return libraryFiles.map((l) => l.name).sort((a, b) => a.localeCompare(b));
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * Create a new `.webgmex` from MetaLang (host concepts + library blocks/imports).
 */
export async function importMetaLangToWebgmex(
  options: ImportMetaLangOptions,
): Promise<ImportMetaLangResult> {
  const cwd = options.cwd ?? process.cwd();
  const metalangPath = path.resolve(cwd, options.file);
  const outPath = path.resolve(cwd, options.out);
  if (!outPath.toLowerCase().endsWith(".webgmex")) {
    throw new Error("Output must be a .webgmex file: " + outPath);
  }

  const parsed = parseMetalangFile(metalangPath);
  const template = resolveTemplate(cwd, options.templateWebgmex);
  const gmeConfig = loadGmeConfigForProject(cwd);

  // Build libraries first (nested openProjectSession), then open host.
  const { host, libraries } = splitDescriptorLibraries(parsed.descriptor);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-import-ml-"));
  try {
    const libraryFiles: Array<{ name: string; file: string }> = [];
    for (const [libName, libDesc] of Object.entries(libraries)) {
      const libFile = path.join(workDir, libName + ".webgmex");
      await buildLibraryPackage({
        cwd,
        template,
        libraryName: libName,
        descriptor: libDesc,
        outFile: libFile,
      });
      libraryFiles.push({ name: libName, file: libFile });
    }

    const hostWork = path.join(workDir, "Host.webgmex");
    fs.copyFileSync(template, hostWork);

    const ctx = await openProjectSession({
      cwd,
      webgmexPath: hostWork,
      seedName: parsed.domain.replace(/\W+/g, "_") || "Imported",
      branchName: options.branchName,
    });
    try {
      clearHostDomainMeta(ctx);
      const { bridge } = loadGmeRuntime();
      const logger = createSessionLogger(gmeConfig);
      for (const lib of libraryFiles) {
        if (!bridge.attachLibraryFromWebgmex) {
          throw new Error("attachLibraryFromWebgmex is not available on the GME bridge");
        }
        await bridge.attachLibraryFromWebgmex({
          project: ctx.project,
          core: ctx.core,
          rootNode: ctx.rootNode,
          libraryName: lib.name,
          libraryWebgmex: lib.file,
          gmeConfig,
          logger,
        });
      }
      applyHostDescriptor(ctx, host, { clearHost: false });

      const commitHash = await persistContext(
        ctx,
        gmeConfig,
        outPath,
        "imports metalang [" + parsed.domain + "]",
      );
      return {
        out: outPath,
        domain: parsed.domain,
        libraries: libraryFiles.map((l) => l.name).sort((a, b) => a.localeCompare(b)),
        commitHash,
      };
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

/** @internal testing helper — resolve default template path */
export function defaultMetaTemplatePath(): string {
  return DEFAULT_TEMPLATE;
}
