import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlaceholderPage from "@/components/PlaceholderPage";

describe("PlaceholderPage", () => {
  it("renders the supplied page title with Mission Control context", () => {
    render(<PlaceholderPage title="Factory" />);

    expect(screen.getByText("Mission Control")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Factory" })).toBeInTheDocument();
  });
});
