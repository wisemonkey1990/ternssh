import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n";
import {
  DEFAULT_PROCESS_LIMIT,
  MAX_PROCESS_LIMIT,
  MIN_PROCESS_LIMIT,
  parseProcessWidgetConfig,
  serializeProcessWidgetConfig,
} from "@/lib/status-widget-config";

interface ProcessSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configJson: string | null;
  onSaved: (configJson: string) => void;
}

export function ProcessSettingsDialog({
  open,
  onOpenChange,
  configJson,
  onSaved,
}: ProcessSettingsDialogProps) {
  const t = useT();
  const [processLimit, setProcessLimit] = useState(String(DEFAULT_PROCESS_LIMIT));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const current = parseProcessWidgetConfig(configJson);
    setProcessLimit(String(current.processLimit));
    setError(null);
  }, [open, configJson]);

  if (!open) return null;

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const limitValue = Number(processLimit);
    if (!Number.isFinite(limitValue) || limitValue <= 0) {
      setError(t("process.processLimitInvalid"));
      return;
    }
    if (limitValue < MIN_PROCESS_LIMIT) {
      setError(t("process.processLimitTooSmall", { min: MIN_PROCESS_LIMIT }));
      return;
    }
    if (limitValue > MAX_PROCESS_LIMIT) {
      setError(t("process.processLimitTooLarge", { max: MAX_PROCESS_LIMIT }));
      return;
    }

    onSaved(
      serializeProcessWidgetConfig({
        processLimit: Math.round(limitValue),
      }),
    );
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("process.settingsTitle")}</h2>
        <Button variant="ghost" onClick={handleClose}>
          {t("common.close")}
        </Button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="processLimit">{t("process.processLimit")}</Label>
          <Input
            id="processLimit"
            inputMode="numeric"
            min={MIN_PROCESS_LIMIT}
            max={MAX_PROCESS_LIMIT}
            required
            step={1}
            type="number"
            value={processLimit}
            onChange={(event) => setProcessLimit(event.target.value)}
          />
          <p className="text-[11px] text-[var(--color-muted-foreground)]">
            {t("process.processLimitHelp", {
              min: MIN_PROCESS_LIMIT,
              max: MAX_PROCESS_LIMIT,
            })}
          </p>
        </div>

        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">{t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
