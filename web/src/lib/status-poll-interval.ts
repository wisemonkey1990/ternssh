import { useEffect, useState } from "react";
import {
  SETTINGS_RESET_EVENT,
  STATUS_POLL_INTERVAL_CHANGED_EVENT,
  STATUS_POLL_INTERVAL_STORAGE_KEY,
} from "@/lib/app-settings";
import {
  clampPollIntervalMs,
  DEFAULT_POLL_INTERVAL_MS,
} from "@/lib/status-widget-config";

export function readStatusPollIntervalMs(): number {
  try {
    const raw = localStorage.getItem(STATUS_POLL_INTERVAL_STORAGE_KEY);
    if (!raw) return DEFAULT_POLL_INTERVAL_MS;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_POLL_INTERVAL_MS;
    return clampPollIntervalMs(parsed);
  } catch {
    return DEFAULT_POLL_INTERVAL_MS;
  }
}

export function writeStatusPollIntervalMs(value: number): number {
  const clamped = clampPollIntervalMs(value);
  localStorage.setItem(STATUS_POLL_INTERVAL_STORAGE_KEY, String(clamped));
  window.dispatchEvent(new CustomEvent(STATUS_POLL_INTERVAL_CHANGED_EVENT));
  return clamped;
}

export function useStatusPollInterval(): number {
  const [pollIntervalMs, setPollIntervalMs] = useState(readStatusPollIntervalMs);

  useEffect(() => {
    const sync = () => setPollIntervalMs(readStatusPollIntervalMs());
    window.addEventListener(STATUS_POLL_INTERVAL_CHANGED_EVENT, sync);
    window.addEventListener(SETTINGS_RESET_EVENT, sync);
    return () => {
      window.removeEventListener(STATUS_POLL_INTERVAL_CHANGED_EVENT, sync);
      window.removeEventListener(SETTINGS_RESET_EVENT, sync);
    };
  }, []);

  return pollIntervalMs;
}
