import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ServerStatusMetrics } from "@/lib/server-status";
import type { ServerSession } from "@/lib/sessions";
import {
  requestSessionStatusRefresh,
  subscribeSessionStatus,
  type StatusSubscriptionOptions,
} from "@/lib/session-status-bridge";

interface UseSessionStatusOptions extends StatusSubscriptionOptions {
  session: ServerSession | null | undefined;
}

export function useSessionStatus({
  session,
  pollIntervalMs,
  processLimit,
}: UseSessionStatusOptions) {
  const subscriptionId = useId();
  const mountedRef = useRef(true);
  const [metrics, setMetrics] = useState<ServerStatusMetrics | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!session || session.status !== "open") {
      setMetrics(null);
      setUpdatedAt(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    return subscribeSessionStatus(
      session.sessionId,
      subscriptionId,
      { pollIntervalMs, processLimit },
      {
        onUpdate: (update) => {
          if (!mountedRef.current) return;
          setMetrics(update.metrics);
          setUpdatedAt(update.collectedAt);
          setError(null);
          setLoading(false);
        },
        onError: (message) => {
          if (!mountedRef.current) return;
          setError(message);
          setLoading(false);
        },
      },
    );
  }, [
    pollIntervalMs,
    processLimit,
    session?.sessionId,
    session?.status,
    subscriptionId,
  ]);

  const refresh = useCallback(() => {
    if (!session || session.status !== "open") return;
    setLoading(true);
    setError(null);
    requestSessionStatusRefresh(session.sessionId);
  }, [session?.sessionId, session?.status]);

  return {
    metrics,
    updatedAt,
    error,
    loading,
    refresh,
  };
}
