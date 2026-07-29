"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/ui/LanguageSwitcher";

interface CreateAccountFormProps {
  usedTypes: Set<string>;
}

const accountTypes = [
  {
    value: "checking",
    labelKey: "account.checking",
    descKey: "account.checkingDesc",
    gradient: "from-blue-950/30",
    border: "border-blue-500/15",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    radioColor: "border-blue-400 bg-blue-400",
  },
  {
    value: "savings",
    labelKey: "account.savings",
    descKey: "account.savingsDesc",
    gradient: "from-indigo-950/30",
    border: "border-indigo-500/15",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    radioColor: "border-indigo-400 bg-indigo-400",
  },
  {
    value: "credit",
    labelKey: "account.credit",
    descKey: "account.creditDesc",
    gradient: "from-amber-950/30",
    border: "border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    radioColor: "border-amber-400 bg-amber-400",
  },
];

export function CreateAccountForm({ usedTypes }: CreateAccountFormProps) {
  const { t } = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await createAccount(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const availableTypes = accountTypes.filter((t) => !usedTypes.has(t.value));

  if (availableTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01] p-10 text-center">
        <p className="text-sm text-white/25">{t("account.allOwned")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="animate-slide-down rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-400">
          {error}
        </div>
      )}

      <fieldset className="space-y-3">
        {availableTypes.map((type, index) => (
          <label
            key={type.value}
            className={`group flex cursor-pointer items-center gap-4 rounded-xl border bg-gradient-to-br p-4 transition-all duration-200
              hover:border-white/25 hover:from-white/[0.04]
              has-[:checked]:border-primary-400/30 has-[:checked]:from-primary-400/[0.04]
              animate-fade-in ${type.gradient} ${type.border}`}
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
          >
            <input type="radio" name="type" value={type.value} className="peer hidden" required />
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${type.iconBg}`}>
              <svg className={`h-5 w-5 ${type.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={
                  type.value === "credit"
                    ? "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    : "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                } />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-white/80">{t(type.labelKey)}</span>
              <p className="text-[11px] text-white/25 mt-0.5">{t(type.descKey)}</p>
            </div>
            <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/15 transition-all group-has-[:checked]:${type.radioColor} group-has-[:checked]:border-none`}>
              <div className="h-2 w-2 rounded-full bg-white opacity-0 transition-all group-has-[:checked]:opacity-100" />
            </div>
          </label>
        ))}
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit" isLoading={isLoading}>{t("account.newBtn")}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}
