import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { API_BASE_URL, probeApiConnection } from "@/services/api";

export function ApiStatusBanner() {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await probeApiConnection();
      if (!cancelled && !result.ok) {
        setWarning(result.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!warning) return null;

  return (
    <div
      role="alert"
      className="mx-4 mt-4 mb-0 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex gap-3 items-start"
    >
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-destructive">Backend not connected</p>
        <p className="text-muted-foreground mt-0.5">{warning}</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
          API: {API_BASE_URL}
        </p>
      </div>
    </div>
  );
}
