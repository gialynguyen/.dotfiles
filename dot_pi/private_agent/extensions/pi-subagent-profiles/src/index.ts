import { existsSync, statSync } from "node:fs";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  applyMainSessionConfig,
  listProfileNames,
  profilePath,
  readProfile,
  refreshStatus,
  runStripPass,
  type StripPassSummary,
} from "./activate";
import { makeAgentToolCallHandler } from "./inject";
import { isGitRepo } from "./fsutil";
import { loadGlobalState, loadProjectActive, resolveActiveName } from "./state";
import { handleCommand } from "./ui";
import type { Profile } from "./types";

function notify(ctx: Pick<ExtensionContext, "hasUI" | "ui">, message: string, level: "info" | "warning" | "error"): void {
  if (ctx.hasUI) ctx.ui.notify(`profiles: ${message}`, level);
}

function summaryText(summary: StripPassSummary): string {
  const suffixes: string[] = [];
  if (summary.importedSaved) suffixes.push("saved to 'imported' profile");
  if (summary.discardedExisting > 0) {
    suffixes.push(`${summary.discardedExisting} re-stripped pins already captured in 'imported'`);
  }
  const suffix = suffixes.length > 0 ? `; ${suffixes.join("; ")}` : "";
  return `stripped model/thinking from ${summary.changedFiles} agent files${suffix}`;
}

let stripRanThisProcess = false;

export default function profileExtension(pi: ExtensionAPI): void {
  const agentDir = getAgentDir();
  let latestContext: ExtensionContext | undefined;
  let cache:
    | {
        key: string;
        profile: Profile;
      }
    | undefined;
  const reportedFailures = new Set<string>();

  const getActiveProfile = (): Profile | undefined => {
    const ctx = latestContext;
    if (ctx === undefined) return undefined;
    const name = resolveActiveName(ctx.cwd, agentDir);
    if (name === null) return undefined;
    const path = profilePath(agentDir, name);
    let mtime = -1;
    try {
      if (existsSync(path)) mtime = statSync(path).mtimeMs;
    } catch {
      mtime = -1;
    }
    const key = `${ctx.cwd}:${name}:${mtime}`;
    if (cache?.key === key) return cache.profile;
    try {
      const profile = readProfile(agentDir, name).profile;
      cache = { key, profile };
      return profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!reportedFailures.has(key)) {
        reportedFailures.add(key);
        notify(ctx, message, "error");
      }
      return undefined;
    }
  };

  const agentToolHandler = makeAgentToolCallHandler({
    getActiveProfile,
    canIsolate: isGitRepo,
    log: (message) => {
      if (latestContext?.hasUI) latestContext.ui.notify(`profiles: ${message}`, "warning");
    },
  });

  const refreshForContext = (ctx: ExtensionContext): void => {
    latestContext = ctx;
    if (!stripRanThisProcess) {
      stripRanThisProcess = true;
      try {
        const summary = runStripPass(ctx.cwd, agentDir, ctx.isProjectTrusted());
        if ((summary.changedFiles > 0 || summary.importedSaved || summary.discardedExisting > 0) && ctx.hasUI) {
          notify(ctx, summaryText(summary), "info");
        }
      } catch {
        // Lifecycle refresh is intentionally quiet when the strip pass cannot run.
      }
    }
    const active = resolveActiveName(ctx.cwd, agentDir);
    refreshStatus(ctx, active);
  };

  const applyActiveProfileMainSession = async (pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> => {
    // determine scope: project value wins when the project key exists
    const projectName = loadProjectActive(ctx.cwd);
    let name: string | null;
    let scope: "global" | "project";
    if (projectName !== undefined) { name = projectName; scope = "project"; }
    else { name = loadGlobalState(agentDir).active; scope = "global"; }
    if (name === null) return;
    try {
      const profile = readProfile(agentDir, name).profile;
      const applied = await applyMainSessionConfig(pi, ctx, profile, scope);
      if (applied.model !== undefined || applied.thinking !== undefined) {
        notify(ctx, `applied active profile '${name}' main session settings`, "info");
      }
    } catch (error) {
      notify(ctx, error instanceof Error ? error.message : String(error), "error");
    }
  };

  pi.registerCommand("profiles", {
    description: "Manage named subagent model and thinking profiles",
    getArgumentCompletions: (argumentPrefix) => {
      const subcommands = ["list", "use", "off", "show", "validate", "strip", "create", "delete"];
      const trimmed = argumentPrefix.trim();
      const trailingSpace = /\s$/.test(argumentPrefix);
      const parts = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
      if (parts.length === 0 || (parts.length === 1 && !trailingSpace)) {
        const prefix = parts[0] ?? "";
        return subcommands
          .filter((command) => command.startsWith(prefix))
          .map((command) => ({ value: command, label: command }));
      }
      const command = parts[0];
      if (!["use", "show", "delete", "validate"].includes(command)) return null;
      const prefix = trailingSpace ? "" : parts[parts.length - 1];
      return listProfileNames(agentDir)
        .filter((name) => name.startsWith(prefix))
        .map((name) => ({ value: `${command} ${name}`, label: name }));
    },
    handler: async (args, ctx) => {
      latestContext = ctx;
      await handleCommand(pi, args, ctx);
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    latestContext = ctx;
    await agentToolHandler(event, ctx);
  });
  pi.on("session_start", async (_event, ctx) => {
    refreshForContext(ctx);
    await applyActiveProfileMainSession(pi, ctx);
  });
  pi.on("resources_discover", async (_event, ctx) => {
    refreshForContext(ctx);
  });
}
