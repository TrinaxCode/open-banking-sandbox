"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/ui/LanguageSwitcher";

export function LoginForm() {
  const router = useRouter();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please enter your email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        return;
      }

      if (!result?.ok) {
        setError("Unable to sign in. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="animate-slide-down rounded-xl bg-premium-coral/10 border border-premium-coral/20 px-4 py-3 text-sm font-medium text-premium-coral">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label={t("auth.email")}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label={t("auth.password")}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {t("auth.signinBtn")}
      </Button>
    </form>
  );
}
