import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FactoryPage from "@/app/factory/page";

const forbiddenImpliedExecutionCopy = /dispatch(?:ed|ing)?|execut(?:e|ed|ing|ion)|running/i;

describe("Factory truthfulness", () => {
  it("creates a persisted task record and uses record-creation copy, not implied execution copy", async () => {
    const createdTask = {
      id: "task-verified-1",
      title: "Truthful task",
      status: "backlog",
      priority: "medium",
      createdAt: "2026-05-06T06:30:00.000Z",
      updatedAt: "2026-05-06T06:30:00.000Z",
      persisted: true,
      origin: "user-created",
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/agents") {
        return Response.json({ agents: [{ id: "gilfoyle", name: "Gilfoyle", role: "Software implementation", status: "active" }] });
      }
      if (url === "/api/tasks" && init?.method === "POST") {
        return Response.json({ task: createdTask, persisted: true }, { status: 201 });
      }
      if (url === "/api/tasks") {
        return Response.json({ tasks: [] });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FactoryPage />);

    expect(await screen.findByRole("heading", { name: "Task Factory" })).toBeInTheDocument();
    expect(screen.getByText("Create persisted task records for the agent workforce")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create task record/i })).toBeInTheDocument();
    expect(screen.queryByText(forbiddenImpliedExecutionCopy)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Task title *"), { target: { value: "Truthful task" } });
    fireEvent.click(screen.getByRole("button", { name: /create task record/i }));

    await screen.findByText("Task record created successfully");

    const postCall = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/tasks" && init?.method === "POST");
    expect(postCall).toBeDefined();
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      title: "Truthful task",
      status: "backlog",
      priority: "medium",
    });

    await waitFor(() => {
      expect(screen.queryByText(forbiddenImpliedExecutionCopy)).not.toBeInTheDocument();
    });
  });
});
