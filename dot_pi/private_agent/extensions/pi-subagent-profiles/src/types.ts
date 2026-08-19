export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export const THINKING_LEVELS: readonly ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export interface ModelInfo {
  provider: string;
  id: string;
  name: string;
}

export interface ProfileRule {
  models: string[];
  thinking?: ThinkingLevel;
  isolation?: boolean;
}

export interface Profile {
  name: string;
  description?: string;
  default: ProfileRule;
  overrides: Record<string, ProfileRule>;
  mainModel?: string;
  mainThinking?: ThinkingLevel;
}

export interface ProfileIssue {
  level: "error" | "warning";
  message: string;
}
