import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const WORKSPACE_ROOT = OPENCLAW_WORKSPACE;
export const MEMORY_DIR = path.join(WORKSPACE_ROOT, "memory");
export const DOCS_DIR = path.join(WORKSPACE_ROOT, "docs");
export const ORG_FILE = path.join(WORKSPACE_ROOT, "ORG.md");
export const LONG_TERM_MEMORY_FILE = path.join(WORKSPACE_ROOT, "MEMORY.md");

export function normalizePreview(content: string, length = 180) {
  return content.replace(/\s+/g, " ").trim().slice(0, length);
}

export function resolveWithin(baseDir: string, targetPath: string) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, targetPath);

  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)) {
    return null;
  }

  try {
    const real = fs.realpathSync(resolvedTarget);
    if (real !== resolvedBase && !real.startsWith(`${resolvedBase}${path.sep}`)) {
      return null;
    }
  } catch {
    // Path doesn't exist yet; skip realpath check
  }

  return resolvedTarget;
}

export function readTextFile(filePath: string) {
  return fs.readFileSync(filePath, "utf-8");
}

export function listDailyMemoryFiles() {
  if (!fs.existsSync(MEMORY_DIR)) {
    return [];
  }

  return fs.readdirSync(MEMORY_DIR)
    .filter((filename) => /^\d{4}-\d{2}-\d{2}\.md$/.test(filename))
    .map((filename) => {
      const fullPath = path.join(MEMORY_DIR, filename);
      const content = readTextFile(fullPath);

      return {
        date: filename.replace(/\.md$/, ""),
        filename,
        preview: normalizePreview(content),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface DocsTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: DocsTreeNode[];
}

function walkDocsDir(dirPath: string, relativeBase = ""): DocsTreeNode[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const nodes: DocsTreeNode[] = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }

      const nextRelativePath = path.posix.join(relativeBase, entry.name);
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = walkDocsDir(fullPath, nextRelativePath);
        nodes.push({
          name: entry.name,
          path: nextRelativePath,
          type: "dir" as const,
          children,
        });
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      nodes.push({
        name: entry.name,
        path: nextRelativePath,
        type: "file" as const,
      });
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function getDocsTree(): DocsTreeNode[] {
  const rootMarkdownFiles = fs.existsSync(WORKSPACE_ROOT)
    ? fs.readdirSync(WORKSPACE_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => ({
        name: entry.name,
        path: entry.name,
        type: "file" as const,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return [
    ...rootMarkdownFiles,
    ...walkDocsDir(DOCS_DIR, "docs"),
  ];
}

export function resolveWorkspaceMarkdownPath(requestedPath: string) {
  const normalizedPath = requestedPath.replace(/\\/g, "/");
  const rootCandidate = resolveWithin(WORKSPACE_ROOT, normalizedPath);

  if (
    rootCandidate &&
    rootCandidate.endsWith(".md") &&
    fs.existsSync(rootCandidate)
  ) {
    const relativeToRoot = path.relative(WORKSPACE_ROOT, rootCandidate).replace(/\\/g, "/");
    const inDocsTree = relativeToRoot === path.basename(relativeToRoot) || relativeToRoot.startsWith("docs/");

    if (inDocsTree) {
      return rootCandidate;
    }
  }

  return null;
}

export interface PipelineStage {
  id: string;
  order: number;
  name: string;
  description: string;
  agentName: string | null;
}

export function parsePipelineStages(markdown: string): PipelineStage[] {
  const sectionMatch = markdown.match(/## The Pipeline([\s\S]*?)(?=\n## |\n# |$)/);
  if (!sectionMatch) {
    return [];
  }

  const section = sectionMatch[1];
  const stagePattern = /^###\s+([\d.]+)\.\s+(.+?)(?:\s+\(([^)]+)\))?$/gm;
  const matches = [...section.matchAll(stagePattern)];

  return matches.map((match, index) => {
    const [, orderLabel, rawName, rawOwner] = match;
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? section.length) : section.length;
    const chunk = section.slice(start, end);
    const lines = chunk.split("\n").slice(1)
      .map((line) => line.trim())
      .filter(Boolean);

    const description = lines
      .filter((line) => !line.startsWith("### "))
      .map((line) => line.replace(/^- /, ""))
      .join(" ");

    const agentName = rawOwner ? rawOwner.split("—")[0].trim() : null;
    const numericOrder = Number.parseFloat(orderLabel);

    return {
      id: `${orderLabel}-${rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
      order: Number.isNaN(numericOrder) ? index + 1 : numericOrder,
      name: rawName.trim(),
      description,
      agentName,
    };
  });
}
