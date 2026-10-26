"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: it replaces the root layout, so it cannot rely on the
 * locale or theme providers (they are what just failed). Copy is therefore
 * bilingual and styling is inline, with no dependency on the app's CSS.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div role="alert" style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.25rem" }}>Algo salió mal / Something went wrong</h1>
          <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            Intenta de nuevo en unos instantes. / Please try again in a moment.
          </p>
          {error.digest && (
            <p style={{ opacity: 0.5, fontSize: "0.75rem", fontFamily: "monospace" }}>
              {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "0.75rem",
              padding: "0.6rem 1.25rem",
              borderRadius: 12,
              border: 0,
              background: "#22c55e",
              color: "#09090b",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar / Retry
          </button>
        </div>
      </body>
    </html>
  );
}
