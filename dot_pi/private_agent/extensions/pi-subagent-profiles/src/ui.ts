import { mkdirSync, unlinkSync } from "node:fs";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { allAgentFiles } from "./agents";
import { atomicWriteFileSync } from "./fsutil";
import {
  activateProfile,
  deactivateProfile,
  listProfileNames,
  profilePath,
  profilesDirectory,
  readProfile,
  runStripPass,
} from "./activate";
import { serializeProfile, validateProfile } from "./profile";
import { pickModels } from "./picker";
import { loadGlobalState, loadProjectActive, resolveActiveName } from "./state";
import { THINKING_LEVELS, type Profile, type ProfileRule, type ThinkingLevel } from "./types";

function notify(
  ctx: ExtensionCommandContext,
  message: string,
  level: "info" | "warning" | "error" = "info",
): void {
  if (ctx.hasUI) ctx.ui.notify(`profiles: ${message}`, level);
}

function names(): string[] {
  return listProfileNames(getAgentDir());
}

function knownAgentNames(ctx: ExtensionCommandContext): string[] {
  const values = new Set(allAgentFiles(ctx.cwd, getAgentDir()).map((file) => file.name));
  for (const builtIn of ["general-purpose", "Explore", "Plan"]) values.add(builtIn);
  return [...values].sort();
}

function parseScope(args: string[], defaultScope: "global" | "project"): "global" | "project" | undefined {
  if (args.length === 0) return defaultScope;
  if (args.length === 1 && args[0] === "--global") return "global";
  if (args.length === 1 && args[0] === "--project") return "project";
  return undefined;
}

async function showProfile(ctx: ExtensionCommandContext, name: string): Promise<void> {
  try {
    const loaded = readProfile(getAgentDir(), name);
    const defaultChain = loaded.profile.default.models.join(" -> ");
    const mainModel = loaded.profile.mainModel ?? "none";
    const mainThinking = loaded.profile.mainThinking ?? "none";
    const isolation = loaded.profile.default.isolation === true ? "on" : "off";
    notify(
      ctx,
      `${loaded.path}; default chain: ${defaultChain}; overrides: ${Object.keys(loaded.profile.overrides).length}; mainModel: ${mainModel}; mainThinking: ${mainThinking}; isolation: ${isolation}`,
    );
  } catch (error) {
    notify(ctx, error instanceof Error ? error.message : String(error), "error");
  }
}

