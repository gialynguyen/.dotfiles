import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { atomicWriteFileSync } from "./fsutil";
import { THINKING_LEVELS, type ThinkingLevel } from "./types";

// state.ts intentionally has no pi imports; this is the coding-agent project config directory.
const CONFIG_DIR_NAME = ".pi";

export interface MainModelBackup {
  provider: string;
  id: string;
}

export interface MainModelApplied extends MainModelBackup {
  scope: "global" | "project";
}

export interface GlobalState {
  active: string | null;
  mainModelBackup?: MainModelBackup | null;
  mainModelApplied?: MainModelApplied | null;
  mainThinkingBackup?: ThinkingLevel | null;
  mainThinkingApplied?: { level: ThinkingLevel; scope: "global" | "project" } | null;
}

function globalStatePath(agentDir: string): string {
  return join(agentDir, "subagent-profiles", "state.json");
}

function projectStatePath(cwd: string): string {
  return join(cwd, CONFIG_DIR_NAME, "subagent-profiles.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === "string" && (THINKING_LEVELS as readonly string[]).includes(value);
}

function parseThinkingBackup(value: unknown): ThinkingLevel | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return isThinkingLevel(value) ? value : undefined;
}

function parseThinkingApplied(
  value: unknown,
): { level: ThinkingLevel; scope: "global" | "project" } | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!isRecord(value) || !isThinkingLevel(value.level) || (value.scope !== "global" && value.scope !== "project")) {
    return undefined;
  }
  return { level: value.level, scope: value.scope };
}

function parseModelBackup(value: unknown): MainModelBackup | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.provider !== "string" ||
    typeof value.id !== "string" ||
    value.provider.length === 0 ||
    value.id.length === 0
  ) {
    return undefined;
  }
  return { provider: value.provider, id: value.id };
}

function parseModelApplied(value: unknown): MainModelApplied | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.provider !== "string" ||
    typeof value.id !== "string" ||
    value.provider.length === 0 ||
    value.id.length === 0 ||
    (value.scope !== "global" && value.scope !== "project")
  ) {
    return undefined;
  }
  return { provider: value.provider, id: value.id, scope: value.scope };
}

export function loadGlobalState(agentDir: string): GlobalState {
  const path = globalStatePath(agentDir);
  if (!existsSync(path)) return { active: null };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!isRecord(parsed)) return { active: null };
    const active = parsed.active;
    if (active !== null && typeof active !== "string") return { active: null };

    const state: GlobalState = { active: active as string | null };
    const backup = parseModelBackup(parsed.mainModelBackup);
    if (backup !== undefined) state.mainModelBackup = backup;
    const applied = parseModelApplied(parsed.mainModelApplied);
    if (applied !== undefined) state.mainModelApplied = applied;
    const thinkingBackup = parseThinkingBackup(parsed.mainThinkingBackup);
    if (thinkingBackup !== undefined) state.mainThinkingBackup = thinkingBackup;
    const thinkingApplied = parseThinkingApplied(parsed.mainThinkingApplied);
    if (thinkingApplied !== undefined) state.mainThinkingApplied = thinkingApplied;
    return state;
  } catch {
    return { active: null };
  }
}

export function saveGlobalState(agentDir: string, state: GlobalState): void {
  const path = globalStatePath(agentDir);
  mkdirSync(dirname(path), { recursive: true });
  atomicWriteFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

export function loadProjectActive(cwd: string): string | null | undefined {
  const path = projectStatePath(cwd);
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!isRecord(parsed) || !("active" in parsed)) return undefined;
    const active = parsed.active;
    return active === null || typeof active === "string" ? active : undefined;
  } catch {
    return undefined;
  }
}

export function saveProjectActive(cwd: string, name: string | null): void {
  const path = projectStatePath(cwd);
  let object: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
      if (isRecord(parsed)) object = { ...parsed };
    } catch {
      object = {};
    }
  }
  if (name === null) delete object.active;
  else object.active = name;
  if (Object.keys(object).length === 0) {
    if (existsSync(path)) unlinkSync(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  atomicWriteFileSync(path, `${JSON.stringify(object, null, 2)}\n`);
}

export function resolveActiveName(cwd: string, agentDir: string): string | null {
  const project = loadProjectActive(cwd);
  if (project !== undefined) return project;
  return loadGlobalState(agentDir).active;
}
