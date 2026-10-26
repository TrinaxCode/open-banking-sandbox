"use client";

import { useState } from "react";
import { changePassword } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/ui/LanguageSwitcher";

export function PasswordForm() {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const formData = new FormData(form);
    const result = await changePassword(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
    form.reset();
  }

  return (
    <div className="glass-card p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="animate-slide-down rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
            {error}
          </div>
        )}
        {success && (
          <div className="animate-slide-down rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-premium-green">
            {t("profile.passwordChangedSuccess")}
          </div>
        )}

        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          label={t("profile.currentPassword")}
          placeholder={t("profile.currentPasswordPlaceholder")}
          required
        />

        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          label={t("profile.newPassword")}
          placeholder={t("profile.newPasswordPlaceholder")}
          required
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label={t("profile.confirmPassword")}
          placeholder={t("profile.confirmPasswordPlaceholder")}
          required
        />

        <Button type="submit" isLoading={isLoading}>
          {t("profile.changePasswordBtn")}
        </Button>
      </form>
    </div>
  );
}
