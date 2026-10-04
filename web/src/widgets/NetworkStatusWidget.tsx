import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { type Server, type TreeNode } from "@/lib/api";
import {
  type NetInterfaceMetrics,
} from "@/lib/server-status";
import {
  getPrimarySessionForServer,
  isSessionAlive,
  type ServerSession,
} from "@/lib/sessions";
import {
  BANDWIDTH_HISTORY_MS,
  formatPollIntervalLabel,
  getBandwidthMaxSlots,
} from "@/lib/status-widget-config";
import { useSessionStatus } from "@/lib/use-session-status";
import { cn } from "@/lib/utils";
import {
  NetworkBandwidthChart,
  type BandwidthSample,
} from "@/widgets/NetworkBandwidthChart";

export interface NetworkStatusWidgetProps {
  activeServerId: string | null;
  activeSessionId: string | null;
  sessions: Record<string, ServerSession>;
  tree: TreeNode[];
  pollIntervalMs: number;
}

const TOTAL_INTERFACE_KEY = "__total__";

function findServer(tree: TreeNode[], serverId: string): Server | null {
  for (const node of tree) {
    if (node.type === "server" && node.id === serverId) {
      return node;
    }
    if (node.type === "group") {
      const found = findServer(node.children, serverId);
      if (found) return found;
    }
  }
  return null;
}

function trimBandwidthHistory(
  samples: BandwidthSample[],
  now: number,
): BandwidthSample[] {
  const cutoff = now - BANDWIDTH_HISTORY_MS;
  return samples.filter((sample) => sample.at >= cutoff);
}

function appendHistorySample(
  current: BandwidthSample[],
  sample: BandwidthSample,
): BandwidthSample[] {
  return trimBandwidthHistory([...current, sample], sample.at);
}

function interfaceKeys(interfaces: NetInterfaceMetrics[]): string[] {
  return [
    TOTAL_INTERFACE_KEY,
    ...interfaces.map((iface) => iface.name),
  ];
}

export function NetworkStatusWidget({
  activeServerId,
  activeSessionId,
  sessions,
  tree,
  pollIntervalMs,
}: NetworkStatusWidgetProps) {
  const t = useT();
  const session = activeServerId
    ? getPrimarySessionForServer(sessions, activeServerId, activeSessionId)
    : null;
  const server = activeServerId ? findServer(tree, activeServerId) : null;
  const { metrics, updatedAt, error, loading, refresh } = useSessionStatus({
    session,
    pollIntervalMs,
  });
  const [histories, setHistories] = useState<Record<string, BandwidthSample[]>>(
    {},
  );
  const [selectedInterface, setSelectedInterface] = useState(
    TOTAL_INTERFACE_KEY,
  );
  const maxBandwidthSlots = getBandwidthMaxSlots(pollIntervalMs);

  useEffect(() => {
    setHistories({});
    setSelectedInterface(TOTAL_INTERFACE_KEY);
  }, [session?.sessionId, pollIntervalMs]);

  useEffect(() => {
    if (!metrics || !updatedAt) return;

    const at = Date.parse(updatedAt) || Date.now();
    setHistories((current) => {
      const next = { ...current };

      if (metrics.netRxRate !== null && metrics.netTxRate !== null) {
        next[TOTAL_INTERFACE_KEY] = appendHistorySample(
          next[TOTAL_INTERFACE_KEY] ?? [],
          {
            rx: metrics.netRxRate,
            tx: metrics.netTxRate,
            at,
          },
        );
      }

      for (const iface of metrics.netInterfaces ?? []) {
        if (iface.rxRate === null || iface.txRate === null) continue;
        next[iface.name] = appendHistorySample(next[iface.name] ?? [], {
          rx: iface.rxRate,
          tx: iface.txRate,
          at,
        });
      }

      return next;
    });
  }, [metrics, updatedAt]);

  useEffect(() => {
    const keys = interfaceKeys(metrics?.netInterfaces ?? []);
    if (!keys.includes(selectedInterface)) {
      setSelectedInterface(TOTAL_INTERFACE_KEY);
    }
  }, [metrics?.netInterfaces, selectedInterface]);

  const interfaces = metrics?.netInterfaces ?? [];
  const selectedRates =
    selectedInterface === TOTAL_INTERFACE_KEY
      ? {
          rx: metrics?.netRxRate ?? null,
          tx: metrics?.netTxRate ?? null,
        }
      : {
          rx:
            interfaces.find((iface) => iface.name === selectedInterface)
              ?.rxRate ?? null,
          tx:
            interfaces.find((iface) => iface.name === selectedInterface)
              ?.txRate ?? null,
        };
  const selectedHistory = histories[selectedInterface] ?? [];
  const hasRates = selectedRates.rx !== null && selectedRates.tx !== null;
  const showInterfacePicker = interfaces.length > 0;

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-[var(--color-muted-foreground)]">
        {t("network.selectServer")}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {server?.name ?? t("common.unknownServer")}
          </div>
          <div className="truncate text-[11px] text-[var(--color-muted-foreground)]">
            {server ? `${server.username}@${server.host}:${server.port}` : "-"}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            {t("status.sessionStatus", {
              label: t("session.label"),
              status: t(`session.${session.status}`),
            })}
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading || !isSessionAlive(session.status)}
          onClick={refresh}
          title={t("common.refresh")}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {!isSessionAlive(session.status) && (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-muted-foreground)]">
          {t("network.connectFirst")}
        </div>
      )}

      {isSessionAlive(session.status) && error && (
        <div className="alert-destructive px-3 py-2 text-xs">{error}</div>
      )}

      {isSessionAlive(session.status) && hasRates && (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
          {showInterfacePicker && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className={cn(
                  "rounded-sm px-2 py-1 text-[11px] transition-colors",
                  selectedInterface === TOTAL_INTERFACE_KEY
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
                onClick={() => setSelectedInterface(TOTAL_INTERFACE_KEY)}
              >
                {t("network.total")}
              </button>
              {interfaces.map((iface) => (
                <button
                  key={iface.name}
                  type="button"
                  className={cn(
                    "max-w-full truncate rounded-sm px-2 py-1 text-[11px] transition-colors",
                    selectedInterface === iface.name
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  )}
                  title={iface.name}
                  onClick={() => setSelectedInterface(iface.name)}
                >
                  {iface.name}
                </button>
              ))}
            </div>
          )}

          <NetworkBandwidthChart
            history={selectedHistory}
            interfaceLabel={
              selectedInterface === TOTAL_INTERFACE_KEY
                ? t("network.totalBandwidth")
                : selectedInterface
            }
            maxSlots={maxBandwidthSlots}
            pollIntervalMs={pollIntervalMs}
            referenceTime={updatedAt}
            rxRate={selectedRates.rx}
            txRate={selectedRates.tx}
          />
        </div>
      )}

      {isSessionAlive(session.status) && loading && !hasRates && !error && (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-muted-foreground)]">
          {t("status.collecting")}
        </div>
      )}

      <div className="border-t border-[var(--color-border)] px-3 py-1.5 text-[11px] text-[var(--color-muted-foreground)]">
        {updatedAt
          ? t("status.updatedAt", {
              time: new Date(updatedAt).toLocaleTimeString(),
              interval: formatPollIntervalLabel(pollIntervalMs, t),
            })
          : t("status.waiting", {
              interval: formatPollIntervalLabel(pollIntervalMs, t),
            })}
      </div>
    </div>
  );
}
