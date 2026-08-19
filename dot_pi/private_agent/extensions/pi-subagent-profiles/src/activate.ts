import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  allAgentFiles,
  importedProfileAgentNames,
  mergeImportedProfile,
  readAgentFile,
  stripPinsFromText,
  type AgentFile,
} from "./agents";
import { atomicWriteFileSync } from "./fsutil";
import { parseProfile, resolveModel, validateProfile } from "./profile";
import { loadGlobalState, resolveActiveName, saveGlobalState, saveProjectActive } from "./state";
import type { ModelInfo, Profile, ThinkingLevel } from "./types";

const PROFILE_DIRECTORY_NAME = "subagent-profiles";
const PROFILES_DIRECTORY_NAME = "profiles";

type StatusContext = Pick<ExtensionContext, "hasUI" | "ui">;

function notify(ctx: StatusContext, message: string, level: "info" | "warning" | "error" = "info"): void {
  if (ctx.hasUI) ctx.ui.notify(`profiles: ${message}`, level);
}

export function profilesDirectory(agentDir: string): string {
  return join(agentDir, PROFILE_DIRECTORY_NAME, PROFILES_DIRECTORY_NAME);
}

export function profilePath(agentDir: string, name: string): string {
  return join(profilesDirectory(agentDir), `${name}.yaml`);
}

function safeProfileName(name: string): boolean {
  return name.length > 0 && basename(name) === name && name !== "." && name !== "..";
}

