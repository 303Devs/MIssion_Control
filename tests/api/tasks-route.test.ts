import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { makeTempDir, writeFile } from "../helpers/temp";

async function loadTasksRoute(projectRoot: string, workspaceRoot: string) {
  vi.resetModules();
  process.chdir(projectRoot);
  process.env.MISSION_CONTROL_OPENCLAW_ROOT = path.dirname(workspaceRoot);
  return import("@/app/api/tasks/route");
}

describe("tasks API route", () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-02T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.chdir(originalCwd);
    process.env = originalEnv;
  });

  it("merges gilfoyle todo tasks before persisted tasks", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({
      tasks: [{
        id: "static-1",
        title: "Static task",
        status: "backlog",
        priority: "low",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }],
    }));
    writeFile(path.join(workspaceRoot, "gilfoyle-todo.md"), "## Priority items\n1. **Ship tests** — add coverage\n\n## Backlog items\n- Clean docs: later");
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const response = await route.GET();
    const body = await response.json();

    expect(body.tasks).toEqual([
      expect.objectContaining({ title: "Ship tests", description: "add coverage", status: "in-progress", priority: "high", assignee: "Gilfoyle" }),
      expect.objectContaining({ title: "Clean docs", description: "later", status: "backlog", priority: "medium", assignee: "Gilfoyle" }),
      expect.objectContaining({ id: "static-1", title: "Static task" }),
    ]);
  });

  it("creates, updates, and deletes persisted tasks", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({ tasks: [] }));
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const created = await route.POST(new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "New task", status: "backlog", priority: "medium" }),
    }));
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody).toMatchObject({ id: "task-1777723200000", title: "New task" });

    const updated = await route.PUT(new NextRequest("http://localhost/api/tasks", {
      method: "PUT",
      body: JSON.stringify({ id: createdBody.id, status: "done", priority: "high" }),
    }));
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({ id: createdBody.id, status: "done", priority: "high" });

    const deleted = await route.DELETE(new NextRequest(`http://localhost/api/tasks?id=${createdBody.id}`, { method: "DELETE" }));
    expect(deleted.status).toBe(200);

    const persisted = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "tasks.json"), "utf-8"));
    expect(persisted.tasks).toEqual([]);
  });

  it("does not persist updates for gilfoyle-todo source tasks", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({ tasks: [] }));
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const response = await route.PUT(new NextRequest("http://localhost/api/tasks", {
      method: "PUT",
      body: JSON.stringify({ id: "gilfoyle-1", source: "gilfoyle-todo.md", status: "done" }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: "gilfoyle-1", source: "gilfoyle-todo.md", updatedAt: "2026-05-02T12:00:00.000Z" });
    expect(JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "tasks.json"), "utf-8"))).toEqual({ tasks: [] });
  });
});
