"use client";

import { Component, type ReactNode } from "react";

/** Swaps a WebGL scene for static fallback art if it throws (lost context, driver bugs, OOM). */
export class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode; name?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`[${this.props.name ?? "3d"}] scene failed, showing static art`, error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
