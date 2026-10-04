import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { type Server, type TreeNode } from "@/lib/api";
import { formatBitrate, formatPercent, type ContainerMetrics } from "@/lib/server-status";
import {
  getPrimarySessionForServer,
  isSessionAlive,
  type ServerSession,
} from "@/lib/sessions";
import { formatPollIntervalLabel } from "@/lib/status-widget-config";
import { useSessionStatus } from "@/lib/use-session-status";
import { cn } from "@/lib/utils";

export interface ContainerStatusWidgetProps {
  activeServerId: string | null;
  activeSessionId: string | null;
  sessions: Record<string, ServerSession>;
  tree: TreeNode[];
  pollIntervalMs: number;
}

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

function containerStateClass(state: string): string {
  switch (state) {
    case "running":
      return "bg-[var(--color-success)]";
    case "restarting":
      return "bg-[var(--color-warning)] animate-pulse";
    case "paused":
      return "bg-[var(--color-warning)]";
    case "dead":
    case "exited":
      return "bg-[var(--color-muted-foreground)]";
    default:
      return "bg-[var(--color-muted-foreground)]/60";
  }
}

function containerStateLabel(
  state: string,
  t: (key: string) => string,
): string {
  const key = `container.state.${state}`;
  const translated = t(key);
  return translated === key ? state : translated;
}

function ContainerRow({
  container,
  t,
}: {
  container: ContainerMetrics;
  t: (key: string) => string;
}) {
  return (
    <tr className="border-b border-[var(--color-border)]/60 last:border-b-0">
      <td className="px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              containerStateClass(container.state),
            )}
            title={containerStateLabel(container.state, t)}
          />
          <span className="truncate font-medium" title={container.name}>
            {container.name}
          </span>
        </div>
      </td>
      <td
        className="max-w-0 truncate px-2 py-1.5 text-[var(--color-muted-foreground)]"
        title={container.image}
      >
        {container.image}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {container.cpuPercent !== null
          ? formatPercent(container.cpuPercent)
          : "-"}
      </td>
      <td
        className="max-w-0 truncate px-2 py-1.5 text-right tabular-nums text-[var(--color-muted-foreground)]"
        title={`↓ ${formatBitrate(container.netRxRate)} · ↑ ${formatBitrate(container.netTxRate)}`}
      >
        {container.netRxRate !== null && container.netTxRate !== null ? (
          <>
            ↓ {formatBitrate(container.netRxRate)}
            <br />↑ {formatBitrate(container.netTxRate)}
          </>
        ) : (
          "-"
        )}
      </td>
      <td
        className="max-w-0 truncate px-2 py-1.5 text-[var(--color-muted-foreground)]"
        title={container.status}
      >
        {container.status}
      </td>
      <td className="px-2 py-1.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
        {container.id.slice(0, 12)}
      </td>
    </tr>
  );
}

export function ContainerStatusWidget({
  activeServerId,
  activeSessionId,
  sessions,
  tree,
  pollIntervalMs,
}: ContainerStatusWidgetProps) {
  const t = useT();
  const session = activeServerId
    ? getPrimarySessionForServer(sessions, activeServerId, activeSessionId)
    : null;
  const server = activeServerId ? findServer(tree, activeServerId) : null;
  const { metrics, updatedAt, error, loading, refresh } = useSessionStatus({
    session,
    pollIntervalMs,
  });

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-[var(--color-muted-foreground)]">
        {t("container.selectServer")}
      </div>
    );
  }

  const containers = metrics?.containers ?? [];
  const hasContainers = containers.length > 0;

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
          {hasContainers && (
            <div className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
              {t("container.count", { count: containers.length })}
            </div>
          )}
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
          {t("container.connectFirst")}
        </div>
      )}

      {isSessionAlive(session.status) && error && (
        <div className="alert-destructive px-3 py-2 text-xs">{error}</div>
      )}

      {isSessionAlive(session.status) && hasContainers && (
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <table className="w-full min-w-[520px] table-fixed text-[11px]">
            <thead className="sticky top-0 bg-[var(--color-card)] text-[var(--color-muted-foreground)]">
              <tr className="border-b border-[var(--color-border)]">
                <th className="w-[26%] px-2 py-1.5 text-left font-medium">
                  {t("container.name")}
                </th>
                <th className="w-[20%] px-2 py-1.5 text-left font-medium">
                  {t("container.image")}
                </th>
                <th className="w-[9%] px-2 py-1.5 text-right font-medium">
                  {t("container.cpu")}
                </th>
                <th className="w-[15%] px-2 py-1.5 text-right font-medium">
                  {t("container.network")}
                </th>
                <th className="w-[18%] px-2 py-1.5 text-left font-medium">
                  {t("container.status")}
                </th>
                <th className="w-[12%] px-2 py-1.5 text-left font-medium">
                  {t("container.id")}
                </th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <ContainerRow
                  key={container.id}
                  container={container}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isSessionAlive(session.status) &&
        metrics &&
        !hasContainers &&
        !error && (
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-muted-foreground)]">
            {metrics.dockerAvailable
              ? t("container.empty")
              : t("container.unavailable")}
          </div>
        )}

      {isSessionAlive(session.status) && loading && !metrics && !error && (
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
