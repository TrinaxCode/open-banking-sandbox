"use client";

import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Catches failures inside a dashboard page while keeping the sidebar and top bar
 * on screen, so a broken page does not strand the user.
 */
export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} />;
}
