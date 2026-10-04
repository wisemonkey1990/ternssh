import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n";
import {
  SETTINGS_RESET_EVENT,
  STATUS_POLL_INTERVAL_CHANGED_EVENT,
} from "@/lib/app-settings";
import {
  readStatusPollIntervalMs,
  writeStatusPollIntervalMs,
} from "@/lib/status-poll-interval";
import {
  BANDWIDTH_HISTORY_MS,
  getBandwidthMaxSlots,
  MAX_POLL_INTERVAL_MS,
  MIN_POLL_INTERVAL_MS,
} from "@/lib/status-widget-config";

export function StatusPollIntervalSection() {
  const t = useT();
  const [seconds, setSeconds] = useState(
    String(readStatusPollIntervalMs() / 1000),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setSeconds(String(readStatusPollIntervalMs() / 1000));
      setError(null);
    };
    sync();
    window.addEventListener(STATUS_POLL_INTERVAL_CHANGED_EVENT, sync);
    window.addEventListener(SETTINGS_RESET_EVENT, sync);
    return () => {
      window.removeEventListener(STATUS_POLL_INTERVAL_CHANGED_EVENT, sync);
      window.removeEventListener(SETTINGS_RESET_EVENT, sync);
    };
  }, []);

  const minSeconds = MIN_POLL_INTERVAL_MS / 1000;
  const maxSeconds = MAX_POLL_INTERVAL_MS / 1000;
  const historyMinutes = BANDWIDTH_HISTORY_MS / 60000;

  const commit = (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("settings.statusPollIntervalInvalid"));
      return;
    }

    const pollIntervalMs = Math.round(value * 1000);
    if (pollIntervalMs < MIN_POLL_INTERVAL_MS) {
      setError(t("settings.statusPollIntervalTooSmall", { min: minSeconds }));
      return;
    }
    if (pollIntervalMs > MAX_POLL_INTERVAL_MS) {
      setError(t("settings.statusPollIntervalTooLarge", { max: maxSeconds }));
      return;
    }

    writeStatusPollIntervalMs(pollIntervalMs);
    setSeconds(String(pollIntervalMs / 1000));
    setError(null);
  };

  const previewMs = Number(seconds) > 0 ? Math.round(Number(seconds) * 1000) : 0;
  const previewSlots =
    previewMs >= MIN_POLL_INTERVAL_MS && previewMs <= MAX_POLL_INTERVAL_MS
      ? getBandwidthMaxSlots(previewMs)
      : null;

  return (
    <div className="grid gap-2">
      <Label htmlFor="globalStatusPollInterval">
        {t("settings.statusPollInterval")}
      </Label>
      <Input
        id="globalStatusPollInterval"
        inputMode="decimal"
        min={minSeconds}
        max={maxSeconds}
        step={1}
        type="number"
        value={seconds}
        onBlur={() => commit(seconds)}
        onChange={(event) => {
          setSeconds(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(seconds);
          }
        }}
      />
      <p className="text-[11px] text-[var(--color-muted-foreground)]">
        {t("settings.statusPollIntervalHint", {
          min: minSeconds,
          max: maxSeconds,
          minutes: historyMinutes,
          slots:
            previewSlots !== null
              ? t("settings.statusPollSlots", { count: previewSlots })
              : "",
        })}
      </p>
      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
    </div>
  );
}
