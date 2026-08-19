import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { allAgentFiles, mergeImportedProfile, stripPinsFromText } from "../src/agents";
import { activateProfile, deactivateProfile, runStripPass } from "../src/activate";
import { makeAgentToolCallHandler } from "../src/inject";
import { parseProfile, pickModel, resolveModel, serializeProfile, validateProfile } from "../src/profile";
import {
  buildSections,
  computeWindow,
  defaultSelectionIndex,
  filterSections,
  flattenSelectable,
  reanchorIndex,
} from "../src/picker";
import {
  loadGlobalState,
  loadProjectActive,
  resolveActiveName,
  saveGlobalState,
  saveProjectActive,
} from "../src/state";
import type { Profile, ThinkingLevel } from "../src/types";

const available = [
  { provider: "anthropic", id: "claude-opus-4", name: "Claude Opus" },
  { provider: "openai", id: "gpt-4o", name: "GPT Four" },
  { provider: "local", id: "tiny-unique-model", name: "Tiny Local" },
  { provider: "vendor", id: "other", name: "Friendly Display" },
];

const pickerModels = [
  { provider: "openai", id: "gpt-4o", name: "GPT Four" },
  { provider: "anthropic", id: "claude-sonnet-4", name: "Claude Sonnet" },
  { provider: "anthropic", id: "claude-opus-5", name: "Claude Opus 5" },
  { provider: "vendor", id: "other", name: "Friendly Display" },
];
const pickerPseudo = [{ value: "inherit", label: "inherit", description: "Use caller model" }];
const pickerSections = buildSections(pickerModels, pickerPseudo);
assert.equal(pickerSections[0]?.header, null);
assert.deepEqual(pickerSections[0]?.items.map((item) => item.id), ["inherit"]);
assert.deepEqual(pickerSections.slice(1).map((section) => section.header), ["anthropic", "openai", "vendor"]);
assert.deepEqual(pickerSections[1]?.items.map((item) => item.id), ["claude-opus-5", "claude-sonnet-4"]);
assert.deepEqual(flattenSelectable(pickerSections), [
  "inherit",
  "anthropic/claude-opus-5",
  "anthropic/claude-sonnet-4",
  "openai/gpt-4o",
  "vendor/other",
]);
assert.equal(filterSections(pickerSections, ""), pickerSections);
const fuzzySections = filterSections(pickerSections, "clopus");
assert.deepEqual(fuzzySections.map((section) => section.header), [null, "anthropic"]);
assert.deepEqual(flattenSelectable(fuzzySections), [
  "inherit",
  "anthropic/claude-opus-5",
  "anthropic/claude-sonnet-4",
]);
assert.deepEqual(filterSections(pickerSections, "gpt").map((section) => section.header), [null, "openai"]);
assert.deepEqual(flattenSelectable(filterSections(pickerSections, "gpt")), ["inherit", "openai/gpt-4o"]);
assert.deepEqual(filterSections(pickerSections, "friendly").map((section) => section.header), [null, "vendor"]);
assert.deepEqual(filterSections(pickerSections, "zzznomatch").map((section) => section.header), [null]);
assert.deepEqual(flattenSelectable(filterSections(pickerSections, "zzznomatch")), ["inherit"]);
assert.deepEqual(flattenSelectable(filterSections(pickerSections, "anthropic")), [
  "inherit",
  "anthropic/claude-opus-5",
  "anthropic/claude-sonnet-4",
]);
assert.equal(defaultSelectionIndex(pickerSections, ""), 0);
assert.equal(defaultSelectionIndex(filterSections(pickerSections, "gpt"), "gpt"), 1);
assert.equal(reanchorIndex("openai/gpt-4o", flattenSelectable(pickerSections)), 3);
assert.equal(reanchorIndex("missing", ["a", "b"]), 1);
assert.equal(reanchorIndex("missing", []), 0);
assert.deepEqual(computeWindow(20, 0, 10), { start: 0, end: 10 });
assert.deepEqual(computeWindow(20, 19, 10), { start: 10, end: 20 });
assert.deepEqual(computeWindow(20, 10, 10), { start: 5, end: 15 });
assert.deepEqual(computeWindow(3, 1, 10), { start: 0, end: 3 });
assert.deepEqual(computeWindow(0, 0, 10), { start: 0, end: 0 });

