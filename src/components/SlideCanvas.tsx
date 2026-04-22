"use client";

import { useRef, useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Annotation } from "@/types/analysis";

interface SlideCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  activeAnnotation: string | null;
  onAnnotationClick: (id: string | null) => void;
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
      const w = containerW;
      const h = containerW * aspect;
      const scaledW = w * zoom;
      const scaledH = h * zoom;

      canvas.width = scaledW;
      canvas.height = scaledH;
      setCanvasSize({ w: scaledW, h: scaledH });

      ctx.clearRect(0, 0, scaledW, scaledH);
      ctx.drawImage(img, 0, 0, scaledW, scaledH);

      // Draw annotations
      annotations.forEach((ann, i) => {
        const x = (ann.xPercent / 100) * scaledW;
        const y = (ann.yPercent / 100) * scaledH;
        const color = COLORS[i % COLORS.length];
        const isActive = activeAnnotation === ann.id;
        const radius = isActive ? 14 : 10;

        // Pulse ring for active
        if (isActive) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = color + "66";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Circle marker
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? color : color + "cc";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Number label
        ctx.fillStyle = "white";
        ctx.font = `bold ${isActive ? 12 : 10}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x, y);

        // Arrow line to label box
        const labelX = x + (x > scaledW / 2 ? -70 : 70);
        const labelY = y + (y > scaledH / 2 ? -30 : 30);

        ctx.beginPath();
        ctx.moveTo(x + (x > scaledW / 2 ? -radius : radius), y);
        ctx.lineTo(labelX, labelY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label background
        const labelText = ann.label;
        ctx.font = `${isActive ? "bold " : ""}11px Inter, sans-serif`;
        const textW = ctx.measureText(labelText).width;
        const boxW = textW + 12;
        const boxH = 22;
        const boxX = labelX - (x > scaledW / 2 ? boxW : 0);
        const boxY = labelY - boxH / 2;

        ctx.fillStyle = isActive ? color : "#1e293b";
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 4);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.textAlign = x > scaledW / 2 ? "right" : "left";
        ctx.fillText(labelText, boxX + (x > scaledW / 2 ? boxW - 6 : 6), labelY);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    annotations.forEach((ann) => {
      const x = (ann.xPercent / 100) * canvas.width;
      const y = (ann.yPercent / 100) * canvas.height;
      const dist = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
      if (dist < 18) found = ann.id;
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
        className="overflow-auto bg-slate-900 max-h-[520px]"
        style={{ cursor: annotations.length ? "crosshair" : "default" }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>

      {/* Annotation count */}
      {annotations.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""} — click markers to explore
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
