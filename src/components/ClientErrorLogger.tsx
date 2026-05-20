"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/clientLogger";
import { isChunkError } from "@/lib/chunkReload";

/**
 * Listens for uncaught errors and unhandled promise rejections and forwards
 * them to /api/client-errors. Chunk-load errors are skipped — ChunkReloadGuard
 * already handles those by reloading the page.
 */
export default function ClientErrorLogger() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.error) || isChunkError(e.message)) return;
      void logClientError({
        source: "window.error",
        message: e.message || "Unknown error",
        stack: e.error instanceof Error ? e.error.stack : undefined,
        metadata: {
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        },
      });
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) return;
      const reason = e.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
      void logClientError({
        source: "unhandledrejection",
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
