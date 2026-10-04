import { useState } from "react";
import {
  LayoutGrid,
  Move,
  Scaling,
  Upload,
  MousePointerClick,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

const INTRO_STEPS = [
  { id: "addWidget", icon: LayoutGrid },
  { id: "dragLayout", icon: Move },
  { id: "resize", icon: Scaling },
  { id: "fileUpload", icon: Upload },
  { id: "contextMenu", icon: MousePointerClick },
] as const satisfies ReadonlyArray<{
  id: "addWidget" | "dragLayout" | "resize" | "fileUpload" | "contextMenu";
  icon: LucideIcon;
}>;

const TOTAL_STEPS = INTRO_STEPS.length + 1;

async function setupAccount(input: {
  username: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  const response = await fetch("/api/v1/onboarding/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Setup failed (${response.status})`);
  }
}

export function OnboardingPage() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAccountStep = step === INTRO_STEPS.length;
  const introStep = !isAccountStep ? INTRO_STEPS[step] : null;
  const StepIcon = introStep?.icon ?? Shield;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("onboarding.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await setupAccount({ username, password, confirmPassword });
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("onboarding.setupFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg border border-[var(--color-border)]">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t("onboarding.stepOf", {
                current: step + 1,
                total: TOTAL_STEPS,
              })}
            </p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === step
                      ? "w-5 bg-[var(--color-primary)]"
                      : "w-1.5 bg-[var(--color-border)]",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--color-secondary)] text-[var(--color-primary)]">
              <StepIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg">
                {isAccountStep
                  ? t("onboarding.steps.account.title")
                  : t(`onboarding.steps.${introStep!.id}.title`)}
              </CardTitle>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {isAccountStep
                  ? t("onboarding.steps.account.description")
                  : t(`onboarding.steps.${introStep!.id}.description`)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isAccountStep ? (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="onboarding-username">
                  {t("onboarding.username")}
                </Label>
                <Input
                  id="onboarding-username"
                  autoComplete="username"
                  value={username}
                  required
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="onboarding-password">
                  {t("onboarding.password")}
                </Label>
                <Input
                  id="onboarding-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  required
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="onboarding-confirm-password">
                  {t("onboarding.confirmPassword")}
                </Label>
                <Input
                  id="onboarding-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  required
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-destructive)]">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(step - 1)}
                >
                  {t("onboarding.back")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? t("onboarding.submitting")
                    : t("onboarding.submit")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                {t("onboarding.back")}
              </Button>
              <Button type="button" onClick={() => setStep(step + 1)}>
                {step === INTRO_STEPS.length - 1
                  ? t("onboarding.continueToSetup")
                  : t("onboarding.next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
