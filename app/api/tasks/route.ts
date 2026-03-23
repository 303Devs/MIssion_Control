import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TASKS_FILE = path.join(process.cwd(), "data", "tasks.json");
const HOME = process.env.HOME || "/Users/anthony";
const CLINT_TODO = path.join(HOME, ".openclaw/workspace/clint-todo.md");

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
 * Parse clint-todo.md into Task objects.
 * ## Priority items → in-progress
 * ## Backlog items → backlog
 */
function parseClintTodo(): Task[] {
  try {
    if (!fs.existsSync(CLINT_TODO)) return [];
    const content = fs.readFileSync(CLINT_TODO, "utf-8");
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
          const id = `clint-todo-${Buffer.from(title).toString("base64").slice(0, 16)}`;
          tasks.push({
            id,
            title,
            description,
            status,
            priority,
            assignee: "Clint",
            tags: ["clint-todo"],
            source: "clint-todo.md",
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
          const id = `clint-todo-${Buffer.from(title).toString("base64").slice(0, 16)}`;
          tasks.push({
            id,
            title,
            description,
            status,
            priority,
            assignee: "Clint",
            tags: ["clint-todo"],
            source: "clint-todo.md",
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
    const clintTasks = parseClintTodo();

    // Merge: clint-todo tasks first, then static tasks that aren't clint-todo
    const clintIds = new Set(clintTasks.map((t) => t.id));
    const staticOnly = staticData.tasks.filter((t) => !clintIds.has(t.id) && t.source !== "clint-todo.md");

    const merged = [...clintTasks, ...staticOnly];
    return NextResponse.json({ tasks: merged });
  } catch {
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = readTasks();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.tasks.push(newTask);
    writeTasks(data);
    return NextResponse.json(newTask, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    // Don't persist clint-todo.md tasks back to the JSON file
    if (body.source === "clint-todo.md") {
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