const goodYaml = `name: balanced
description: A test profile
default:
  models:
    - anthropic/claude-opus-4
    - gpt-4o
  thinking: medium
overrides:
  Explore:
    models: [tiny-unique-model]
mainModel: anthropic/claude-opus-4
mainThinking: high
`;
const parsed = parseProfile(goodYaml, "fallback");
assert.equal(parsed.name, "balanced");
assert.deepEqual(parsed.default.models, ["anthropic/claude-opus-4", "gpt-4o"]);
assert.equal(parsed.default.thinking, "medium");
assert.equal(parsed.overrides.Explore.models[0], "tiny-unique-model");
assert.equal(parsed.mainThinking, "high");
assert.throws(() => parseProfile("default: { models: [] }", "bad"), /non-empty string array/);
assert.throws(() => parseProfile("default: { models: [gpt-4o], thinking: nope }", "bad"), /thinking/);
assert.throws(() => parseProfile("default: { models: [gpt-4o] }\nmainThinking: nope", "bad"), /mainThinking/);
assert.throws(() => parseProfile("default: { models: gpt-4o }", "bad"), /non-empty string array/);
assert.throws(() => parseProfile("- list item", "bad"), /mapping/);
const roundTrip = parseProfile(serializeProfile(parsed), "fallback");
assert.deepEqual(roundTrip, parsed);
const withoutMainThinking = parseProfile("name: no-main-thinking\ndefault:\n  models: [inherit]\n", "fallback");
assert.equal(withoutMainThinking.mainThinking, undefined);
assert.deepEqual(parseProfile(serializeProfile(withoutMainThinking), "fallback"), withoutMainThinking);
const isolationYaml = `name: isolation
default:
  models: [inherit]
  isolation: true
overrides:
  Explore:
    models: [inherit]
    isolation: false
`;
const isolationParsed = parseProfile(isolationYaml, "isolation");
assert.equal(isolationParsed.default.isolation, true);
assert.equal(isolationParsed.overrides.Explore.isolation, false);
const isolationRoundTrip = parseProfile(serializeProfile(isolationParsed), "isolation");
assert.equal(isolationRoundTrip.default.isolation, true);
assert.equal(isolationRoundTrip.overrides.Explore.isolation, false);
assert.equal(parseProfile(serializeProfile(withoutMainThinking), "fallback").default.isolation, undefined);
assert.throws(() => parseProfile('default: { models: [inherit], isolation: "yes" }', "bad"), /isolation must be a boolean/);

assert.equal(resolveModel("anthropic/claude-opus-4", available)?.provider, "anthropic");
assert.equal(resolveModel("gpt-4o", available)?.provider, "openai");
assert.equal(resolveModel("tiny-unique", available)?.id, "tiny-unique-model");
assert.equal(resolveModel("friendly display", available)?.id, "other");
assert.equal(resolveModel("inherit", [{ provider: "p", id: "inherit-model", name: "Inherit" }]), undefined);
assert.equal(
  resolveModel("shared", [
    { provider: "one", id: "shared", name: "One" },
    { provider: "two", id: "shared", name: "Two" },
  ]),
  undefined,
);
assert.equal(
  resolveModel("fragment", [
    { provider: "one", id: "fragment-a", name: "One" },
    { provider: "two", id: "fragment-b", name: "Two" },
  ]),
  undefined,
);
const chain = { models: ["does-not-exist", "gpt-4o", "anthropic/claude-opus-4"] };
const pickedDefault = pickModel(chain, available, []);
assert.equal(pickedDefault !== undefined && pickedDefault !== "inherit" ? pickedDefault.id : undefined, "gpt-4o");
const pickedScoped = pickModel(chain, available, [{ provider: "anthropic", id: "claude-opus-4", name: "Claude Opus" }]);
assert.equal(pickedScoped !== undefined && pickedScoped !== "inherit" ? pickedScoped.id : undefined, "claude-opus-4");
assert.equal(pickModel(chain, available, [{ provider: "local", id: "tiny-unique-model", name: "Tiny Local" }]), undefined);
assert.equal(pickModel(["inherit"], available, []), "inherit");
assert.equal(pickModel(["bad", "inherit"], available, []), "inherit");
assert.equal(pickModel(["bad"], available, []), undefined);
const inheritProfile = parseProfile("name: inherit\ndefault:\n  models: [inherit]\n", "inherit");
assert.deepEqual(validateProfile(inheritProfile, available, []), []);

