import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ApprovalsPage from "@/app/approvals/page";

describe("Approvals truthfulness", () => {
  it("does not imply autonomous/running approval state when no approval record exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ approvals: [] })));

    render(<ApprovalsPage />);

    expect(await screen.findByText("No pending approvals"));
    expect(screen.getByText("No approval records match this filter."));
    expect(screen.queryByText(/agents are running autonomously/i)).not.toBeInTheDocument();
  });

  it("reflects pending approval state only for an actual approval record", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/approvals" && init?.method === "PUT") {
        return Response.json({ approval: { id: "approval-1", status: "approved", resolvedAt: 1778050800000 } });
      }
      return Response.json({
        approvals: [{
          id: "approval-1",
          timestamp: 1778050800000,
          agentId: "gilfoyle",
          agentName: "Gilfoyle",
          action: "Run shell command",
          description: "Needs human sign-off",
          risk: "high",
          status: "pending",
        }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApprovalsPage />);

    expect(await screen.findByText("Run shell command")).toBeInTheDocument();
    expect(screen.getByText("Pending approval record"));

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(await screen.findByText("Approval record approved")).toBeInTheDocument();
  });

  it("does not show success or mutate local approval state when approval resolution fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/approvals" && init?.method === "PUT") {
        return Response.json({ error: "write failed" }, { status: 500 });
      }
      return Response.json({
        approvals: [{
          id: "approval-fail",
          timestamp: 1778050800000,
          agentId: "gilfoyle",
          agentName: "Gilfoyle",
          action: "Risky command",
          description: "Needs human sign-off",
          risk: "high",
          status: "pending",
        }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApprovalsPage />);

    expect(await screen.findByText("Risky command")).toBeInTheDocument();
    expect(screen.getByText("Pending approval record")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    expect(await screen.findByText("Approval resolution failed: write failed")).toBeInTheDocument();
    expect(screen.queryByText("Approval record approved")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Pending approval record")).toBeInTheDocument();
    });
  });
});
