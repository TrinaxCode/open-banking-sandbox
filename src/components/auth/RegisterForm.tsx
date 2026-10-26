"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/ui/LanguageSwitcher";
import { register } from "@/lib/actions";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await register(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Auto sign in after successful registration
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("auth.genericError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="animate-slide-down rounded-xl bg-premium-coral/10 border border-premium-coral/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          id="name"
          name="name"
          type="text"
          label={t("auth.fullName")}
          placeholder={t("auth.namePlaceholder")}
          autoComplete="name"
          required
        />

        <Input
          id="email"
          name="email"
          type="email"
          label={t("auth.email")}
          placeholder="name@example.com"
          autoComplete="email"
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label={t("auth.password")}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label={t("auth.confirmPassword")}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {t("auth.registerBtn")}
      </Button>
    </form>
  );
}
