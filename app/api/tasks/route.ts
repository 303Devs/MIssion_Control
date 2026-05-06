import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const TASKS_FILE = path.join(process.cwd(), "data", "tasks.json");
const GILFOYLE_TODO = path.join(OPENCLAW_WORKSPACE, "gilfoyle-todo.md");
const ALLOWED_STATUSES = ["backlog", "in-progress", "review", "done"] as const;
const ALLOWED_PRIORITIES = ["low", "medium", "high", "critical"] as const;

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "backlog" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  project?: string;
  assignee?: string;
  tags?: string[];
  source?: string;
  persisted?: boolean;
  origin?: "user-created" | "derived" | "imported";
  createdAt: string;
  updatedAt: string;
}

function readTasks(): { tasks: Task[] } {
  try {
    const raw = fs.readFileSync(TASKS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { tasks: [] };
  }
}

function writeTasks(data: { tasks: Task[] }) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Parse gilfoyle-todo.md into Task objects.
 * ## Priority items → in-progress
 * ## Backlog items → backlog
 */
function parseGilfoyleTodo(): Task[] {
  try {
    if (!fs.existsSync(GILFOYLE_TODO)) return [];
    const content = fs.readFileSync(GILFOYLE_TODO, "utf-8");
    const tasks: Task[] = [];

    const sections = content.split(/^##\s+/m).filter(Boolean);
    for (const section of sections) {
      const lines = section.split("\n");
      const heading = lines[0].trim().toLowerCase();

      let status: Task["status"];
      let priority: Task["priority"];

      if (heading.includes("priority")) {
        status = "in-progress";
        priority = "high";
      } else if (heading.includes("backlog")) {
        status = "backlog";
        priority = "medium";
      } else {
        continue;
      }

      for (const line of lines.slice(1)) {
        // Numbered: "1. **Title** — description"
        const numberedMatch = line.match(/^\d+\.\s+\*\*([^*]+)\*\*\s*(?:[-—]+\s*(.+))?/);
        if (numberedMatch) {
          const title = numberedMatch[1].trim();
          const description = numberedMatch[2]?.trim();
          const id = `gilfoyle-todo-${Buffer.from(title).toString("base64").slice(0, 16)}`;
          tasks.push({
            id,
            title,
            description,
            status,
            priority,
            assignee: "Gilfoyle",
            tags: ["gilfoyle-todo"],
            source: "gilfoyle-todo.md",
            persisted: false,
            origin: "derived",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          continue;
        }

        // Bullet: "- Title: description" or "- **Title** description"
        const bulletMatch = line.match(/^[-*]\s+\*{0,2}([^*:]+)\*{0,2}(?:[:\s]+(.+))?/);
        if (bulletMatch) {
          const title = bulletMatch[1].trim();
          if (!title || title.startsWith("#")) continue;
          const description = bulletMatch[2]?.trim();
          const id = `gilfoyle-todo-${Buffer.from(title).toString("base64").slice(0, 16)}`;
          tasks.push({
            id,
            title,
            description,
            status,
            priority,
            assignee: "Gilfoyle",
            tags: ["gilfoyle-todo"],
            source: "gilfoyle-todo.md",
            persisted: false,
            origin: "derived",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return tasks;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const staticData = readTasks();
    const gilfoyleTasks = parseGilfoyleTodo();

    // Merge: clint-todo tasks first, then static tasks that aren't clint-todo
    const gilfoyleIds = new Set(gilfoyleTasks.map((t) => t.id));
    const staticOnly = staticData.tasks.filter((t) => !gilfoyleIds.has(t.id) && t.source !== "gilfoyle-todo.md");

    const persistedTasks = staticOnly.map((task) => ({
      ...task,
      source: task.source || "mission-control-task-record",
      persisted: task.persisted ?? true,
      origin: task.origin || "user-created",
    }));

    const merged = [...gilfoyleTasks, ...persistedTasks];
    return NextResponse.json({ tasks: merged });
  } catch {
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.title === undefined) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (typeof body.title !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    }
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "title must be non-empty after trim" }, { status: 400 });
    }
    if (body.status !== undefined && !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "status must be one of: backlog, in-progress, review, done" }, { status: 400 });
    }
    if (body.priority !== undefined && !ALLOWED_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: "priority must be one of: low, medium, high, critical" }, { status: 400 });
    }

    const data = readTasks();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      ...body,
      title,
      status: body.status || "backlog",
      priority: body.priority || "medium",
      source: "mission-control-task-record",
      persisted: true,
      origin: "user-created",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.tasks.push(newTask);
    writeTasks(data);
    return NextResponse.json({ ...newTask, task: newTask, persisted: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    // Don't persist gilfoyle-todo.md tasks back to the JSON file
    if (body.source === "gilfoyle-todo.md") {
      return NextResponse.json({ ...body, updatedAt: new Date().toISOString() });
    }
    const data = readTasks();
    const idx = data.tasks.findIndex((t: Task) => t.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    data.tasks[idx] = { ...data.tasks[idx], ...body, updatedAt: new Date().toISOString() };
    writeTasks(data);
    return NextResponse.json(data.tasks[idx]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const data = readTasks();
    data.tasks = data.tasks.filter((t: Task) => t.id !== id);
    writeTasks(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
