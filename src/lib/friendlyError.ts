/**
 * Shared friendly-error model.
 *
 * Every error shown to a user carries a tone (so the UI can signal whether
 * it's something they can fix, something transient, or something that needs
 * an account action) plus plain-language title/message text that always
 * includes what to do next. Raw server or exception strings are never
 * rendered — unknown errors fall through to a warm generic message.
 */

export type ErrorTone =
  | "fix"     // the user can fix it themselves (wrong file, too large…)
  | "wait"    // transient — retrying shortly will likely work
  | "action"  // needs an account action (sign in, upgrade…)
  | "error";  // unknown/unexpected — generic but human

export interface FriendlyError {
  tone: ErrorTone;
  title: string;
  message: string;
  /** Show a retry button when the caller provides an onRetry handler. */
  canRetry: boolean;
}

/** Error codes returned by our API routes alongside the message. */
export type ApiErrorCode =
  | "trial_expired"
  | "guest_limit"
  | "no_image"
  | "image_too_large"
  | "not_a_slide"
  | "quota_reached"
  | "overloaded"
  | "service_unavailable"
  | "analysis_failed"
  | "unexpected";

const GENERIC: FriendlyError = {
  tone: "error",
  title: "That didn't work",
  message: "Something unexpected happened on our side. Please try again — if it keeps happening, let us know via Send feedback.",
  canRetry: true,
};

const CODE_MAP: Record<ApiErrorCode, FriendlyError> = {
  trial_expired: {
    tone: "action",
    title: "Your trial has ended",
    message: "Upgrade to keep analysing slides — everything you've saved is still here waiting for you.",
    canRetry: false,
  },
  guest_limit: {
    tone: "action",
    title: "Free limit reached",
    message: "Create a free account to keep going — it takes under a minute and saves your work.",
    canRetry: false,
  },
  no_image: {
    tone: "fix",
    title: "No image received",
    message: "The slide image didn't come through. Please re-upload it and try again.",
    canRetry: false,
  },
  image_too_large: {
    tone: "fix",
    title: "This image is too large",
    message: "The limit is about 6 MB. Try a smaller export or a photo of the slide — detail up to that size is plenty for analysis.",
    canRetry: false,
  },
  not_a_slide: {
    tone: "fix",
    title: "This doesn't look like a histopathology slide",
    message: "PathoLearn analyses microscopy slide images (H&E and other stains). Please upload a photo or export of a slide instead.",
    canRetry: false,
  },
  quota_reached: {
    tone: "wait",
    title: "The AI service is busy",
    message: "We've hit a temporary usage limit. This usually clears in under a minute — please try again shortly.",
    canRetry: true,
  },
  overloaded: {
    tone: "wait",
    title: "The AI service is busy",
    message: "Lots of slides are being analysed right now. This usually clears in under a minute — please try again shortly.",
    canRetry: true,
  },
  service_unavailable: {
    tone: "wait",
    title: "Analysis is temporarily unavailable",
    message: "Our team has been notified and is on it. Please try again in a few minutes.",
    canRetry: true,
  },
  analysis_failed: {
    tone: "wait",
    title: "We couldn't analyse this slide",
    message: "The AI couldn't produce a result this time — it's usually a one-off. Please try again.",
    canRetry: true,
  },
  unexpected: GENERIC,
};

export const NETWORK_ERROR: FriendlyError = {
  tone: "fix",
  title: "No internet connection",
  message: "We couldn't reach PathoLearn. Please check your network and try again.",
  canRetry: true,
};

/**
 * Build a FriendlyError from an API error response body ({ error, code }).
 * Known codes get their mapped tone/title/message — the map is the single
 * source of truth for user-facing copy. Unknown codes fall back to the
 * generic message so raw technical text never reaches the screen.
 */
export function describeApiError(body: unknown): FriendlyError {
  const b = (body ?? {}) as { code?: unknown; detected?: unknown };
  const code = typeof b.code === "string" ? (b.code as ApiErrorCode) : null;
  const mapped = (code && CODE_MAP[code]) || GENERIC;
  // The "not a slide" rejection can say what the AI actually saw — keep that.
  if (code === "not_a_slide" && typeof b.detected === "string" && b.detected.trim()) {
    return { ...mapped, message: `The AI saw "${b.detected}" rather than a microscopy image. ${mapped.message}` };
  }
  return mapped;
}

/**
 * Build a FriendlyError from a thrown exception (fetch failures, JSON parse
 * errors…). Never surfaces err.message directly.
 */
export function describeException(err: unknown): FriendlyError {
  if (err instanceof TypeError && /fetch/i.test(err.message)) return NETWORK_ERROR;
  return GENERIC;
}