const noFrontmatter = "body\nmodel: not frontmatter\n";
assert.deepEqual(stripPinsFromText(noFrontmatter), { changed: false, stripped: {}, text: noFrontmatter });
const emptyFrontmatter = "---\n---\nbody\n";
assert.equal(stripPinsFromText(emptyFrontmatter).changed, false);
const fixture =
  "---\n" +
  "# comments stay\n" +
  "model: \"anthropic/claude-opus-4\"\n" +
  "thinking: 'high'\n" +
  "model_notes: keep\n" +
  "nested:\n" +
  "  model: nested-model\n" +
  "---\n" +
  "body\n";
const stripped = stripPinsFromText(fixture);
assert.equal(stripped.changed, true);
assert.deepEqual(stripped.stripped, { model: "anthropic/claude-opus-4", thinking: "high" });
assert.match(stripped.text, /# comments stay/);
assert.match(stripped.text, /model_notes: keep/);
assert.match(stripped.text, /  model: nested-model/);
assert.doesNotMatch(stripped.text, /^model:/m);
assert.doesNotMatch(stripped.text, /^thinking:/m);
assert.deepEqual(stripPinsFromText(stripped.text), { changed: false, stripped: {}, text: stripped.text });
const multiline = "---\nmodel:\n  nested value\n---\nbody\n";
const skipped = stripPinsFromText(multiline);
assert.equal(skipped.changed, false);
assert.equal(skipped.skippedReason, "multi-line model/thinking value");
assert.equal(skipped.text, multiline);
const thinkingMultiline = "---\nthinking: \n\tvalue\n---\n";
assert.equal(stripPinsFromText(thinkingMultiline).skippedReason, "multi-line model/thinking value");
for (const guarded of [
  "---\nmodel: >\n  block value\n---\nbody\n",
  "---\nmodel: |\n---\nbody\n",
  "---\nmodel: [a, b]\n---\nbody\n",
  "---\nmodel: plain value\n  continued value\n---\nbody\n",
]) {
  const guardedResult = stripPinsFromText(guarded);
  assert.equal(guardedResult.changed, false);
  assert.equal(guardedResult.skippedReason, "multi-line model/thinking value");
  assert.equal(guardedResult.text, guarded);
}

const importedFirst = mergeImportedProfile(undefined, {
  Explore: { model: "openai/gpt-4o", thinking: "low" },
});
const importedSecond = mergeImportedProfile(importedFirst, {
  Explore: { model: "anthropic/should-not-win", thinking: "high" },
  Plan: { model: "local/tiny-unique-model" },
});
const imported = parseProfile(importedSecond, "imported");
assert.equal(imported.name, "imported");
assert.deepEqual(imported.overrides.Explore.models, ["openai/gpt-4o"]);
assert.equal(imported.overrides.Explore.thinking, "low");
assert.deepEqual(imported.overrides.Plan.models, ["local/tiny-unique-model"]);
assert.deepEqual(imported.default.models, ["inherit"]);

const handlerContext = {
  cwd: "/",
  modelRegistry: { getAvailable: () => available },
  scopedModels: [],
};
const overrideProfile: Profile = {
  name: "handler",
  default: { models: ["openai/gpt-4o"], thinking: "medium" },
  overrides: { Explore: { models: ["local/tiny-unique-model"], thinking: "low" } },
};
const overrideHandler = makeAgentToolCallHandler({
  getActiveProfile: () => overrideProfile,
  canIsolate: () => true,
  log: () => undefined,
});
const overrideInput: Record<string, unknown> = { subagent_type: "eXpLoRe", model: "caller/model", thinking: "off" };
await overrideHandler({ toolName: "Agent", input: overrideInput }, handlerContext);
assert.equal(overrideInput.model, "local/tiny-unique-model");
assert.equal(overrideInput.thinking, "low");
const defaultInput: Record<string, unknown> = { subagent_type: "other" };
await overrideHandler({ toolName: "Agent", input: defaultInput }, handlerContext);
assert.equal(defaultInput.model, "openai/gpt-4o");
assert.equal(defaultInput.thinking, "medium");

const unresolvedLogs: string[] = [];
const unresolvedProfile: Profile = {
  name: "unresolved",
  default: { models: ["bad-model"], thinking: "high" },
  overrides: {},
};
const unresolvedHandler = makeAgentToolCallHandler({
  getActiveProfile: () => unresolvedProfile,
  canIsolate: () => true,
  log: (message) => unresolvedLogs.push(message),
});
const unresolvedInput: Record<string, unknown> = { model: "caller/model", thinking: "off" };
await unresolvedHandler({ toolName: "Agent", input: unresolvedInput }, handlerContext);
await unresolvedHandler({ toolName: "Agent", input: unresolvedInput }, handlerContext);
assert.equal(unresolvedInput.model, "caller/model");
assert.equal(unresolvedInput.thinking, "high");
assert.equal(unresolvedLogs.length, 1);
const inheritLogs: string[] = [];
const inheritHandler = makeAgentToolCallHandler({
  getActiveProfile: () => ({ name: "inherit", default: { models: ["inherit"] }, overrides: {} }),
  canIsolate: () => true,
  log: (message) => inheritLogs.push(message),
});
const inheritInput: Record<string, unknown> = { model: "caller/model" };
await inheritHandler({ toolName: "Agent", input: inheritInput }, handlerContext);
assert.equal(inheritInput.model, "caller/model");
assert.equal(inheritLogs.length, 0);

const isolationLogs: string[] = [];
const isolationHandler = makeAgentToolCallHandler({
  getActiveProfile: () => ({ name: "isolation", default: { models: ["inherit"], isolation: true }, overrides: {} }),
  canIsolate: () => true,
  log: (message) => isolationLogs.push(message),
});
const isolationInput: Record<string, unknown> = { subagent_type: "other" };
await isolationHandler({ toolName: "Agent", input: isolationInput }, handlerContext);
assert.equal(isolationInput.isolation, "worktree");
const untouchedIsolationInput: Record<string, unknown> = { subagent_type: "other", isolation: "worktree" };
const noIsolationHandler = makeAgentToolCallHandler({
  getActiveProfile: () => ({ name: "no-isolation", default: { models: ["inherit"] }, overrides: {} }),
  canIsolate: () => true,
  log: () => undefined,
});
await noIsolationHandler({ toolName: "Agent", input: untouchedIsolationInput }, handlerContext);
assert.equal(untouchedIsolationInput.isolation, "worktree");
const falseIsolationInput: Record<string, unknown> = { subagent_type: "other" };
const falseIsolationHandler = makeAgentToolCallHandler({
  getActiveProfile: () => ({ name: "false-isolation", default: { models: ["inherit"], isolation: false }, overrides: {} }),
  canIsolate: () => true,
  log: () => undefined,
});
await falseIsolationHandler({ toolName: "Agent", input: falseIsolationInput }, handlerContext);
assert.equal(falseIsolationInput.isolation, undefined);
const noGitLogs: string[] = [];
const noGitHandler = makeAgentToolCallHandler({
  getActiveProfile: () => ({ name: "no-git", default: { models: ["inherit"], isolation: true }, overrides: {} }),
  canIsolate: () => false,
  log: (message) => noGitLogs.push(message),
});
const noGitInput: Record<string, unknown> = { subagent_type: "other" };
await noGitHandler({ toolName: "Agent", input: noGitInput }, handlerContext);
assert.equal(noGitInput.isolation, undefined);
await noGitHandler({ toolName: "Agent", input: noGitInput }, handlerContext);
assert.equal(noGitInput.isolation, undefined);
assert.equal(noGitLogs.filter((message) => message.includes("isolation")).length, 1);

const root = mkdtempSync(join(tmpdir(), "pi-subagent-profiles-smoke-"));
const cwd = join(root, "project");
const agentDir = join(root, "agent");
mkdirSync(join(cwd, ".pi", "agents"), { recursive: true });
mkdirSync(join(cwd, ".agents", "agents"), { recursive: true });
mkdirSync(join(agentDir, "agents"), { recursive: true });
const projectAgentPath = join(cwd, ".pi", "agents", "project-agent.md");
const workspaceAgentPath = join(cwd, ".agents", "agents", "workspace-agent.md");
const globalAgentPath = join(agentDir, "agents", "global-agent.md");
const pinnedAgent = "---\nmodel: openai/gpt-4o\nthinking: low\n---\nbody\n";
writeFileSync(projectAgentPath, pinnedAgent, "utf8");
writeFileSync(workspaceAgentPath, pinnedAgent, "utf8");
writeFileSync(globalAgentPath, pinnedAgent, "utf8");
assert.equal(allAgentFiles(cwd, agentDir).length, 3);
const untrustedSummary = runStripPass(cwd, agentDir, false);
assert.equal(untrustedSummary.changedFiles, 1);
assert.equal(untrustedSummary.skippedFiles, 2);
assert.equal(readFileSync(projectAgentPath, "utf8"), pinnedAgent);
assert.equal(readFileSync(workspaceAgentPath, "utf8"), pinnedAgent);
assert.doesNotMatch(readFileSync(globalAgentPath, "utf8"), /^model:/m);
assert.equal(untrustedSummary.importedSaved, true);
writeFileSync(globalAgentPath, pinnedAgent, "utf8");
const discardedSummary = runStripPass(cwd, agentDir, false);
assert.equal(discardedSummary.discardedExisting, 2);
assert.equal(discardedSummary.importedSaved, false);

process.env.PI_CODING_AGENT_DIR = agentDir;
mkdirSync(join(agentDir, "subagent-profiles", "profiles"), { recursive: true });
writeFileSync(
  join(agentDir, "subagent-profiles", "profiles", "one.yaml"),
  serializeProfile({ name: "one", default: { models: ["inherit"] }, overrides: {}, mainModel: "anthropic/claude-opus-4" }),
  "utf8",
);
writeFileSync(
  join(agentDir, "subagent-profiles", "profiles", "two.yaml"),
  serializeProfile({ name: "two", default: { models: ["inherit"] }, overrides: {}, mainModel: "openai/gpt-4o" }),
  "utf8",
);
const globalState = {
  active: "global-profile",
  mainModelBackup: { provider: "openai", id: "gpt-4o" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "global" as const },
};
const thinkingState = {
  active: "thinking-profile",
  mainThinkingBackup: "low" as const,
  mainThinkingApplied: { level: "high" as const, scope: "project" as const },
};
saveGlobalState(agentDir, thinkingState);
assert.deepEqual(loadGlobalState(agentDir), thinkingState);
saveGlobalState(agentDir, {
  active: null,
  mainThinkingBackup: null,
  mainThinkingApplied: null,
});
assert.deepEqual(loadGlobalState(agentDir), {
  active: null,
  mainThinkingBackup: null,
  mainThinkingApplied: null,
});
saveGlobalState(agentDir, globalState);
assert.deepEqual(loadGlobalState(agentDir), globalState);
assert.equal(existsSync(join(agentDir, "subagent-profiles", `state.json.tmp-${process.pid}`)), false);
saveGlobalState(agentDir, { active: null, mainModelBackup: null, mainModelApplied: null });
assert.deepEqual(loadGlobalState(agentDir), { active: null, mainModelBackup: null, mainModelApplied: null });
saveGlobalState(agentDir, globalState);
assert.equal(loadProjectActive(cwd), undefined);
assert.equal(resolveActiveName(cwd, agentDir), "global-profile");
saveProjectActive(cwd, "project-profile");
assert.equal(loadProjectActive(cwd), "project-profile");
assert.equal(resolveActiveName(cwd, agentDir), "project-profile");
saveProjectActive(cwd, null);
assert.equal(loadProjectActive(cwd), undefined);
writeFileSync(join(cwd, ".pi", "subagent-profiles.json"), '{"active":null}\n', "utf8");
assert.equal(loadProjectActive(cwd), null);
assert.equal(resolveActiveName(cwd, agentDir), null);
saveProjectActive(cwd, "project-profile");
saveProjectActive(cwd, null);
assert.equal(loadProjectActive(cwd), undefined);
assert.equal(resolveActiveName(cwd, agentDir), "global-profile");
writeFileSync(
  join(agentDir, "subagent-profiles", "state.json"),
  JSON.stringify({ active: "kept", mainModelBackup: { provider: 4, id: "bad" }, mainModelApplied: globalState.mainModelApplied }),
  "utf8",
);
const corruptBackupState = loadGlobalState(agentDir);
assert.equal(corruptBackupState.active, "kept");
assert.equal("mainModelBackup" in corruptBackupState, false);
assert.deepEqual(corruptBackupState.mainModelApplied, globalState.mainModelApplied);
writeFileSync(
  join(agentDir, "subagent-profiles", "state.json"),
  JSON.stringify({ active: "kept-again", mainModelBackup: globalState.mainModelBackup, mainModelApplied: { provider: 4, id: "bad", scope: "global" } }),
  "utf8",
);
const corruptAppliedState = loadGlobalState(agentDir);
assert.equal(corruptAppliedState.active, "kept-again");
assert.deepEqual(corruptAppliedState.mainModelBackup, globalState.mainModelBackup);
assert.equal("mainModelApplied" in corruptAppliedState, false);
writeFileSync(
  join(agentDir, "subagent-profiles", "state.json"),
  JSON.stringify({ active: "kept-thinking", mainThinkingBackup: "low", mainThinkingApplied: { level: "bogus", scope: "global" } }),
  "utf8",
);
const corruptThinkingAppliedState = loadGlobalState(agentDir);
assert.equal(corruptThinkingAppliedState.active, "kept-thinking");
assert.equal(corruptThinkingAppliedState.mainThinkingBackup, "low");
assert.equal("mainThinkingApplied" in corruptThinkingAppliedState, false);

const fakeRegistry = {
  getAvailable: () => available,
  find: (provider: string, id: string) => available.find((model) => model.provider === provider && model.id === id),
};
const makeContext = (model: (typeof available)[number]): ExtensionContext =>
  ({
    cwd,
    model,
    hasUI: false,
    ui: {},
    modelRegistry: fakeRegistry,
    scopedModels: [],
    isProjectTrusted: () => true,
  }) as unknown as ExtensionContext;
const restoreCalls: string[] = [];
let thinkingLevel: ThinkingLevel = "off";
const fakePi = {
  getThinkingLevel: () => thinkingLevel,
  setThinkingLevel: (level: ThinkingLevel) => {
    thinkingLevel = level;
  },
  setModel: async (model: { provider: string; id: string }) => {
    restoreCalls.push(`${model.provider}/${model.id}`);
    return true;
  },
} as unknown as ExtensionAPI;
saveGlobalState(agentDir, { active: null, mainModelBackup: null, mainModelApplied: null });
await activateProfile(fakePi, makeContext(available[2]), "one", "project");
assert.deepEqual(loadGlobalState(agentDir), {
  active: null,
  mainModelBackup: { provider: "local", id: "tiny-unique-model" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "project" },
});
await activateProfile(fakePi, makeContext(available[2]), "two", "project");
assert.deepEqual(loadGlobalState(agentDir), {
  active: null,
  mainModelBackup: { provider: "local", id: "tiny-unique-model" },
  mainModelApplied: { provider: "openai", id: "gpt-4o", scope: "project" },
});
assert.equal(loadProjectActive(cwd), "two");
restoreCalls.length = 0;
await deactivateProfile(fakePi, makeContext(available[1]), "project");
assert.deepEqual(restoreCalls, ["local/tiny-unique-model"]);
assert.deepEqual(loadGlobalState(agentDir), { active: null, mainModelBackup: null, mainModelApplied: null });
const failedPi = {
  getThinkingLevel: () => thinkingLevel,
  setThinkingLevel: (level: ThinkingLevel) => {
    thinkingLevel = level;
  },
  setModel: async () => false,
} as unknown as ExtensionAPI;
await activateProfile(failedPi, makeContext(available[2]), "one", "global");
assert.deepEqual(loadGlobalState(agentDir), { active: "one", mainModelBackup: null, mainModelApplied: null });
saveGlobalState(agentDir, { active: null, mainModelBackup: null, mainModelApplied: null });
saveGlobalState(agentDir, {
  active: "active",
  mainModelBackup: { provider: "openai", id: "gpt-4o" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "global" },
});
restoreCalls.length = 0;
await deactivateProfile(fakePi, makeContext(available[3]), "global");
assert.deepEqual(restoreCalls, []);
assert.deepEqual(loadGlobalState(agentDir), { active: null, mainModelBackup: null, mainModelApplied: null });
saveGlobalState(agentDir, {
  active: "active",
  mainModelBackup: { provider: "openai", id: "gpt-4o" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "global" },
});
await deactivateProfile(fakePi, makeContext(available[0]), "global");
assert.deepEqual(restoreCalls, ["openai/gpt-4o"]);
assert.deepEqual(loadGlobalState(agentDir), { active: null, mainModelBackup: null, mainModelApplied: null });
saveGlobalState(agentDir, {
  active: "active",
  mainModelBackup: { provider: "openai", id: "gpt-4o" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "project" },
});
await deactivateProfile(fakePi, makeContext(available[0]), "global");
assert.deepEqual(loadGlobalState(agentDir), {
  active: null,
  mainModelBackup: { provider: "openai", id: "gpt-4o" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "project" },
});
saveProjectActive(cwd, "active");
saveGlobalState(agentDir, {
  active: "global-active",
  mainModelBackup: { provider: "openai", id: "gpt-4o" },
  mainModelApplied: { provider: "anthropic", id: "claude-opus-4", scope: "project" },
});
await deactivateProfile(fakePi, makeContext(available[0]), "project");
assert.equal(loadProjectActive(cwd), undefined);
assert.deepEqual(loadGlobalState(agentDir), {
  active: "global-active",
  mainModelBackup: null,
  mainModelApplied: null,
});
const originalBackup = { provider: "local", id: "tiny-unique-model" };
saveGlobalState(agentDir, { active: "one", mainModelBackup: originalBackup, mainModelApplied: { ...globalState.mainModelApplied } });
saveGlobalState(agentDir, { active: "two", mainModelBackup: originalBackup, mainModelApplied: { provider: "openai", id: "gpt-4o", scope: "global" } });
assert.deepEqual(loadGlobalState(agentDir).mainModelBackup, originalBackup);

rmSync(root, { recursive: true, force: true });
console.log("ALL PASS");
