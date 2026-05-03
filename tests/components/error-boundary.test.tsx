import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/components/ErrorBoundary";

function BrokenChild() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary label="Docs">
        <p>Docs content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Docs content")).toBeInTheDocument();
  });

  it("renders a labeled fallback when a child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary label="Docs">
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Docs failed to render.")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
  });
});
