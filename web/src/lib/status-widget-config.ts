export const DEFAULT_POLL_INTERVAL_MS = 5000;
export const MIN_POLL_INTERVAL_MS = 3000;
export const MAX_POLL_INTERVAL_MS = 60000;
export const BANDWIDTH_HISTORY_MS = 10 * 60 * 1000;
export const DEFAULT_PROCESS_LIMIT = 10;
export const MIN_PROCESS_LIMIT = 1;
export const MAX_PROCESS_LIMIT = 50;

export interface ProcessWidgetConfig {
  processLimit: number;
}

const DEFAULT_PROCESS_CONFIG: ProcessWidgetConfig = {
  processLimit: DEFAULT_PROCESS_LIMIT,
};

export function clampPollIntervalMs(value: number): number {
  return Math.min(
    MAX_POLL_INTERVAL_MS,
    Math.max(MIN_POLL_INTERVAL_MS, Math.round(value)),
  );
}

function clampProcessLimit(value: number): number {
  return Math.min(
    MAX_PROCESS_LIMIT,
    Math.max(MIN_PROCESS_LIMIT, Math.round(value)),
  );
}

export function parseProcessWidgetConfig(
  configJson: string | null | undefined,
): ProcessWidgetConfig {
  if (!configJson) return DEFAULT_PROCESS_CONFIG;
  try {
    const parsed = JSON.parse(configJson) as Partial<ProcessWidgetConfig>;
    const processLimit =
      typeof parsed.processLimit === "number"
        ? clampProcessLimit(parsed.processLimit)
        : DEFAULT_PROCESS_LIMIT;
    return { processLimit };
  } catch {
    return DEFAULT_PROCESS_CONFIG;
  }
}

export function serializeProcessWidgetConfig(
  config: ProcessWidgetConfig,
): string {
  return JSON.stringify({
    processLimit: clampProcessLimit(config.processLimit),
  });
}

export function getBandwidthMaxSlots(pollIntervalMs: number): number {
  return Math.max(1, Math.floor(BANDWIDTH_HISTORY_MS / pollIntervalMs));
}

export function formatPollIntervalLabel(
  pollIntervalMs: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const count =
    pollIntervalMs % 1000 === 0
      ? pollIntervalMs / 1000
      : Number((pollIntervalMs / 1000).toFixed(1));
  return t("common.seconds", { count });
}
