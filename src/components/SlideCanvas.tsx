"use client";

import { useRef, useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Annotation } from "@/types/analysis";
import Watermark from "@/components/Watermark";

interface SlideCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  activeAnnotation: string | null;
  onAnnotationClick: (id: string | null) => void;
  watermarkText?: string;
}

const COLORS = [
  "#38bdf8", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#facc15", "#60a5fa", "#4ade80",
];

export default function SlideCanvas({
  imageUrl,
  annotations,
  activeAnnotation,
  onAnnotationClick,
  watermarkText,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; annotation: Annotation } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });

  // Draw everything on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (img: HTMLImageElement) => {
      const containerW = containerRef.current?.clientWidth || 800;
      const aspect = img.naturalHeight / img.naturalWidth;
      const cssW = containerW * zoom;
      const cssH = containerW * aspect * zoom;

      // Hi-DPI support — render at devicePixelRatio, display at CSS size
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      setCanvasSize({ w: cssW, h: cssH });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(img, 0, 0, cssW, cssH);

      // Scale annotation geometry gently — cap at 1.1× so labels never
      // cover large portions of the slide on wide canvases.
      const scale = Math.min(1.1, Math.max(0.8, cssW / 750));

      annotations.forEach((ann, i) => {
        const x = (ann.xPercent / 100) * cssW;
        const y = (ann.yPercent / 100) * cssH;
        const color = COLORS[i % COLORS.length];
        const isActive = activeAnnotation === ann.id;
        const radius = (isActive ? 11 : 9) * scale;

        // ── Extra points: dashed connectors + satellite dots ──────────────
        if (ann.extraPoints?.length) {
          ann.extraPoints.forEach((pt) => {
            const px = (pt.xPercent / 100) * cssW;
            const py = (pt.yPercent / 100) * cssH;

            // Dashed connector line between main and extra point
            ctx.save();
            ctx.setLineDash([5 * scale, 4 * scale]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(px, py);
            ctx.strokeStyle = color + "99";
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Satellite dot (slightly smaller than main)
            const sr = 7 * scale;
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 5 * scale;
            ctx.shadowOffsetY = 1 * scale;
            ctx.beginPath();
            ctx.arc(px, py, sr + 2 * scale, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, sr, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();

            // Same number on satellite
            ctx.font = `800 ${10 * scale}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = 2 * scale;
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.strokeText(String(i + 1), px, py);
            ctx.fillStyle = "white";
            ctx.fillText(String(i + 1), px, py);
          });
        }

        // ── Main dot ──────────────────────────────────────────────────────
        // Soft drop shadow for all annotation elements so they pop on any slide
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 6 * scale;
        ctx.shadowOffsetY = 1 * scale;

        // Pulse ring for active
        if (isActive) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 8 * scale, 0, Math.PI * 2);
          ctx.strokeStyle = color + "88";
          ctx.lineWidth = 4 * scale;
          ctx.stroke();
        }

        // Outer white ring for contrast against any background
        ctx.beginPath();
        ctx.arc(x, y, radius + 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // Colored marker
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();

        // Number — bold, white, with subtle dark outline for readability
        ctx.font = `800 ${12 * scale}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 2.5 * scale;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.strokeText(String(i + 1), x, y);
        ctx.fillStyle = "white";
        ctx.fillText(String(i + 1), x, y);

        // On narrow canvases (mobile) labels overlap — skip them and let the
        // tap tooltip do the job instead.
        if (cssW >= 480) {
          // Arrow line to label
          const offsetX = 72 * scale;
          const offsetY = 30 * scale;
          const labelX = x + (x > cssW / 2 ? -offsetX : offsetX);
          const labelY = y + (y > cssH / 2 ? -offsetY : offsetY);

          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 3 * scale;
          ctx.beginPath();
          ctx.moveTo(x + (x > cssW / 2 ? -radius : radius), y);
          ctx.lineTo(labelX, labelY);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5 * scale;
          ctx.stroke();
          ctx.restore();

          // Label box
          const labelText = ann.label;
          const fontPx = 11 * scale;
          ctx.font = `700 ${fontPx}px Inter, sans-serif`;
          const textW = ctx.measureText(labelText).width;
          const padX = 7 * scale;
          const padY = 4 * scale;
          const boxW = textW + padX * 2;
          const boxH = fontPx + padY * 2;
          const boxX = labelX - (x > cssW / 2 ? boxW : 0);
          const boxY = labelY - boxH / 2;
          const radiusBox = 6 * scale;

          // Box shadow
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 8 * scale;
          ctx.shadowOffsetY = 2 * scale;
          ctx.fillStyle = isActive ? color : "rgba(15,23,42,0.95)";
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, radiusBox);
          ctx.fill();
          ctx.restore();

          // Colored accent border
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 * scale;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, radiusBox);
          ctx.stroke();

          ctx.fillStyle = "white";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(labelText, boxX + padX, boxY + boxH / 2);
        }
      });
    };

    if (imgRef.current && imgRef.current.src === imageUrl && imgRef.current.complete) {
      draw(imgRef.current);
    } else {
      const img = new Image();
      // Only set crossOrigin for external URLs, not data URLs
      if (!imageUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        imgRef.current = img;
        draw(img);
      };
      img.onerror = () => {
        console.error("Failed to load image in canvas:", imageUrl.slice(0, 80));
      };
      img.src = imageUrl;
    }
  }, [imageUrl, annotations, activeAnnotation, zoom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Work in CSS pixels — annotations are positioned by rendered size
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const hitRadius = Math.max(18, 22 * (rect.width / 600));

    let found: string | null = null;
    annotations.forEach((ann) => {
      const x = (ann.xPercent / 100) * rect.width;
      const y = (ann.yPercent / 100) * rect.height;
      if (Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2) < hitRadius) {
        found = ann.id;
      }
      // Extra points are clickable too — they activate the same annotation
      ann.extraPoints?.forEach((pt) => {
        const px = (pt.xPercent / 100) * rect.width;
        const py = (pt.yPercent / 100) * rect.height;
        if (Math.sqrt((clickX - px) ** 2 + (clickY - py) ** 2) < hitRadius) {
          found = ann.id;
        }
      });
    });
    onAnnotationClick(found);

    if (found) {
      const ann = annotations.find((a) => a.id === found)!;
      const rect2 = canvas.getBoundingClientRect();
      setTooltip({
        x: (ann.xPercent / 100) * rect2.width + rect2.left,
        y: (ann.yPercent / 100) * rect2.height + rect2.top,
        annotation: ann,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="card p-0 overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-700">Slide View</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="btn-ghost p-2"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="btn-ghost p-2"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="btn-ghost p-2"
            title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-slate-900 max-h-[520px]"
        style={{ cursor: annotations.length ? "crosshair" : "default" }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        {watermarkText && <Watermark email={watermarkText} />}
      </div>

      {/* Annotation count */}
      {annotations.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""} — tap markers to explore
        </div>
      )}

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-xl px-4 py-3 shadow-2xl pointer-events-none max-w-[260px]"
          style={{
            left: Math.min(tooltip.x + 16, window.innerWidth - 280),
            top: tooltip.y - 60,
          }}
        >
          <p className="font-semibold mb-1">{tooltip.annotation.label}</p>
          <p className="text-slate-300 leading-relaxed">{tooltip.annotation.description}</p>
        </div>
      )}
    </div>
  );
}
