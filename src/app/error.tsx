"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} fullScreen />;
}
