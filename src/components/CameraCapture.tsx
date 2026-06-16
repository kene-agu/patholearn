"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, ExternalLink, Lock, Loader2, RotateCw, X } from "lucide-react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

type CameraState = "starting" | "live" | "captured" | "error";
// Drives which recovery UI to show.
type ErrorKind = "in-app" | "denied" | "no-device" | "busy" | "generic";

// Returns true when we're confident the page is running inside an in-app
// WebView (opened from another app) rather than a real browser. These browsers
// silently block getUserMedia because the host app never requested the OS
// camera permission. UA matching isn't perfect — notably, the Claude mobile
// app's WebView doesn't advertise itself — so we pair this with Permissions
// API checks and still offer the "open in browser" option on any denial.
function detectInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const knownInApp =
    /\b(FBAN|FBAV|FB_IAB|Instagram|Line|MicroMessenger|WeChat|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|GSA|Claude)\b/i;
  if (knownInApp.test(ua)) return true;
  // Android System WebView adds "; wv" to the UA string.
  if (/Android.*\bwv\b/i.test(ua)) return true;
  // Generic Android WebView (no specific app marker, but also not Chrome/Firefox/Edge).
  if (/Android/i.test(ua) && !/(Chrome|Firefox|OPR|EdgA|SamsungBrowser)/i.test(ua)) return true;
  // iOS in-app browsers run WebKit but omit "Safari", "CriOS", "FxiOS", "EdgiOS".
  if (/iPhone|iPad|iPod/i.test(ua) && /AppleWebKit/i.test(ua) && !/(Safari|CriOS|FxiOS|EdgiOS)/i.test(ua)) return true;
  return false;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [state,       setState]       = useState<CameraState>("starting");
  const [errorKind,   setErrorKind]   = useState<ErrorKind>("generic");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);
  const [facingMode,  setFacingMode]  = useState<"environment" | "user">("environment");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setState("starting");
    setErrorKind("generic");
    setErrorDetail("");
    stopStream();

    // ── 1. Detect in-app browser before we touch the API ──────────────────────
    // These browsers have the getUserMedia API but block it at the WebView policy
    // level, so the call fails with NotAllowedError before any OS prompt appears.
    // Checking upfront gives us the right message immediately.
    if (detectInAppBrowser()) {
      setErrorKind("in-app");
      setErrorDetail("This page is open inside another app's browser, which blocks camera access.");
      setState("error");
      return;
    }

    // ── 2. Check that the API exists (old browsers / HTTP context) ─────────────
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorKind("generic");
      setErrorDetail(
        "Your browser doesn't support camera access. Open this page in Chrome or Safari over HTTPS."
      );
      setState("error");
      return;
    }

    // ── 3. Check current permission state before calling getUserMedia ──────────
    // If the user previously tapped "Block", the API throws NotAllowedError
    // immediately — no prompt appears. Querying permissions first lets us show
    // step-by-step unblock instructions rather than a useless "Try again".
    try {
      const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
      if (perm.state === "denied") {
        setErrorKind("denied");
        setErrorDetail("Camera permission is blocked for this site.");
        setState("error");
        return;
      }
    } catch {
      // Permissions API not available in this browser — fall through to getUserMedia.
    }

    // ── 4. Actually request the camera ────────────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("live");
    } catch (e) {
      const name = e instanceof Error ? e.name : "";

      if (name === "OverconstrainedError" && facing === "environment") {
        startCamera("user"); // rear camera not available — try front
        return;
      }

      if (name === "NotAllowedError") {
        // Could be a silent WebView block we didn't detect upfront, or a
        // real browser where the user tapped "Block". Show both recovery paths.
        setErrorKind("denied");
        setErrorDetail("Camera access was denied.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorKind("no-device");
        setErrorDetail("No camera was found on this device.");
      } else if (name === "NotReadableError") {
        setErrorKind("busy");
        setErrorDetail("The camera is in use by another app.");
      } else {
        setErrorKind("generic");
        setErrorDetail(`Camera error: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
      setState("error");
    }
  }, [stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera(facingMode);
    return stopStream;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedUrl(url);
    setState("captured");
    stopStream();
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    startCamera(facingMode);
  };

  const handleFlip = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* clipboard blocked — nothing more we can do silently */ }
  }, []);

  // ── Error recovery UI ──────────────────────────────────────────────────────
  const ErrorBody = () => {
    if (errorKind === "in-app") {
      return (
        <>
          <CameraOff className="h-10 w-10 text-red-400" />
          <p className="max-w-xs px-4 text-center text-sm font-semibold text-red-300">{errorDetail}</p>
          <div className="max-w-xs px-4 space-y-1.5 text-center">
            <p className="text-xs text-slate-300 font-medium">To use the camera:</p>
            <p className="text-xs text-slate-400">
              Tap the <strong>⋮</strong> or <strong>share</strong> button at the top of your screen
              and choose <strong>"Open in Chrome"</strong> or <strong>"Open in browser"</strong>.
            </p>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
          >
            {linkCopied
              ? <><Check className="h-4 w-4 text-emerald-400" /> Copied!</>
              : <><ExternalLink className="h-4 w-4" /> Copy page link</>}
          </button>
          <p className="text-xs text-slate-500 px-4 text-center">Or close this and upload a photo instead.</p>
        </>
      );
    }

    if (errorKind === "denied") {
      return (
        <>
          <Lock className="h-10 w-10 text-amber-400" />
          <p className="max-w-xs px-4 text-center text-sm font-semibold text-amber-300">{errorDetail}</p>
          <div className="max-w-[18rem] px-4 space-y-2 text-left">
            <p className="text-xs text-slate-300 font-medium text-center">To unblock it:</p>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
              <li>Tap the <strong>🔒 lock icon</strong> in your browser's address bar</li>
              <li>Tap <strong>Site settings</strong> (or "Permissions")</li>
              <li>Set <strong>Camera</strong> to <strong>Allow</strong></li>
              <li>Come back here and tap <strong>Try again</strong></li>
            </ol>
          </div>
          <div className="flex flex-col items-center gap-2 w-full px-4">
            <button
              onClick={() => startCamera(facingMode)}
              className="w-full max-w-xs rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
            >
              Try again
            </button>
            <p className="text-xs text-slate-500 text-center">
              Arrived here from another app?{" "}
              <button onClick={copyLink} className="underline text-slate-400 hover:text-white">
                {linkCopied ? "Copied!" : "Copy link"}
              </button>{" "}
              and open it in Chrome or Safari instead.
            </p>
          </div>
        </>
      );
    }

    if (errorKind === "no-device") {
      return (
        <>
          <CameraOff className="h-10 w-10 text-red-400" />
          <p className="max-w-xs px-4 text-center text-sm text-red-300">{errorDetail}</p>
          <p className="text-xs text-slate-500 px-4 text-center">Close this and upload a photo instead.</p>
        </>
      );
    }

    if (errorKind === "busy") {
      return (
        <>
          <CameraOff className="h-10 w-10 text-amber-400" />
          <p className="max-w-xs px-4 text-center text-sm text-amber-300">{errorDetail}</p>
          <p className="text-xs text-slate-400 px-4 text-center">Close any other app using the camera, then tap Try again.</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
          >
            Try again
          </button>
        </>
      );
    }

    return (
      <>
        <CameraOff className="h-10 w-10 text-red-400" />
        <p className="max-w-xs px-4 text-center text-sm text-red-300">{errorDetail}</p>
        <button
          onClick={() => startCamera(facingMode)}
          className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
        >
          Try again
        </button>
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary-400" />
            <h2 className="text-sm font-semibold text-white">Capture Slide</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
            aria-label="Close camera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${state === "live" ? "block" : "hidden"}`}
            playsInline
            muted
          />

          {capturedUrl && state === "captured" && (
            <img src={capturedUrl} alt="Captured slide" className="h-full w-full object-contain" />
          )}

          {state === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
              <p className="text-sm text-slate-300">Starting camera…</p>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white py-6 overflow-y-auto">
              <ErrorBody />
            </div>
          )}

          {/* Rule-of-thirds overlay */}
          {state === "live" && (
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-5">
          {state === "live" ? (
            <>
              <button
                onClick={handleFlip}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white transition-colors hover:bg-slate-600"
                aria-label="Flip camera"
                title="Flip camera"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleCapture}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-slate-100"
                aria-label="Take photo"
              >
                <div className="h-12 w-12 rounded-full bg-primary-500 transition-colors hover:bg-primary-600" />
              </button>
              <div className="h-10 w-10" />
            </>
          ) : state === "captured" ? (
            <div className="flex w-full items-center justify-between">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-600"
              >
                <RotateCw className="h-4 w-4" /> Retake
              </button>
              <button
                onClick={() => capturedUrl && onCapture(capturedUrl)}
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
              >
                <Check className="h-4 w-4" /> Use this photo
              </button>
            </div>
          ) : (
            <div className="h-10 flex-1" />
          )}
        </div>

        {state === "live" && (
          <p className="pb-4 text-center text-xs text-slate-500">
            Point your camera at the microscope eyepiece or slide image, then press the shutter.
          </p>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
