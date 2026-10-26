"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addBeneficiary, deleteBeneficiary } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";

interface SerializedBeneficiary {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  nickname: string | null;
  createdAt: string;
}

interface BeneficiariesClientProps {
  beneficiaries: SerializedBeneficiary[];
}

export function BeneficiariesClient({ beneficiaries }: BeneficiariesClientProps) {
  const router = useRouter();
  const { t } = useT();

  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<SerializedBeneficiary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsAdding(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await addBeneficiary(null, formData);

    if (result?.error) {
      setError(result.error);
      setIsAdding(false);
      return;
    }

    form.reset();
    setIsAdding(false);
    router.refresh();
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);

    const formData = new FormData();
    formData.set("id", pendingDelete.id);
    const result = await deleteBeneficiary(null, formData);

    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
      setPendingDelete(null);
      return;
    }

    setIsDeleting(false);
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          {t("benef.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t("benef.subtitle")}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.04] dark:bg-white/[0.02]">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t("benef.add")}
        </h2>
        <form onSubmit={handleAdd} className="mt-4 space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl border border-premium-coral/20 bg-premium-coral/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="name"
              name="name"
              label={t("benef.name")}
              placeholder={t("benef.namePlaceholder")}
              required
            />
            <Input
              id="accountNumber"
              name="accountNumber"
              label={t("benef.accountNumber")}
              placeholder="CHK-A1B2C3"
              required
            />
          </div>

          <Input
            id="nickname"
            name="nickname"
            label={t("benef.nickname")}
            placeholder={t("benef.nicknamePlaceholder")}
          />

          <div className="pt-1">
            <Button type="submit" isLoading={isAdding}>
              {t("benef.addBtn")}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t("benef.saved")}
        </h2>

        {beneficiaries.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-white/[0.01]">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
              {t("benef.empty")}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {beneficiaries.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                      {b.name}
                    </p>
                    {b.nickname && (
                      <p className="truncate text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {b.nickname}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {b.accountNumber}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={`/dashboard/transfer?external=1&to=${encodeURIComponent(b.accountNumber)}`}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  >
                    <span>{t("benef.send")}</span>
                    <svg
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(b)}
                    className="ml-auto text-xs font-semibold text-zinc-600 dark:text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-premium-coral"
                  >
                    {t("benef.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={pendingDelete !== null}
        title={t("benef.deleteTitle")}
        message={
          pendingDelete ? t("benef.deleteMsg").replace("{0}", pendingDelete.name) : ""
        }
        confirmLabel={isDeleting ? t("benef.deleting") : t("benef.delete")}
        variant="danger"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
