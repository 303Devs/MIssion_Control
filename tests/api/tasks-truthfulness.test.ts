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

describe("tasks API truthfulness semantics", () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T06:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.chdir(originalCwd);
    process.env = originalEnv;
  });

  it("POST returns a verifiable persisted user-created task record", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({ tasks: [] }));
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const response = await route.POST(new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Persist me", priority: "medium" }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      task: {
        id: "task-1778049000000",
        title: "Persist me",
        status: "backlog",
        priority: "medium",
        persisted: true,
        origin: "user-created",
        source: "mission-control-task-record",
      },
      persisted: true,
    });

    const persisted = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "tasks.json"), "utf-8"));
    expect(persisted.tasks).toEqual([
      expect.objectContaining({ title: "Persist me", persisted: true, origin: "user-created" }),
    ]);
  });

  it("POST rejects an empty title without persisting a task", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({ tasks: [] }));
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const response = await route.POST(new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "   ", priority: "medium" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "title must be non-empty after trim" });
    const persisted = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "tasks.json"), "utf-8"));
    expect(persisted.tasks).toEqual([]);
  });

  it("POST rejects invalid status and priority values", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({ tasks: [] }));
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const badStatus = await route.POST(new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Invalid", status: "running" }),
    }));
    expect(badStatus.status).toBe(400);
    await expect(badStatus.json()).resolves.toEqual({ error: "status must be one of: backlog, in-progress, review, done" });

    const badPriority = await route.POST(new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Invalid", priority: "urgent" }),
    }));
    expect(badPriority.status).toBe(400);
    await expect(badPriority.json()).resolves.toEqual({ error: "priority must be one of: low, medium, high, critical" });

    const persistedAfterInvalidPayloads = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "tasks.json"), "utf-8"));
    expect(persistedAfterInvalidPayloads.tasks).toEqual([]);
  });

  it("GET marks imported todo tasks as derived, non-persisted records", async () => {
    const projectRoot = makeTempDir("mc-project-");
    const workspaceRoot = path.join(makeTempDir("mc-openclaw-"), "workspace");
    writeFile(path.join(projectRoot, "data", "tasks.json"), JSON.stringify({ tasks: [] }));
    writeFile(path.join(workspaceRoot, "gilfoyle-todo.md"), "## Priority items\n1. **Imported task** — from markdown");
    const route = await loadTasksRoute(projectRoot, workspaceRoot);

    const response = await route.GET();
    const body = await response.json();

    expect(body.tasks).toEqual([
      expect.objectContaining({
        title: "Imported task",
        persisted: false,
        origin: "derived",
        source: "gilfoyle-todo.md",
      }),
    ]);
  });
});
