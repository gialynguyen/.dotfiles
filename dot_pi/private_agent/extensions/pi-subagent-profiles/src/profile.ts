import { parse, stringify } from "yaml";
import {
  THINKING_LEVELS,
  type ModelInfo,
  type Profile,
  type ProfileIssue,
  type ProfileRule,
  type ThinkingLevel,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === "string" && (THINKING_LEVELS as readonly string[]).includes(value);
}

function parseRule(value: unknown, label: string): ProfileRule {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a mapping`);
  }
  const models = value.models;
  if (
    !Array.isArray(models) ||
    models.length === 0 ||
    models.some((model) => typeof model !== "string" || model.trim().length === 0)
  ) {
    throw new Error(`${label}.models must be a non-empty string array`);
  }
  const thinking = value.thinking;
  if (thinking !== undefined && !isThinkingLevel(thinking)) {
    throw new Error(`${label}.thinking must be one of: ${THINKING_LEVELS.join(", ")}`);
  }
  const isolation = value.isolation;
  if (isolation !== undefined && typeof isolation !== "boolean") {
    throw new Error(`${label}.isolation must be a boolean`);
  }
  return {
    models: [...models] as string[],
    ...(thinking === undefined ? {} : { thinking }),
    ...(isolation === undefined ? {} : { isolation }),
  };
}

export function parseProfile(yamlText: string, fallbackName: string): Profile {
  let value: unknown;
  try {
    value = parse(yamlText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid profile YAML: ${message}`);
  }
  if (!isRecord(value)) {
    throw new Error("Profile must be a YAML mapping");
  }

  const rawName = value.name;
  if (rawName !== undefined && (typeof rawName !== "string" || rawName.trim().length === 0)) {
    throw new Error("Profile name must be a non-empty string");
  }
  const name = rawName === undefined ? fallbackName : rawName;
  const description = value.description;
  if (description !== undefined && typeof description !== "string") {
    throw new Error("Profile description must be a string");
  }

  const defaultRule = parseRule(value.default, "default");
  const rawOverrides = value.overrides;
  if (rawOverrides !== undefined && !isRecord(rawOverrides)) {
    throw new Error("overrides must be a mapping");
  }
  const overrides: Record<string, ProfileRule> = {};
  if (rawOverrides !== undefined) {
    for (const [agent, rule] of Object.entries(rawOverrides)) {
      overrides[agent] = parseRule(rule, `overrides.${agent}`);
    }
  }

  const mainModel = value.mainModel;
  if (mainModel !== undefined && (typeof mainModel !== "string" || mainModel.trim().length === 0)) {
    throw new Error("mainModel must be a non-empty string when provided");
  }
  const mainThinking = value.mainThinking;
  if (mainThinking !== undefined && !isThinkingLevel(mainThinking)) {
    throw new Error(`mainThinking must be one of: ${THINKING_LEVELS.join(", ")}`);
  }

  return {
    name,
    ...(description === undefined ? {} : { description }),
    default: defaultRule,
    overrides,
    ...(mainModel === undefined ? {} : { mainModel }),
    ...(mainThinking === undefined ? {} : { mainThinking }),
  };
}

function serializeRule(rule: ProfileRule): Record<string, unknown> {
  return {
    models: [...rule.models],
    ...(rule.thinking === undefined ? {} : { thinking: rule.thinking }),
    ...(rule.isolation === undefined ? {} : { isolation: rule.isolation }),
  };
}

export function serializeProfile(profile: Profile): string {
  const overrides: Record<string, Record<string, unknown>> = {};
  for (const [agent, rule] of Object.entries(profile.overrides)) {
    overrides[agent] = serializeRule(rule);
  }
  const value: Record<string, unknown> = {
    name: profile.name,
  };
  if (profile.description !== undefined) value.description = profile.description;
  value.default = serializeRule(profile.default);
  value.overrides = overrides;
  if (profile.mainModel !== undefined) value.mainModel = profile.mainModel;
  if (profile.mainThinking !== undefined) value.mainThinking = profile.mainThinking;
  return stringify(value, { lineWidth: 0 });
}

function isInScope(model: ModelInfo, scoped: ModelInfo[]): boolean {
  return scoped.length === 0 || scoped.some((entry) => entry.provider === model.provider && entry.id === model.id);
}

export function resolveModel(fuzzy: string, available: ModelInfo[]): ModelInfo | undefined {
  if (fuzzy === "inherit") return undefined;
  const exactReference = available.filter((model) => `${model.provider}/${model.id}` === fuzzy);
  if (exactReference.length > 1) return undefined;
  if (exactReference.length === 1) return exactReference[0];

  const exactId = available.filter((model) => model.id === fuzzy);
  if (exactId.length > 1) return undefined;
  if (exactId.length === 1) return exactId[0];

  const lower = fuzzy.toLocaleLowerCase();
  const idSubstring = available.filter((model) => model.id.toLocaleLowerCase().includes(lower));
  if (idSubstring.length > 1) return undefined;
  if (idSubstring.length === 1) return idSubstring[0];

  const nameSubstring = available.filter((model) => model.name.toLocaleLowerCase().includes(lower));
  if (nameSubstring.length !== 1) return undefined;
  return nameSubstring[0];
}

export function pickModel(
  ruleOrModels: ProfileRule | readonly string[],
  available: ModelInfo[],
  scoped: ModelInfo[],
): ModelInfo | "inherit" | undefined {
  const models: readonly string[] = Array.isArray(ruleOrModels) ? ruleOrModels : (ruleOrModels as ProfileRule).models;
  for (const fuzzy of models) {
    if (fuzzy === "inherit") return "inherit";
    const model = resolveModel(fuzzy, available);
    if (model !== undefined && isInScope(model, scoped)) return model;
  }
  return undefined;
}

function validateRule(label: string, rule: ProfileRule, available: ModelInfo[], scoped: ModelInfo[]): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  if (!Array.isArray(rule.models) || rule.models.length === 0) {
    issues.push({ level: "error", message: `${label} has no models` });
  }
  if (!isThinkingLevel(rule.thinking) && rule.thinking !== undefined) {
    issues.push({ level: "error", message: `${label}.thinking is invalid` });
  }
  if (rule.isolation !== undefined && typeof rule.isolation !== "boolean") {
    issues.push({ level: "error", message: `${label}.isolation is invalid` });
  }
  const hasInherit = rule.models.includes("inherit");
  for (const fuzzy of rule.models) {
    if (fuzzy !== "inherit" && resolveModel(fuzzy, available) === undefined) {
      issues.push({ level: "warning", message: `${label} model '${fuzzy}' does not resolve` });
    }
  }
  if (!hasInherit && pickModel(rule, available, scoped) === undefined) {
    issues.push({ level: "error", message: `${label} has no resolvable model in scope` });
  }
  return issues;
}

export function validateProfile(profile: Profile, available: ModelInfo[], scoped: ModelInfo[]): ProfileIssue[] {
  const issues = validateRule("default", profile.default, available, scoped);
  for (const [agent, rule] of Object.entries(profile.overrides)) {
    issues.push(...validateRule(`override '${agent}'`, rule, available, scoped));
  }
  if (profile.mainModel !== undefined) {
    const model = resolveModel(profile.mainModel, available);
    if (model === undefined) {
      issues.push({ level: "error", message: `mainModel '${profile.mainModel}' does not resolve` });
    } else if (!isInScope(model, scoped)) {
      issues.push({ level: "error", message: `mainModel '${profile.mainModel}' is outside the model scope` });
    }
  }
  return issues;
}
