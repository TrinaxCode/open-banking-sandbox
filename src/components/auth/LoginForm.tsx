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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleDemoFill() {
    setEmail("demo@banking.app");
    setPassword("demo-password");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const formEmail = (formData.get("email") as string) || email;
    const formPassword = (formData.get("password") as string) || password;

    if (!formEmail || !formPassword) {
      setError(t("auth.enterCredentials"));
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: formEmail,
        password: formPassword,
        redirect: false,
      });

      if (result?.error) {
        setError(t("auth.invalidCredentials"));
        setIsLoading(false);
        return;
      }

      if (!result?.ok) {
        setError(t("auth.signInError"));
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("auth.genericError"));
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

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleDemoFill}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600/30 bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-800 transition-all hover:bg-primary-500/20 hover:text-primary-900 dark:border-primary-500/30 dark:text-primary-300 dark:hover:text-primary-200"
        >
          <svg
            className="h-3.5 w-3.5 text-primary-700 dark:text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
          {t("auth.demoFill")}
        </button>
      </div>

      <div className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          label={t("auth.email")}
          placeholder="name@example.com"
          autoComplete="email"
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
