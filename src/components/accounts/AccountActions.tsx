"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AccountActionsProps {
  accountId: string;
  accountType: string;
}

export function AccountActions({ accountId }: AccountActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="primary"
        onClick={() => router.push(`/dashboard/deposit?accountId=${accountId}`)}
      >
        <svg className="-ml-1 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Deposit
      </Button>
      <Button
        variant="secondary"
        onClick={() => router.push(`/dashboard/withdraw?accountId=${accountId}`)}
      >
        <svg className="-ml-1 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
        Withdraw
      </Button>
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/transfer`)}
      >
        <svg className="-ml-1 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
        Transfer
      </Button>
    </div>
  );
}
