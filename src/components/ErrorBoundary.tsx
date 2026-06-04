import { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/services/api";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const errMsg = err?.message || "Unknown error";
      const apiHint =
        /fetch|network|route not found|VITE_API|api/i.test(errMsg) ||
        /failed to load/i.test(errMsg);
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-lg">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-2">
              This page failed to load. The app may be unable to reach the LMS API backend.
            </p>
            {errMsg && (
              <p className="text-xs text-muted-foreground mb-3 font-mono break-all bg-muted/50 rounded-md p-2">
                {errMsg}
              </p>
            )}
            {apiHint && (
              <p className="text-xs text-muted-foreground mb-4">
                Expected API base: <span className="font-mono">{API_BASE_URL}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh page
              </Button>
              <Button asChild variant="secondary">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">Home</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = ErrorBoundaryClass;
