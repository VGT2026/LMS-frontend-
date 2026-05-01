import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-2">
              This page failed to load. Please try refreshing or navigating back.
            </p>
            {import.meta.env.DEV && errMsg && (
              <p className="text-xs text-muted-foreground mb-4 font-mono break-all">{errMsg}</p>
            )}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = ErrorBoundaryClass;
