const RELOAD_FLAG = "patholearn:chunk-reloaded-at";
const RELOAD_COOLDOWN_MS = 10_000;

export function isChunkError(err: unknown): boolean {
  const msg =
    err instanceof Error ? `${err.name} ${err.message}` :
    typeof err === "string" ? err :
    "";
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
}

export function reloadOnce() {
  if (typeof window === "undefined") return;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? "0");
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    // sessionStorage unavailable — proceed anyway
  }
  window.location.reload();
}
