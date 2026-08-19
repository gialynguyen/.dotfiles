import { readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { basename, join } from "node:path";

// Keep this module independent of pi; the current coding-agent config directory is .pi.
const CONFIG_DIR_NAME = ".pi";

export interface AgentFile {
  name: string;
  path: string;
  scope: "project" | "workspace" | "global";
}

interface AgentDirectory {
  path: string;
  scope: AgentFile["scope"];
}

const directories = (cwd: string, agentDir: string): AgentDirectory[] => [
  { path: join(cwd, CONFIG_DIR_NAME, "agents"), scope: "project" },
  { path: join(cwd, ".agents", "agents"), scope: "workspace" },
  { path: join(agentDir, "agents"), scope: "global" },
];

function filesInDirectory(directory: AgentDirectory): AgentFile[] {
  try {
    return readdirSync(directory.path, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => ({
        name: basename(entry.name, ".md"),
        path: join(directory.path, entry.name),
        scope: directory.scope,
      }));
  } catch {
    return [];
  }
}

export function allAgentFiles(cwd: string, agentDir: string): AgentFile[] {
  return directories(cwd, agentDir).flatMap(filesInDirectory);
}

interface TextLine {
  content: string;
  ending: string;
}

function splitLines(text: string): TextLine[] {
  const lines: TextLine[] = [];
  let start = 0;
  while (start < text.length) {
    let index = start;
    while (index < text.length && text[index] !== "\n" && text[index] !== "\r") index += 1;
    if (index === text.length) {
      lines.push({ content: text.slice(start), ending: "" });
      break;
    }
    if (text[index] === "\r" && text[index + 1] === "\n") {
      lines.push({ content: text.slice(start, index), ending: "\r\n" });
      start = index + 2;
    } else {
      lines.push({ content: text.slice(start, index), ending: text[index] });
      start = index + 1;
    }
  }
  return lines;
}

function unquoteScalar(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export interface StripResult {
  changed: boolean;
  skippedReason?: string;
  stripped: { model?: string; thinking?: string };
  text: string;
}

export function stripPinsFromText(text: string): StripResult {
  const lines = splitLines(text);
  if (lines.length === 0 || lines[0].content !== "---") {
    return { changed: false, stripped: {}, text };
  }
  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].content === "---") {
      closing = index;
      break;
    }
  }
  if (closing < 0) return { changed: false, stripped: {}, text };

  const pinPattern = /^(model|thinking)\s*:\s*(.*)$/;
  const indicators = ["|", ">", "[", "{", "&", "*"];
  for (let index = 1; index < closing; index += 1) {
    const match = pinPattern.exec(lines[index].content);
    if (!match) continue;
    const value = match[2].trim();
    const hasIndentedContinuation = index + 1 < closing && /^[ \t]/.test(lines[index + 1].content);
    if (indicators.some((indicator) => value.startsWith(indicator)) || hasIndentedContinuation) {
      return {
        changed: false,
        skippedReason: "multi-line model/thinking value",
        stripped: {},
        text,
      };
    }
  }

  const removed = new Set<number>();
  const stripped: { model?: string; thinking?: string } = {};
  for (let index = 1; index < closing; index += 1) {
    const match = pinPattern.exec(lines[index].content);
    if (!match) continue;
    const key = match[1] as "model" | "thinking";
    if (!(key in stripped)) stripped[key] = unquoteScalar(match[2]);
    removed.add(index);
  }
  if (removed.size === 0) return { changed: false, stripped: {}, text };

  const output = lines
    .filter((_line, index) => !removed.has(index))
    .map((line) => `${line.content}${line.ending}`)
    .join("");
  return { changed: true, stripped, text: output };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function existingOverrides(existingYaml: string | undefined): Record<string, unknown> {
  if (existingYaml === undefined) return {};
  try {
    const value = parse(existingYaml) as unknown;
    if (!isRecord(value) || !isRecord(value.overrides)) return {};
    return { ...value.overrides };
  } catch {
    return {};
  }
}

export function importedProfileAgentNames(existingYaml: string | undefined): Set<string> {
  return new Set(Object.keys(existingOverrides(existingYaml)));
}

export function mergeImportedProfile(
  existingYaml: string | undefined,
  additions: Record<string, { model?: string; thinking?: string }>,
): string {
  let existing: Record<string, unknown> = {};
  if (existingYaml !== undefined) {
    try {
      const parsed = parse(existingYaml) as unknown;
      if (isRecord(parsed)) existing = parsed;
    } catch {
      existing = {};
    }
  }

  const overrides: Record<string, unknown> = isRecord(existing.overrides) ? { ...existing.overrides } : {};
  for (const [agent, capture] of Object.entries(additions)) {
    if (Object.prototype.hasOwnProperty.call(overrides, agent)) continue;
    const rule: Record<string, unknown> = {
      models: [capture.model === undefined || capture.model.trim() === "" ? "inherit" : capture.model],
    };
    if (capture.thinking !== undefined && capture.thinking.trim() !== "") rule.thinking = capture.thinking;
    overrides[agent] = rule;
  }

  const output: Record<string, unknown> = {
    name: "imported",
    description: "Auto-managed profile imported from stripped agent frontmatter pins.",
    default: { models: ["inherit"] },
    overrides,
  };
  return stringify(output, { lineWidth: 0 });
}

export function readAgentFile(file: AgentFile): string {
  return readFileSync(file.path, "utf8");
}