async function validateProfiles(ctx: ExtensionCommandContext, requestedName: string | undefined): Promise<void> {
  const selected = requestedName === undefined ? names() : [requestedName];
  if (selected.length === 0) {
    notify(ctx, "no profiles found", "warning");
    return;
  }
  const available = ctx.modelRegistry.getAvailable().map((model) => ({
    provider: model.provider,
    id: model.id,
    name: model.name,
  }));
  const scoped = ctx.scopedModels.map((entry) => ({
    provider: entry.model.provider,
    id: entry.model.id,
    name: entry.model.name,
  }));
  for (const name of selected) {
    try {
      const profile = readProfile(getAgentDir(), name).profile;
      const issues = validateProfile(profile, available, scoped);
      if (issues.length === 0) notify(ctx, `profile '${name}' is valid`);
      for (const issue of issues) notify(ctx, `profile '${name}': ${issue.message}`, issue.level);
    } catch (error) {
      notify(ctx, `profile '${name}': ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }
}

async function createProfile(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<void> {
  if (!ctx.hasUI || ctx.mode !== "tui") {
    notify(ctx, "create requires the TUI", "warning");
    return;
  }
  const existing = new Set(names());
  let name: string;
  while (true) {
    const entered = await ctx.ui.input("Profile name (Esc = cancel)", "lowercase-name");
    if (entered === undefined) return;
    name = entered.trim();
    if (!/^[a-z0-9][a-z0-9-_]*$/.test(name)) {
      notify(ctx, "name must match /^[a-z0-9][a-z0-9-_]*$/", "error");
      continue;
    }
    if (name === "imported") {
      notify(ctx, "the imported profile is reserved", "error");
      continue;
    }
    if (existing.has(name)) {
      notify(ctx, `profile '${name}' already exists`, "error");
      continue;
    }
    break;
  }

  const descriptionInput = await ctx.ui.input("Description (Esc = cancel)", "optional description");
  if (descriptionInput === undefined) return;
  const available = ctx.modelRegistry.getAvailable().map((model) => ({
    provider: model.provider,
    id: model.id,
    name: model.name,
  }));
  if (available.length === 0) {
    notify(ctx, "no available models to choose from", "error");
    return;
  }
  const pickedDefaultModels = await pickModels(ctx, {
    title: "Default model chain",
    mode: "multi",
    models: available,
    pseudoEntries: [{ value: "inherit", label: "inherit", description: "Inherit the caller's model at spawn time" }],
  });
  const defaultModels = pickedDefaultModels.length === 0 ? ["inherit"] : pickedDefaultModels;
  const thinkingChoice = await ctx.ui.select("Default thinking (Esc = cancel)", ["omit", ...THINKING_LEVELS]);
  if (thinkingChoice === undefined) return;
  const isolationChoice = await ctx.ui.select("Subagent worktree isolation (Esc = cancel)", ["off", "on"]);
  if (isolationChoice === undefined) return;
  const defaultRule: ProfileRule = {
    models: defaultModels,
    ...(thinkingChoice === "omit" ? {} : { thinking: thinkingChoice as ThinkingLevel }),
    ...(isolationChoice === "on" ? { isolation: true } : {}),
  };

  const overrides: Record<string, ProfileRule> = {};
  const agents = knownAgentNames(ctx);
  while (true) {
    const remainingAgents = agents.filter((agent) => !Object.prototype.hasOwnProperty.call(overrides, agent));
    if (remainingAgents.length === 0) break;
    const add = await ctx.ui.select("Add per-agent override? (Esc = done)", ["no", "yes"]);
    if (add === undefined || add === "no") break;
    if (add !== "yes") break;
    const agent = await ctx.ui.select("Agent (Esc = cancel)", remainingAgents);
    if (agent === undefined) return;
    const overrideModels = await pickModels(ctx, {
      title: `Override model chain for '${agent}'`,
      mode: "multi",
      models: available,
    });
    if (overrideModels.length === 0) continue;
    const thinking = await ctx.ui.select("Override thinking (Esc = cancel)", ["omit", ...THINKING_LEVELS]);
    if (thinking === undefined) return;
    const isolation = await ctx.ui.select(`Override worktree isolation for '${agent}' (Esc = cancel)`, ["off", "on"]);
    if (isolation === undefined) return;
    overrides[agent] = {
      models: overrideModels,
      ...(thinking === "omit" ? {} : { thinking: thinking as ThinkingLevel }),
      ...(isolation === "on" ? { isolation: true } : {}),
    };
  }

  const mainChoice = await pickModels(ctx, {
    title: "Main model (optional)",
    mode: "single",
    models: available,
    pseudoEntries: [{ value: "none", label: "none", description: "Do not switch the main session model" }],
  });
  const mainThinkingChoice = await ctx.ui.select("Main thinking (applied to the main session)", ["omit", ...THINKING_LEVELS]);
  if (mainThinkingChoice === undefined) return;
  const profile: Profile = {
    name,
    ...(descriptionInput.trim() === "" ? {} : { description: descriptionInput.trim() }),
    default: defaultRule,
    overrides,
    ...(mainChoice === null || mainChoice === "none" ? {} : { mainModel: mainChoice }),
    ...(mainThinkingChoice === "omit" ? {} : { mainThinking: mainThinkingChoice as ThinkingLevel }),
  };
  const path = profilePath(getAgentDir(), name);
  mkdirSync(profilesDirectory(getAgentDir()), { recursive: true });
  atomicWriteFileSync(path, serializeProfile(profile));
  notify(ctx, `created profile '${name}'`);
  if (await ctx.ui.confirm("Activate now?", `Activate '${name}' for this project?`)) {
    await activateProfile(pi, ctx, name, "project");
  }
}

async function deleteProfile(ctx: ExtensionCommandContext, name: string): Promise<void> {
  const agentDir = getAgentDir();
  const globalActive = loadGlobalState(agentDir).active;
  const projectActive = loadProjectActive(ctx.cwd);
  if (globalActive === name || projectActive === name) {
    notify(ctx, `cannot delete active profile '${name}'`, "error");
    return;
  }
  if (!ctx.hasUI) {
    notify(ctx, "delete requires UI confirmation", "warning");
    return;
  }
  if (!names().includes(name)) {
    notify(ctx, `unknown profile '${name}'; available: ${names().join(", ") || "none"}`, "error");
    return;
  }
  if (!(await ctx.ui.confirm("Delete profile?", `Delete '${name}'?`))) return;
  try {
    unlinkSync(profilePath(agentDir, name));
    notify(ctx, `deleted profile '${name}'`);
  } catch (error) {
    notify(ctx, `could not delete '${name}': ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

async function openMenu(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<void> {
  if (!ctx.hasUI || ctx.mode !== "tui") {
    notify(ctx, "bare /profiles requires the TUI", "warning");
    return;
  }
  const choices = ["list", "use", "off", "show", "validate", "strip", "create", "delete", "close"];
  while (true) {
    const choice = await ctx.ui.select("Subagent profiles", choices);
    if (choice === undefined || choice === "close") return;
    if (choice === "list") {
      await handleCommand(pi, "list", ctx);
    } else if (choice === "use") {
      const available = names();
      if (available.length === 0) {
        notify(ctx, "no profiles found", "warning");
        continue;
      }
      const name = await ctx.ui.select("Profile", available);
      if (name === undefined) continue;
      const scopeChoice = await ctx.ui.select("Activation scope", ["project", "global"]);
      if (scopeChoice !== "global" && scopeChoice !== "project") continue;
      await activateProfile(pi, ctx, name, scopeChoice);
    } else if (choice === "off") {
      const scopeChoice = await ctx.ui.select("Deactivation scope", ["global", "project"]);
      if (scopeChoice !== "global" && scopeChoice !== "project") continue;
      await deactivateProfile(pi, ctx, scopeChoice);
    } else if (choice === "show") {
      const available = names();
      const name = available.length === 0 ? undefined : await ctx.ui.select("Profile", available);
      if (name !== undefined) await showProfile(ctx, name);
    } else if (choice === "validate") {
      await validateProfiles(ctx, undefined);
    } else if (choice === "strip") {
      await handleCommand(pi, "strip", ctx);
    } else if (choice === "create") {
      await createProfile(pi, ctx);
    } else if (choice === "delete") {
      const available = names();
      const name = available.length === 0 ? undefined : await ctx.ui.select("Profile", available);
      if (name !== undefined) await deleteProfile(ctx, name);
    }
  }
}

export async function handleCommand(pi: ExtensionAPI, args: string, ctx: ExtensionCommandContext): Promise<void> {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    await openMenu(pi, ctx);
    return;
  }
  const command = tokens[0];
  const rest = tokens.slice(1);
  if (command === "list") {
    const active = resolveActiveName(ctx.cwd, getAgentDir());
    const listed = names().map((name) => (name === active ? `* ${name}` : name));
    notify(ctx, listed.length === 0 ? "no profiles found" : listed.join(", "));
    return;
  }
  if (command === "use") {
    if (rest.length < 1 || rest.length > 2 || (rest.length === 2 && rest[1] !== "--global" && rest[1] !== "--project")) {
      notify(ctx, "usage: /profiles use <name> [--global|--project]", "error");
      return;
    }
    const name = rest[0];
    if (!names().includes(name)) {
      notify(ctx, `unknown profile '${name}'; available: ${names().join(", ") || "none"}`, "error");
      return;
    }
    await activateProfile(pi, ctx, name, rest[1] === "--global" ? "global" : "project");
    return;
  }
  if (command === "off") {
    const defaultScope = loadProjectActive(ctx.cwd) === undefined ? "global" : "project";
    const scope = parseScope(rest, defaultScope);
    if (scope === undefined) {
      notify(ctx, "usage: /profiles off [--global|--project]", "error");
      return;
    }
    await deactivateProfile(pi, ctx, scope);
    return;
  }
  if (command === "show") {
    if (rest.length !== 1) {
      notify(ctx, "usage: /profiles show <name>", "error");
      return;
    }
    await showProfile(ctx, rest[0]);
    return;
  }
  if (command === "validate") {
    if (rest.length > 1) {
      notify(ctx, "usage: /profiles validate [name]", "error");
      return;
    }
    await validateProfiles(ctx, rest[0]);
    return;
  }
  if (command === "strip") {
    if (rest.length !== 0) {
      notify(ctx, "usage: /profiles strip", "error");
      return;
    }
    const summary = runStripPass(ctx.cwd, getAgentDir(), ctx.isProjectTrusted());
    if (summary.changedFiles === 0 && !summary.importedSaved && summary.discardedExisting === 0) notify(ctx, "no agent pins changed");
    else {
      const suffixes: string[] = [];
      if (summary.importedSaved) suffixes.push("saved to 'imported' profile");
      if (summary.discardedExisting > 0) {
        suffixes.push(`${summary.discardedExisting} re-stripped pins already captured in 'imported'`);
      }
      const suffix = suffixes.length > 0 ? `; ${suffixes.join("; ")}` : "";
      notify(ctx, `stripped model/thinking from ${summary.changedFiles} agent files${suffix}`);
    }
    if (summary.failedFiles.length > 0) notify(ctx, `could not process ${summary.failedFiles.length} agent files`, "warning");
    return;
  }
  if (command === "create") {
    if (rest.length !== 0) {
      notify(ctx, "usage: /profiles create", "error");
      return;
    }
    await createProfile(pi, ctx);
    return;
  }
  if (command === "delete") {
    if (rest.length !== 1) {
      notify(ctx, "usage: /profiles delete <name>", "error");
      return;
    }
    await deleteProfile(ctx, rest[0]);
    return;
  }
  notify(ctx, "usage: /profiles [list|use|off|show|validate|strip|create|delete]", "error");
}
