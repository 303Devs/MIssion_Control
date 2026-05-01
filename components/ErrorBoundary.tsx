"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`${this.props.label || "Page"} render failed`, error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="p-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <p className="font-semibold">{this.props.label || "This page"} failed to render.</p>
            <p className="mt-1 text-sm text-red-200/80">{this.state.error.message}</p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
