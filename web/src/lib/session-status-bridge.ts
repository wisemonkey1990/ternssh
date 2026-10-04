import {
  DEFAULT_PROCESS_LIMIT,
} from "@/lib/status-widget-config";
import type { SessionStatusResponse } from "@/lib/server-status";

export interface StatusSubscriptionOptions {
  pollIntervalMs: number;
  processLimit?: number;
}

interface StatusSubscription {
  options: StatusSubscriptionOptions;
  onUpdate: (update: SessionStatusResponse) => void;
  onError?: (message: string) => void;
}

interface StatusTransport {
  send: (payload: string) => void;
  isOpen: () => boolean;
}

const transports = new Map<string, StatusTransport>();
const subscriptionsBySession = new Map<
  string,
  Map<string, StatusSubscription>
>();

function getSessionSubscriptions(sessionId: string): Map<string, StatusSubscription> {
  let subscriptions = subscriptionsBySession.get(sessionId);
  if (!subscriptions) {
    subscriptions = new Map();
    subscriptionsBySession.set(sessionId, subscriptions);
  }
  return subscriptions;
}

function syncSessionSubscriptions(sessionId: string): void {
  const transport = transports.get(sessionId);
  if (!transport?.isOpen()) return;

  const subscriptions = subscriptionsBySession.get(sessionId);
  if (!subscriptions || subscriptions.size === 0) return;

  for (const [subscriptionId, subscription] of subscriptions) {
    transport.send(
      JSON.stringify({
        type: "status_subscribe",
        id: subscriptionId,
        pollIntervalMs: subscription.options.pollIntervalMs,
        processLimit: subscription.options.processLimit ?? DEFAULT_PROCESS_LIMIT,
      }),
    );
  }
}

export function registerSessionStatusTransport(
  sessionId: string,
  send: (payload: string) => void,
  isOpen: () => boolean,
): () => void {
  transports.set(sessionId, { send, isOpen });
  syncSessionSubscriptions(sessionId);

  return () => {
    const transport = transports.get(sessionId);
    if (transport?.send === send) {
      transports.delete(sessionId);
    }
  };
}

export function subscribeSessionStatus(
  sessionId: string,
  subscriptionId: string,
  options: StatusSubscriptionOptions,
  callbacks: {
    onUpdate: (update: SessionStatusResponse) => void;
    onError?: (message: string) => void;
  },
): () => void {
  const subscriptions = getSessionSubscriptions(sessionId);
  subscriptions.set(subscriptionId, {
    options,
    onUpdate: callbacks.onUpdate,
    onError: callbacks.onError,
  });

  const transport = transports.get(sessionId);
  if (transport?.isOpen()) {
    transport.send(
      JSON.stringify({
        type: "status_subscribe",
        id: subscriptionId,
        pollIntervalMs: options.pollIntervalMs,
        processLimit: options.processLimit ?? DEFAULT_PROCESS_LIMIT,
      }),
    );
  }

  return () => {
    const current = subscriptionsBySession.get(sessionId);
    current?.delete(subscriptionId);
    if (current && current.size === 0) {
      subscriptionsBySession.delete(sessionId);
    }

    const transport = transports.get(sessionId);
    if (transport?.isOpen()) {
      transport.send(
        JSON.stringify({
          type: "status_unsubscribe",
          id: subscriptionId,
        }),
      );
    }
  };
}

export function requestSessionStatusRefresh(sessionId: string): void {
  const transport = transports.get(sessionId);
  if (!transport?.isOpen()) return;

  transport.send(JSON.stringify({ type: "status_refresh" }));
}

export function dispatchSessionStatusMessage(
  sessionId: string,
  raw: string,
): boolean {
  let parsed: {
    type?: string;
    serverId?: string;
    collectedAt?: string;
    metrics?: SessionStatusResponse["metrics"];
    message?: string;
  };

  try {
    parsed = JSON.parse(raw) as {
      type?: string;
      serverId?: string;
      collectedAt?: string;
      metrics?: SessionStatusResponse["metrics"];
      message?: string;
    };
  } catch {
    return false;
  }

  if (parsed.type === "metrics_error") {
    const message = parsed.message ?? "Status collection failed";
    const subscriptions = subscriptionsBySession.get(sessionId);
    if (!subscriptions || subscriptions.size === 0) return true;
    for (const subscription of subscriptions.values()) {
      subscription.onError?.(message);
    }
    return true;
  }

  if (
    parsed.type !== "metrics" ||
    !parsed.serverId ||
    !parsed.collectedAt ||
    !parsed.metrics
  ) {
    return false;
  }

  const update: SessionStatusResponse = {
    serverId: parsed.serverId,
    collectedAt: parsed.collectedAt,
    metrics: parsed.metrics,
  };

  const subscriptions = subscriptionsBySession.get(sessionId);
  if (!subscriptions || subscriptions.size === 0) return true;
  for (const subscription of subscriptions.values()) {
    subscription.onUpdate(update);
  }
  return true;
}
