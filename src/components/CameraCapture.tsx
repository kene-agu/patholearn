"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImageIcon, Loader2, RotateCw, X } from "lucide-react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

// "starting"  — requesting the live camera stream
// "live"      — live preview running, ready to shoot
// "captured"  — photo taken, awaiting confirm/retake
// "fallback"  — live camera unavailable; offer the native OS camera instead
type CameraState = "starting" | "live" | "captured" | "fallback";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const [state,       setState]       = useState<CameraState>("starting");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [fallbackMsg, setFallbackMsg] = useState<string>("");
  const [facingMode,  setFacingMode]  = useState<"environment" | "user">("environment");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Try to start the in-app live preview. If anything goes wrong — permission
  // blocked, in-app WebView, no API, no camera — we DON'T dead-end the user;
  // we drop to the "fallback" state, which offers the native OS camera app
  // (a file-capture input). That path uses the OS camera's own permission flow
  // and works even where getUserMedia is blocked (in-app browsers, WebViews).
  const startLiveCamera = useCallback(async (facing: "environment" | "user") => {
    setState("starting");
    stopStream();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setFallbackMsg("Live preview isn't available in this browser.");
      setState("fallback");
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

      // Rear camera unavailable — retry once with the front camera.
      if (name === "OverconstrainedError" && facing === "environment") {
        startLiveCamera("user");
        return;
      }

      setFallbackMsg(
        name === "NotAllowedError"
          ? "Live preview is blocked here — but you can still use your camera app below."
          : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "No live camera detected — use your camera app instead."
          : name === "NotReadableError"
          ? "The camera is busy in another app — try your camera app instead."
          : "Live preview isn't available — use your camera app below."
      );
      setState("fallback");
    }
  }, [stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startLiveCamera(facingMode);
    return stopStream;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live-preview capture (canvas snapshot) ─────────────────────────────────
  const handleShutter = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setCapturedUrl(canvas.toDataURL("image/jpeg", 0.92));
    setState("captured");
    stopStream();
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    startLiveCamera(facingMode);
  };

  const handleFlip = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startLiveCamera(next);
  };

  // ── Native OS camera (always works on mobile, incl. in-app browsers) ───────
  const openNativeCamera = () => nativeInputRef.current?.click();

  const handleNativeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same shot
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      stopStream();
      onCapture(dataUrl);
    } catch {
      setFallbackMsg("Couldn't read that photo — please try again.");
      setState("fallback");
    }
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

          {state === "fallback" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15">
                <Camera className="h-8 w-8 text-primary-400" />
              </div>
              <p className="max-w-xs text-sm text-slate-300">{fallbackMsg}</p>
              <button
                onClick={openNativeCamera}
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
              >
                <Camera className="h-4 w-4" /> Open camera
              </button>
              <button
                onClick={openNativeCamera}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 underline-offset-2 hover:text-white hover:underline"
              >
                <ImageIcon className="h-3.5 w-3.5" /> Or choose an existing photo
              </button>
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
                onClick={handleShutter}
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

        {/* Native OS camera input — the reliable mobile path. capture="environment"
            asks for the rear camera; falls back to the gallery picker if the
            device has no camera. */}
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleNativeFile}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
