"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/ui/LanguageSwitcher";

interface ProfileFormProps {
  name: string;
}

export function ProfileForm({ name }: ProfileFormProps) {
  const { t } = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await updateProfile(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
    router.refresh();
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
            {t("profile.updatedSuccess")}
          </div>
        )}

        <Input
          id="name"
          name="name"
          label={t("profile.displayName")}
          defaultValue={name}
          required
        />

        <div className="pt-1">
          <Button type="submit" isLoading={isLoading}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
