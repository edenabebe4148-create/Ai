import React from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
    window.location.reload();
  };

  private handleCopy = () => {
    if (!this.state.error) return;
    const errorText = `Error: ${this.state.error.message}\n\nStack Trace:\n${this.state.error.stack || ""}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl flex-shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white font-display">
                  Something went wrong
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  An unexpected error was encountered during execution. The app has been suspended to prevent data corruption.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/60">
                  <span className="text-xs font-bold text-red-400 font-mono">
                    RUNTIME_EXCEPTION
                  </span>
                  <button
                    onClick={this.handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Error
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-all">
                  {this.state.error.toString()}
                  {this.state.error.stack && (
                    <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800/40 pt-2">
                      {this.state.error.stack}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-5 flex items-center justify-center gap-2 text-sm font-bold text-white bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] rounded-2xl transition-colors cursor-pointer shadow-lg shadow-[#FF4D4D]/10"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    window.location.reload();
                  } catch (e) {}
                }}
                className="py-3 px-5 text-sm font-bold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800/40 border border-slate-800 rounded-2xl transition-colors cursor-pointer"
              >
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
