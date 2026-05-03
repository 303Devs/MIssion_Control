import fs from "fs";
import path from "path";
import { makeTempDir, writeFile } from "../helpers/temp";

async function loadWorkspace(workspaceRoot: string) {
  vi.resetModules();
  process.env.MISSION_CONTROL_OPENCLAW_ROOT = path.dirname(workspaceRoot);
  return import("@/lib/workspace");
}

describe("workspace utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("normalizes previews by collapsing whitespace and truncating", async () => {
    const workspace = await loadWorkspace(path.join(makeTempDir("mc-openclaw-"), "workspace"));

    expect(workspace.normalizePreview("  hello\n\tthere   mission control  ", 16)).toBe("hello there miss");
  });

  it("resolves paths only within the requested base directory", async () => {
    const root = path.join(makeTempDir("mc-openclaw-"), "workspace");
    const workspace = await loadWorkspace(root);
    const docs = path.join(root, "docs");
    fs.mkdirSync(docs, { recursive: true });

    expect(workspace.resolveWithin(docs, "guide.md")).toBe(path.join(docs, "guide.md"));
    expect(workspace.resolveWithin(docs, "../secret.md")).toBeNull();
  });

  it("lists daily memory files newest first with previews", async () => {
    const root = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(root, "memory", "2026-05-01.md"), "First memory\nentry");
    writeFile(path.join(root, "memory", "2026-05-02.md"), "Second memory entry");
    writeFile(path.join(root, "memory", "notes.txt"), "ignored");

    const workspace = await loadWorkspace(root);

    expect(workspace.listDailyMemoryFiles()).toEqual([
      { date: "2026-05-02", filename: "2026-05-02.md", preview: "Second memory entry" },
      { date: "2026-05-01", filename: "2026-05-01.md", preview: "First memory entry" },
    ]);
  });

  it("builds a markdown docs tree and rejects traversal outside allowed markdown docs", async () => {
    const root = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(root, "README.md"), "root readme");
    writeFile(path.join(root, "docs", "b.md"), "b");
    writeFile(path.join(root, "docs", "nested", "a.md"), "a");
    writeFile(path.join(root, "docs", ".hidden.md"), "hidden");
    writeFile(path.join(root, "docs", "ignore.txt"), "ignored");

    const workspace = await loadWorkspace(root);

    expect(workspace.getDocsTree()).toEqual([
      { name: "README.md", path: "README.md", type: "file" },
      {
        name: "nested",
        path: "docs/nested",
        type: "dir",
        children: [{ name: "a.md", path: "docs/nested/a.md", type: "file" }],
      },
      { name: "b.md", path: "docs/b.md", type: "file" },
    ]);
    expect(workspace.resolveWorkspaceMarkdownPath("README.md")).toBe(path.join(root, "README.md"));
    expect(workspace.resolveWorkspaceMarkdownPath("docs/nested/a.md")).toBe(path.join(root, "docs", "nested", "a.md"));
    expect(workspace.resolveWorkspaceMarkdownPath("../outside.md")).toBeNull();
  });

  it("parses pipeline stages with owners and descriptions", async () => {
    const workspace = await loadWorkspace(path.join(makeTempDir("mc-openclaw-"), "workspace"));

    expect(workspace.parsePipelineStages(`# Plan\n\n## The Pipeline\n### 1. Intake (Agent — owner)\n- Capture requests\n### 2.5. Review\n- Verify outputs\n\n## Later\n`)).toEqual([
      {
        id: "1-intake",
        order: 1,
        name: "Intake",
        description: "Capture requests",
        agentName: "Agent",
      },
      {
        id: "2.5-review",
        order: 2.5,
        name: "Review",
        description: "Verify outputs",
        agentName: null,
      },
    ]);
  });
});
