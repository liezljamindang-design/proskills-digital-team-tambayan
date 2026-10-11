import { Component, type ReactNode } from "react";

/** Catches a crash anywhere below it and shows a way forward instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; compact?: boolean }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.compact) {
      return (
        <aside className="side-panel">
          <p className="muted">
            This panel didn't load.{" "}
            <button type="button" className="link-btn" onClick={() => this.setState({ failed: false })}>Try again</button>
          </p>
        </aside>
      );
    }
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong</h1>
        <p>The space failed to load. Reloading usually fixes it.</p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
