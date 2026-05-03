import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "@/components/Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
}));

describe("Sidebar", () => {
  it("renders Mission Control branding and primary nav links", () => {
    render(<Sidebar />);

    expect(screen.getByText("MISSION")).toBeInTheDocument();
    expect(screen.getByText("CONTROL")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "Agents" })).toHaveAttribute("href", "/agents");
    expect(screen.getByRole("link", { name: "System" })).toHaveAttribute("href", "/system");
  });

  it("filters navigation items by search query", () => {
    render(<Sidebar searchQuery="cal" />);

    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tasks" })).not.toBeInTheDocument();
  });

  it("shows an empty result message when the search matches no items", () => {
    render(<Sidebar searchQuery="definitely-not-a-route" />);

    expect(screen.getByText("No matching navigation items")).toBeInTheDocument();
  });
});
