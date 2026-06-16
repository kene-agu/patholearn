"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, ExternalLink, Loader2, RotateCw, X } from "lucide-react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

type CameraState = "starting" | "live" | "captured" | "error";

// Many in-app browsers (the WebView opened from inside another app — links
// shared in chat apps, social feeds, the Claude app preview, etc.) silently
// block getUserMedia: the host app never asked the OS for camera permission,
// so the call rejects with NotAllowedError before any prompt appears. The only
// real fix is to open the page in the system browser (Chrome / Safari), so we
// detect this case and tell the user exactly that.
function detectInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Facebook, Instagram, Line, WeChat, TikTok, Snapchat, Twitter, LinkedIn,
  // generic WebViews (Android wv / iOS apps that omit Safari from the UA).
  const inAppPatterns =
    /\b(FBAN|FBAV|FB_IAB|Instagram|Line|MicroMessenger|WeChat|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|GSA)\b/i;
  if (inAppPatterns.test(ua)) return true;
  // Android System WebView marks itself with "; wv".
  if (/Android.*\bwv\b/i.test(ua)) return true;
  // iOS in-app browsers run WebKit but, unlike real Safari, leave "Safari" and
  // "CriOS"/"FxiOS" out of the UA string.
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isIOS && /AppleWebKit/i.test(ua) && !/(Safari|CriOS|FxiOS|EdgiOS)/i.test(ua)) return true;
  return false;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>("starting");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInApp, setIsInApp] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setState("starting");
    setErrorMsg(null);
    setIsInApp(false);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // No camera API at all — usually an in-app browser/WebView or an insecure
    // (non-HTTPS) context. Bail out early with the right guidance.
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const inApp = detectInAppBrowser();
      setIsInApp(inApp);
      setErrorMsg(
        inApp
          ? "This page is open inside another app's browser, which blocks the camera."
          : "This browser doesn't support camera access. Try Chrome or Safari, and make sure the site is loaded over HTTPS."
      );
      setState("error");
      return;
    }

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
        // Rear camera not available — fall back to the front camera.
        startCamera("user");
        return;
      }

      // NotAllowedError inside an in-app browser almost always means the WebView
      // policy blocked the camera, not that the user tapped "Block" — so steer
      // them to open the page in a real browser instead of "try again".
      const inApp = name === "NotAllowedError" && detectInAppBrowser();
      setIsInApp(inApp);

      const msg = inApp
        ? "This page is open inside another app's browser, which blocks the camera."
        : name === "NotAllowedError"
        ? "Camera access was denied. Allow camera permission in your browser settings, then try again."
        : name === "NotFoundError" || name === "DevicesNotFoundError"
        ? "No camera was found on this device."
        : name === "NotReadableError"
        ? "The camera is already in use by another app. Close it and try again."
        : `Camera error: ${e instanceof Error ? e.message : "Unknown error"}`;

      setErrorMsg(msg);
      setState("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard blocked too — nothing more we can do silently.
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedUrl(url);
    setState("captured");

    // Stop the stream while the user reviews the photo
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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

  const handleUse = () => {
    if (capturedUrl) onCapture(capturedUrl);
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
            <img
              src={capturedUrl}
              alt="Captured slide"
              className="h-full w-full object-contain"
            />
          )}

          {(state === "starting" || state === "error") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              {state === "starting" ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                  <p className="text-sm text-slate-300">Starting camera…</p>
                </>
              ) : (
                <>
                  <CameraOff className="h-10 w-10 text-red-400" />
                  <p className="max-w-xs px-4 text-center text-sm text-red-300">{errorMsg}</p>

                  {isInApp ? (
                    <>
                      <p className="max-w-xs px-4 text-center text-xs text-slate-400">
                        Open this page in <strong>Chrome</strong> or <strong>Safari</strong> to use the
                        camera — tap the <strong>⋯</strong> menu above and choose
                        “Open in browser”. You can also just upload a photo instead.
                      </p>
                      <button
                        onClick={copyLink}
                        className="mt-1 flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
                      >
                        {linkCopied ? (
                          <><Check className="h-4 w-4 text-emerald-400" /> Link copied</>
                        ) : (
                          <><ExternalLink className="h-4 w-4" /> Copy page link</>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="mt-2 rounded-xl bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
                    >
                      Try again
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Rule-of-thirds grid overlay */}
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

              {/* Shutter button */}
              <button
                onClick={handleCapture}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-slate-100"
                aria-label="Take photo"
              >
                <div className="h-12 w-12 rounded-full bg-primary-500 transition-colors hover:bg-primary-600" />
              </button>

              {/* Spacer to keep shutter centred */}
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
                onClick={handleUse}
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
              >
                <Check className="h-4 w-4" /> Use this photo
              </button>
            </div>
          ) : (
            <div className="h-10 flex-1" />
          )}
        </div>

        <p className="pb-4 text-center text-xs text-slate-500">
          Point your camera at the microscope eyepiece or slide image, then press the shutter.
        </p>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
