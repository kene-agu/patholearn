// Client-side image optimization utilities

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;   // 0–1 for WebP
  format?: "webp" | "jpeg";
}

/**
 * Compress and resize an image File/Blob to WebP via canvas.
 * Returns a Blob and a base64 data URL.
 */
export async function optimizeImage(
  source: File | Blob | string, // string = base64 data URL
  opts: OptimizeOptions = {}
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const {
    maxWidth  = 1280,
    maxHeight = 1280,
    quality   = 0.82,
    format    = "webp",
  } = opts;

  const img = await loadImage(source);

  const { w, h } = scaleDimensions(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const mimeType = format === "webp" ? "image/webp" : "image/jpeg";

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), mimeType, quality)
  );

  const dataUrl = await blobToDataUrl(blob);
  return { blob, dataUrl, width: w, height: h };
}

/**
 * Generate a tiny thumbnail (used as blur placeholder while full-res loads).
 */
export async function generateThumbnail(
  source: File | Blob | string,
  size = 200
): Promise<{ blob: Blob; dataUrl: string }> {
  const img = await loadImage(source);
  const { w, h } = scaleDimensions(img.naturalWidth, img.naturalHeight, size, size);

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", 0.7)
  );

  return { blob, dataUrl: await blobToDataUrl(blob) };
}

/**
 * Convert a canvas element (from pdfjs rendering) to optimized WebP blobs.
 * Returns full-res and thumbnail in one pass.
 */
export async function canvasToOptimizedBlobs(
  canvas: HTMLCanvasElement,
  maxWidth = 1280,
  quality  = 0.82,
  thumbSize = 200
): Promise<{ fullBlob: Blob; thumbBlob: Blob }> {
  const { w, h } = scaleDimensions(canvas.width, canvas.height, maxWidth, maxWidth);

  // Full-res
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width  = w;
  fullCanvas.height = h;
  fullCanvas.getContext("2d")!.drawImage(canvas, 0, 0, w, h);

  const fullBlob = await new Promise<Blob>((res, rej) =>
    fullCanvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", quality)
  );

  // Thumbnail
  const { tw, th } = (() => {
    const r = Math.min(thumbSize / w, thumbSize / h);
    return { tw: Math.round(w * r), th: Math.round(h * r) };
  })();
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width  = tw;
  thumbCanvas.height = th;
  thumbCanvas.getContext("2d")!.drawImage(canvas, 0, 0, tw, th);

  const thumbBlob = await new Promise<Blob>((res, rej) =>
    thumbCanvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", 0.7)
  );

  return { fullBlob, thumbBlob };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    if (typeof source === "string") {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.src = url;
    }
  });
}

function scaleDimensions(
  w: number, h: number, maxW: number, maxH: number
): { w: number; h: number } {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

/**
 * Strip data URL prefix and return raw base64 + mime type.
 */
export function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/webp";
  return { base64, mimeType };
}
