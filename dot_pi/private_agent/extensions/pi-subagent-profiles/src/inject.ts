import { pickModel } from "./profile";
import type { ModelInfo, Profile, ProfileRule } from "./types";

export interface AgentToolModel {
  provider: string;
  id: string;
  name: string;
}

export interface AgentToolCallContext {
  cwd: string;
  modelRegistry: {
    getAvailable(): readonly AgentToolModel[];
  };
  scopedModels: readonly { model: AgentToolModel }[];
}

interface AgentInput {
  model?: unknown;
  thinking?: unknown;
  isolation?: unknown;
  subagent_type?: unknown;
  [key: string]: unknown;
}

interface EventView {
  toolName?: unknown;
  input?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toModelInfo(model: AgentToolModel): ModelInfo {
  return { provider: model.provider, id: model.id, name: model.name };
}

function matchingRule(profile: Profile, subagentType: string | undefined): ProfileRule {
  if (subagentType !== undefined) {
    const wanted = subagentType.toLocaleLowerCase();
    for (const [agent, rule] of Object.entries(profile.overrides)) {
      if (agent.toLocaleLowerCase() === wanted) return rule;
    }
  }
  return profile.default;
}

export function makeAgentToolCallHandler(deps: {
  getActiveProfile: () => Profile | undefined;
  log: (msg: string) => void;
  canIsolate: (cwd: string) => boolean;
}): (event: unknown, ctx: AgentToolCallContext) => Promise<void> {
  const warnedNoModel = new Set<string>();
  const warnedNoGit = new Set<string>();
  return async (event, ctx): Promise<void> => {
    try {
      if (!isRecord(event)) return;
      const view = event as EventView;
      if (view.toolName !== "Agent" || !isRecord(view.input)) return;
      const input = view.input as AgentInput;
      const profile = deps.getActiveProfile();
      if (profile === undefined) return;

      const subagentType =
        typeof input.subagent_type === "string" && input.subagent_type.length > 0 ? input.subagent_type : undefined;
      const rule = matchingRule(profile, subagentType);
      const available = ctx.modelRegistry.getAvailable().map(toModelInfo);
      const scoped = ctx.scopedModels.map((entry) => toModelInfo(entry.model));
      const model = pickModel(rule, available, scoped);
      if (model === undefined) {
        const warningKey = `${profile.name}:${subagentType ?? "default"}`;
        if (!warnedNoModel.has(warningKey)) {
          warnedNoModel.add(warningKey);
          deps.log(`profile '${profile.name}': no valid model for ${subagentType ?? "default"}, inheriting parent`);
        }
      } else if (model !== "inherit") {
        input.model = `${model.provider}/${model.id}`;
      }
      if (rule.thinking !== undefined) input.thinking = rule.thinking;
      if (rule.isolation === true) {
        if (deps.canIsolate(ctx.cwd)) {
          input.isolation = "worktree";
        } else {
          const warningKey = profile.name;
          if (!warnedNoGit.has(warningKey)) {
            warnedNoGit.add(warningKey);
            deps.log(`profile '${profile.name}': isolation requested but the project is not a git repository; spawning without worktree isolation`);
          }
        }
      }
    } catch (error) {
      try {
        deps.log(`profile injection failed: ${error instanceof Error ? error.message : String(error)}`);
      } catch {
        // A logging adapter must not make a tool call fail.
      }
    }
  };
}
