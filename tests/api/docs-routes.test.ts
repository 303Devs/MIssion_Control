import path from "path";
import { NextRequest } from "next/server";
import { makeTempDir, writeFile } from "../helpers/temp";

async function loadDocsRoutes(workspaceRoot: string) {
  vi.resetModules();
  process.env.MISSION_CONTROL_OPENCLAW_ROOT = path.dirname(workspaceRoot);
  const docs = await import("@/app/api/docs/route");
  const docsTree = await import("@/app/api/docs-tree/route");
  return { docs, docsTree };
}

describe("docs API routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns the markdown document content for allowed workspace docs", async () => {
    const root = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(root, "docs", "guide.md"), "# Guide");
    const { docs } = await loadDocsRoutes(root);

    const response = await docs.GET(new NextRequest("http://localhost/api/docs?path=docs/guide.md"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ content: "# Guide", path: "docs/guide.md" });
  });

  it("rejects missing or unsafe docs paths", async () => {
    const root = path.join(makeTempDir("mc-openclaw-"), "workspace");
    const { docs } = await loadDocsRoutes(root);

    const missing = await docs.GET(new NextRequest("http://localhost/api/docs"));
    expect(missing.status).toBe(400);

    const unsafe = await docs.GET(new NextRequest("http://localhost/api/docs?path=../secret.md"));
    expect(unsafe.status).toBe(403);
  });

  it("returns the workspace docs tree", async () => {
    const root = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(root, "README.md"), "readme");
    writeFile(path.join(root, "docs", "guide.md"), "guide");
    const { docsTree } = await loadDocsRoutes(root);

    const response = await docsTree.GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tree: [
        { name: "README.md", path: "README.md", type: "file" },
        { name: "guide.md", path: "docs/guide.md", type: "file" },
      ],
    });
  });
});
