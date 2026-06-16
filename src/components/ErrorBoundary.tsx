import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="w-full max-w-md rounded-lg border border-rose-500/50 bg-rose-500/5 p-6 shadow-2xl">
            <h1 className="mb-4 text-xl font-bold text-rose-400">Application Error</h1>
            <p className="mb-6 text-sm text-slate-400 leading-relaxed">
              The workstation encountered a runtime crash. This is often caused by invalid data or a charting engine failure.
            </p>
            <div className="mb-6 overflow-auto rounded bg-slate-900 p-4 font-mono text-xs text-rose-300 max-h-40">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-500"
            >
              Reload Workstation
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
