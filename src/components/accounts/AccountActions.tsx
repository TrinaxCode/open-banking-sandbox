"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/ui/LanguageSwitcher";

interface AccountActionsProps {
  accountId: string;
  accountType: string;
}

export function AccountActions({ accountId }: AccountActionsProps) {
  const router = useRouter();
  const { t } = useT();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="primary"
        onClick={() => router.push(`/dashboard/deposit?accountId=${accountId}`)}
      >
        <svg
          className="-ml-1 mr-1.5 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {t("nav.deposit")}
      </Button>
      <Button
        variant="secondary"
        onClick={() => router.push(`/dashboard/withdraw?accountId=${accountId}`)}
      >
        <svg
          className="-ml-1 mr-1.5 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
        {t("nav.withdraw")}
      </Button>
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/transfer?fromAccountId=${accountId}`)}
      >
        <svg
          className="-ml-1 mr-1.5 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
        {t("nav.transfer")}
      </Button>
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/statements?accountId=${accountId}`)}
      >
        <svg
          className="-ml-1 mr-1.5 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        {t("nav.statements")}
      </Button>
    </div>
  );
}
