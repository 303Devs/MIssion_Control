import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TasksPage from "@/app/tasks/page";

describe("Tasks board truthfulness", () => {
  it("labels derived tasks separately from persisted user-created records", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      tasks: [
        {
          id: "derived-1",
          title: "Imported Gilfoyle task",
          status: "backlog",
          priority: "medium",
          assignee: "Gilfoyle",
          source: "gilfoyle-todo.md",
          persisted: false,
          origin: "derived",
          createdAt: "2026-05-06T06:00:00.000Z",
          updatedAt: "2026-05-06T06:00:00.000Z",
        },
        {
          id: "task-1",
          title: "User-created persisted task",
          status: "backlog",
          priority: "high",
          persisted: true,
          origin: "user-created",
          createdAt: "2026-05-06T06:01:00.000Z",
          updatedAt: "2026-05-06T06:01:00.000Z",
        },
      ],
    })));

    render(<TasksPage />);

    expect(await screen.findByText("Imported Gilfoyle task")).toBeInTheDocument();
    expect(screen.getByText("Derived from gilfoyle-todo.md")).toBeInTheDocument();
    expect(screen.getByText("User-created persisted task")).toBeInTheDocument();
    expect(screen.getByText("Persisted task record")).toBeInTheDocument();
  });

  it("shows an explicit load-error state when tasks cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "boom" }), { status: 500 })));

    render(<TasksPage />);

    expect(await screen.findByText("Task board load error")).toBeInTheDocument();
    expect(screen.getByText("Tasks could not be loaded. No task records are being shown."));
  });
});