export function listProfileNames(agentDir: string): string[] {
  try {
    return readdirSync(profilesDirectory(agentDir), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
      .map((entry) => basename(entry.name, ".yaml"))
      .sort();
  } catch {
    return [];
  }
}

export function readProfile(agentDir: string, name: string): { profile: Profile; path: string } {
  if (!safeProfileName(name)) throw new Error(`invalid profile name '${name}'`);
  const path = profilePath(agentDir, name);
  if (!existsSync(path)) throw new Error(`profile '${name}' does not exist`);
  const text = readFileSync(path, "utf8");
  return { profile: parseProfile(text, name), path };
}

function modelInfo(model: { provider: string; id: string; name: string }): ModelInfo {
  return { provider: model.provider, id: model.id, name: model.name };
}

function scoped(model: ModelInfo, models: ModelInfo[]): boolean {
  return models.length === 0 || models.some((entry) => entry.provider === model.provider && entry.id === model.id);
}

export interface StripPassSummary {
  changedFiles: number;
  skippedFiles: number;
  importedSaved: boolean;
  discardedExisting: number;
  failedFiles: string[];
}

function captureAdditions(
  additions: Record<string, { model?: string; thinking?: string }>,
  file: AgentFile,
  stripped: { model?: string; thinking?: string },
): void {
  if (Object.prototype.hasOwnProperty.call(additions, file.name)) return;
  if (Object.keys(stripped).length === 0) return;
  additions[file.name] = { ...stripped };
}

export function runStripPass(cwd: string, agentDir: string, projectTrusted: boolean): StripPassSummary {
  const additions: Record<string, { model?: string; thinking?: string }> = {};
  const strippedPinCounts = new Map<string, number>();
  const summary: StripPassSummary = {
    changedFiles: 0,
    skippedFiles: 0,
    importedSaved: false,
    discardedExisting: 0,
    failedFiles: [],
  };

  for (const file of allAgentFiles(cwd, agentDir)) {
    if (file.scope !== "global" && !projectTrusted) {
      summary.skippedFiles += 1;
      continue;
    }
    try {
      const result = stripPinsFromText(readAgentFile(file));
      if (result.skippedReason !== undefined) {
        summary.skippedFiles += 1;
        continue;
      }
      if (!result.changed) continue;
      atomicWriteFileSync(file.path, result.text);
      summary.changedFiles += 1;
      strippedPinCounts.set(file.name, (strippedPinCounts.get(file.name) ?? 0) + Object.keys(result.stripped).length);
      captureAdditions(additions, file, result.stripped);
    } catch {
      summary.failedFiles.push(file.path);
    }
  }

  if (Object.keys(additions).length > 0) {
    const importedPath = profilePath(agentDir, "imported");
    let existing: string | undefined;
    if (existsSync(importedPath)) {
      try {
        existing = readFileSync(importedPath, "utf8");
      } catch {
        existing = undefined;
      }
    }
    const existingNames = importedProfileAgentNames(existing);
    for (const [agent, count] of strippedPinCounts) {
      if (existingNames.has(agent)) summary.discardedExisting += count;
    }
    const newAdditions: Record<string, { model?: string; thinking?: string }> = {};
    for (const [agent, capture] of Object.entries(additions)) {
      if (!existingNames.has(agent)) newAdditions[agent] = capture;
    }
    if (Object.keys(newAdditions).length > 0) {
      try {
        mkdirSync(dirname(importedPath), { recursive: true });
        atomicWriteFileSync(importedPath, mergeImportedProfile(existing, newAdditions));
        summary.importedSaved = true;
      } catch {
        summary.failedFiles.push(importedPath);
      }
    }
  }
  return summary;
}

function notifyStripSummary(ctx: StatusContext, summary: StripPassSummary): void {
  if (summary.changedFiles > 0 || summary.importedSaved || summary.discardedExisting > 0) {
    const suffixes: string[] = [];
    if (summary.importedSaved) suffixes.push("saved to 'imported' profile");
    if (summary.discardedExisting > 0) {
      suffixes.push(`${summary.discardedExisting} re-stripped pins already captured in 'imported'`);
    }
    const suffix = suffixes.length > 0 ? `; ${suffixes.join("; ")}` : "";
    notify(ctx, `stripped model/thinking from ${summary.changedFiles} agent files${suffix}`);
  }
  if (summary.failedFiles.length > 0) {
    notify(ctx, `could not process ${summary.failedFiles.length} agent files`, "warning");
  }
}

function setActiveState(agentDir: string, cwd: string, name: string, scope: "global" | "project"): void {
  if (scope === "global") {
    const state = loadGlobalState(agentDir);
    state.active = name;
    saveGlobalState(agentDir, state);
  } else {
    saveProjectActive(cwd, name);
  }
}

export interface MainSessionApplication {
  model?: { provider: string; id: string };
  thinking?: ThinkingLevel;
}

export async function applyMainSessionConfig(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  profile: Profile,
  scope: "global" | "project",
): Promise<MainSessionApplication> {
  const agentDir = getAgentDir();
  const available = ctx.modelRegistry.getAvailable().map(modelInfo);
  const scopedModels = ctx.scopedModels.map((entry) => modelInfo(entry.model));
  const applied: MainSessionApplication = {};
  const globalState = loadGlobalState(agentDir);
  let stateDirty = false;
  if (profile.mainModel !== undefined) {
    const mainModel = resolveModel(profile.mainModel, available);
    if (mainModel !== undefined && scoped(mainModel, scopedModels)) {
      const targetModel = ctx.modelRegistry.find(mainModel.provider, mainModel.id);
      if (targetModel === undefined) {
        notify(ctx, `main model '${mainModel.provider}/${mainModel.id}' is unavailable`, "warning");
      } else {
        const currentModel = ctx.model;
        try {
          const changed = await pi.setModel(targetModel);
          if (!changed) {
            notify(ctx, `could not switch main model to '${mainModel.provider}/${mainModel.id}'`, "warning");
          } else {
            if (globalState.mainModelBackup === undefined || globalState.mainModelBackup === null) {
              globalState.mainModelBackup =
                currentModel === undefined ? null : { provider: currentModel.provider, id: currentModel.id };
            }
            globalState.mainModelApplied = { provider: mainModel.provider, id: mainModel.id, scope };
            stateDirty = true;
            applied.model = { provider: mainModel.provider, id: mainModel.id };
          }
        } catch (error) {
          notify(ctx, `could not switch main model: ${error instanceof Error ? error.message : String(error)}`, "warning");
        }
      }
    }
  }

  if (profile.mainThinking !== undefined) {
    if (globalState.mainThinkingBackup === undefined || globalState.mainThinkingBackup === null) {
      globalState.mainThinkingBackup = pi.getThinkingLevel();
    }
    pi.setThinkingLevel(profile.mainThinking);
    globalState.mainThinkingApplied = { level: pi.getThinkingLevel(), scope };
    stateDirty = true;
    applied.thinking = pi.getThinkingLevel();
  }

  if (stateDirty) saveGlobalState(agentDir, globalState);
  return applied;
}

export async function activateProfile(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  name: string,
  scope: "global" | "project",
): Promise<boolean> {
  const agentDir = getAgentDir();
  let profile: Profile;
  try {
    profile = readProfile(agentDir, name).profile;
  } catch (error) {
    notify(ctx, error instanceof Error ? error.message : String(error), "error");
    return false;
  }

  const available = ctx.modelRegistry.getAvailable().map(modelInfo);
  const scopedModels = ctx.scopedModels.map((entry) => modelInfo(entry.model));
  const issues = validateProfile(profile, available, scopedModels);
  for (const issue of issues) notify(ctx, issue.message, issue.level);
  if (issues.some((issue) => issue.level === "error")) return false;

  const stripSummary = runStripPass(ctx.cwd, agentDir, ctx.isProjectTrusted());
  notifyStripSummary(ctx, stripSummary);

  await applyMainSessionConfig(pi, ctx, profile, scope);
  setActiveState(agentDir, ctx.cwd, name, scope);
  refreshStatus(ctx, name);
  notify(ctx, `activated profile '${name}' (${scope})`);
  return true;
}

function sameModel(
  model: { provider: string; id: string } | undefined,
  target: { provider: string; id: string },
): boolean {
  return model !== undefined && model.provider === target.provider && model.id === target.id;
}

export async function deactivateProfile(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  scope: "global" | "project",
): Promise<void> {
  const thinkingBeforeRestore = pi.getThinkingLevel();
  const agentDir = getAgentDir();
  const state = loadGlobalState(agentDir);
  if (scope === "project") {
    saveProjectActive(ctx.cwd, null);
  } else {
    state.active = null;
  }

  let stateDirty = false;
  if (state.mainModelApplied?.scope === scope) {
    const applied = state.mainModelApplied;
    if (sameModel(ctx.model, applied) && state.mainModelBackup !== undefined && state.mainModelBackup !== null) {
      const backup = state.mainModelBackup;
      const model = ctx.modelRegistry.find(backup.provider, backup.id);
      if (model === undefined) {
        notify(ctx, `backup main model '${backup.provider}/${backup.id}' is unavailable`, "warning");
      } else {
        try {
          const restored = await pi.setModel(model);
          if (!restored) notify(ctx, `could not restore main model '${backup.provider}/${backup.id}'`, "warning");
        } catch (error) {
          notify(ctx, `could not restore main model: ${error instanceof Error ? error.message : String(error)}`, "warning");
        }
      }
    }
    state.mainModelApplied = null;
    state.mainModelBackup = null;
    stateDirty = true;
  }

  if (state.mainThinkingApplied?.scope === scope) {
    const applied = state.mainThinkingApplied;
    const backup = state.mainThinkingBackup;
    if (backup !== undefined && backup !== null && thinkingBeforeRestore === applied.level) {
      try {
        pi.setThinkingLevel(backup);
      } catch (error) {
        notify(ctx, `could not restore main thinking: ${error instanceof Error ? error.message : String(error)}`, "warning");
      }
    }
    state.mainThinkingApplied = null;
    state.mainThinkingBackup = null;
    stateDirty = true;
  }

  if (stateDirty || scope === "global") saveGlobalState(agentDir, state);

  const active = resolveActiveName(ctx.cwd, agentDir);
  refreshStatus(ctx, active);
  notify(ctx, `deactivated ${scope} profile${active === null ? "" : `; active profile '${active}' remains`}`);
}

export function refreshStatus(ctx: StatusContext, name: string | null): void {
  if (ctx.hasUI) ctx.ui.setStatus("subagent-profiles", name === null ? undefined : `profile: ${name}`);
}
