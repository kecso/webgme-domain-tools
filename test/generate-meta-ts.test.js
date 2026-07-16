import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { loadSetupCatalog, resolveSeed } from "../dist/catalog/setup-catalog.js";

const require = createRequire(import.meta.url);
const { descriptorToMetaTs } = require("../plugins/GenerateMetaTs/lib/descriptor-to-meta-ts.js");
const { buildDescriptorFromCore } = require("../plugins/GenerateMetaTs/lib/build-descriptor.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const cli = path.join(__dirname, "..", "dist", "cli.js");
const repoRoot = path.join(__dirname, "..");
const pluginDirRel = path.join("plugins", "GenerateMetaTs");

async function withStateMachineSession(fn) {
  const catalog = loadSetupCatalog(fixture);
  const entry = resolveSeed(catalog, "StateMachine");
  const context = await openProjectSession({ cwd: fixture, seed: entry });
  try {
    await fn(context);
  } finally {
    await closeProjectSession();
  }
}

test("descriptorToMetaTs emits scoped attributes/pointers/sets/children", () => {
  const source = descriptorToMetaTs(
    {
      version: 1,
      concepts: {
        State: {
          attributes: {
            isInitial: "bool",
            isFinal: "bool",
          },
          pointers: {
            entry: "Action",
            // same name could exist in attributes in other domains
            name: "Action",
          },
        },
        Action: {
          attributes: { body: "string" },
        },
        Machine: {
          attributes: { description: "string" },
          contains: {
            State: "*",
            Action: "*",
            Event: "*",
            Transition: "*",
          },
        },
        Event: {},
        Transition: {
          pointers: {
            src: "State",
            dst: "State",
            event: "Event",
          },
        },
      },
    },
    { seedName: "Demo" },
  );

  assert.match(source, /export interface Machine \{/);
  assert.match(source, /attributes\?: \{/);
  assert.match(source, /description\?: string;/);
  assert.match(source, /children\?: Array<Action \| Event \| State \| Transition>;/);
  assert.doesNotMatch(source, /states\?:/);
  assert.doesNotMatch(source, /actions\?:/);

  assert.match(source, /export interface State \{/);
  assert.match(source, /isInitial\?: boolean;/);
  assert.match(source, /pointers\?: \{/);
  assert.match(source, /entry\?: Action \| string;/);
  // attribute name and pointer name coexist in different scopes
  assert.match(source, /attributes\?: \{[\s\S]*name\?: string;/);
  assert.match(source, /pointers\?: \{[\s\S]*name\?: Action \| string;/);

  assert.match(source, /export interface Transition \{/);
  assert.match(source, /src\?: State \| string;/);
  assert.doesNotMatch(source, /export const Meta/);
});

test("descriptorToMetaTs wraps in namespace when requested", () => {
  const source = descriptorToMetaTs(
    { version: 1, concepts: { A: {} } },
    { seedName: "X", namespace: "StaMS" },
  );
  assert.match(source, /export namespace StaMS \{/);
  assert.match(source, /export interface A \{/);
});

test("descriptorToMetaTs rejects invalid concept identifiers", () => {
  assert.throws(
    () =>
      descriptorToMetaTs(
        { version: 1, concepts: { "bad-name": {} } },
        { seedName: "X" },
      ),
    /valid TypeScript identifier/,
  );
});

test("descriptorToMetaTs rejects invalid namespace", () => {
  assert.throws(
    () =>
      descriptorToMetaTs({ version: 1, concepts: { A: {} } }, { seedName: "X", namespace: "1bad" }),
    /valid TypeScript identifier/,
  );
});

test("descriptorToMetaTs handles multi-target pointers and sets", () => {
  const source = descriptorToMetaTs(
    {
      version: 1,
      concepts: {
        Flow: {
          pointers: { dst: ["In", "Out"] },
          sets: {
            members: { A: "+", B: "0..1" },
          },
        },
        In: {},
        Out: {},
        A: {},
        B: {},
      },
    },
    { seedName: "Multi" },
  );
  assert.match(source, /pointers\?: \{/);
  assert.match(source, /dst\?: In \| Out \| string;/);
  assert.match(source, /sets\?: \{/);
  assert.match(source, /members\?: Array<A \| B \| string>;/);
});

test("StateMachine fixture: Machine.children lacks Transition (meta has no such rule)", async () => {
  await withStateMachineSession(async (context) => {
    const descriptor = buildDescriptorFromCore(context.core, context.rootNode);
    assert.equal(
      descriptor.concepts.Machine.contains.Transition,
      undefined,
      "fixture META does not list Transition under Machine",
    );
    assert.ok(descriptor.concepts.Machine.contains.State);

    const source = descriptorToMetaTs(descriptor, { seedName: "StateMachine" });
    assert.match(source, /export interface Machine \{/);
    assert.match(source, /children\?: Array</);
    assert.match(source, /State/);
    assert.doesNotMatch(source, /children\?: Array<[^;]*Transition/);
    assert.match(source, /export interface Transition \{/);
    assert.match(source, /pointers\?: \{/);
    assert.match(source, /src\?: State \| string;/);
  });
});

test("cli plugin run GenerateMetaTs writes meta.ts via --artifacts-out", () => {
  const outDir = path.join(repoRoot, "_meta_ts_out");
  fs.rmSync(outDir, { recursive: true, force: true });
  try {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "plugin",
        "run",
        "--plugin-dir",
        pluginDirRel,
        "--seed",
        "StateMachine",
        "-C",
        fixture,
        "--set",
        "seedName=StateMachine",
        "--artifacts-out",
        "_meta_ts_out",
      ],
      { encoding: "utf8", cwd: repoRoot },
    );
    assert.equal(result.status, 0, result.stderr + "\n" + result.stdout);
    const source = fs.readFileSync(path.join(outDir, "meta.ts"), "utf8");
    assert.match(source, /export interface Machine \{/);
    assert.match(source, /children\?: Array</);
    assert.match(source, /attributes\?: \{/);
    assert.doesNotMatch(source, /states\?:/);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test("cli plugin run GenerateMetaTs honors --set namespace and fileName", () => {
  const outDir = path.join(repoRoot, "_meta_ts_ns_out");
  fs.rmSync(outDir, { recursive: true, force: true });
  try {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "plugin",
        "run",
        "--plugin-dir",
        pluginDirRel,
        "--seed",
        "StateMachine",
        "-C",
        fixture,
        "--set",
        "namespace=StaMS",
        "--set",
        "fileName=types.ts",
        "--set",
        "seedName=StateMachine",
        "--artifacts-out",
        "_meta_ts_ns_out",
      ],
      { encoding: "utf8", cwd: repoRoot },
    );
    assert.equal(result.status, 0, result.stderr + "\n" + result.stdout);
    const source = fs.readFileSync(path.join(outDir, "types.ts"), "utf8");
    assert.match(source, /export namespace StaMS \{/);
    assert.match(source, /export interface Machine \{/);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
