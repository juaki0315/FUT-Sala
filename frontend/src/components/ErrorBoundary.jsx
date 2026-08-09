import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-pitch-950 px-6 text-center">
          <AlertTriangle size={32} className="text-gold-400" />
          <p className="text-sm text-floodlight-300/70">
            Algo ha ido mal. Intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-pitch-900"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
