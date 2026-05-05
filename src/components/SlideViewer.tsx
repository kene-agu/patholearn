"use client";

import { useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Annotation } from "@/types/analysis";
import Watermark from "@/components/Watermark";

interface SlideViewerProps {
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

export default function SlideViewer({
  imageUrl,
  annotations,
  activeAnnotation,
  onAnnotationClick,
  watermarkText,
}: SlideViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(4, Math.max(0.5, Math.round(next * 4) / 4));
    setZoom(clamped);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // only zoom on ctrl+scroll
    e.preventDefault();
    applyZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
  }, [zoom, applyZoom]);

  const handleAnnotationMarkerClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAnnotationClick(activeAnnotation === id ? null : id);
  }, [activeAnnotation, onAnnotationClick]);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Slide View</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => applyZoom(zoom - 0.25)}
            className="btn-ghost p-2" title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => applyZoom(zoom + 0.25)}
            className="btn-ghost p-2" title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); }}
            className="btn-ghost p-2" title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable viewport */}
      <div
        ref={scrollRef}
        className="relative overflow-auto bg-slate-900 max-h-[520px]"
        onWheel={handleWheel}
        onClick={() => onAnnotationClick(null)}
        style={{ cursor: annotations.length ? "crosshair" : "default" }}
      >
        {/*
          Inner div is sized at zoom×100% so the browser scroll handles panning.
          Annotations use position:absolute with left/top as percentages —
          they scale exactly with the image at any zoom level.
          SVG connector lines use percentage x1/y1/x2/y2 — also crisp at any zoom.
        */}
        <div style={{ width: `${zoom * 100}%`, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Histology slide"
            onLoad={() => setImageLoaded(true)}
            draggable={false}
            style={{ display: "block", width: "100%", height: "auto", userSelect: "none" }}
          />

          {imageLoaded && annotations.length > 0 && (
            <>
              {/* SVG layer — connector lines only (crisp, percentage-based) */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "visible",
                  pointerEvents: "none",
                }}
              >
                {annotations.map((ann, i) => {
                  const color = COLORS[i % COLORS.length];
                  const lx = ann.xPercent > 50 ? ann.xPercent - 7 : ann.xPercent + 7;
                  const ly = ann.yPercent > 50 ? ann.yPercent - 3 : ann.yPercent + 3;
                  return (
                    <g key={ann.id}>
                      {/* Extra-point dashed connectors */}
                      {ann.extraPoints?.map((pt, pi) => (
                        <line key={pi}
                          x1={`${ann.xPercent}%`} y1={`${ann.yPercent}%`}
                          x2={`${pt.xPercent}%`} y2={`${pt.yPercent}%`}
                          stroke={color} strokeWidth="1.5"
                          strokeDasharray="4 3" strokeOpacity="0.75"
                        />
                      ))}
                      {/* Main connector to label */}
                      <line
                        x1={`${ann.xPercent}%`} y1={`${ann.yPercent}%`}
                        x2={`${lx}%`} y2={`${ly}%`}
                        stroke={color} strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* HTML annotation markers — circles + labels, always crisp */}
              {annotations.map((ann, i) => {
                const color = COLORS[i % COLORS.length];
                const isActive = activeAnnotation === ann.id;
                const onLeft = ann.xPercent > 50;
                const onTop  = ann.yPercent > 50;

                return (
                  <div key={ann.id}>
                    {/* Satellite dots (extra points) */}
                    {ann.extraPoints?.map((pt, pi) => (
                      <div key={pi} style={{
                        position: "absolute",
                        left: `${pt.xPercent}%`,
                        top: `${pt.yPercent}%`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 8,
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: color, border: "2px solid white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 800, color: "white",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
                        }}>
                          {i + 1}
                        </div>
                      </div>
                    ))}

                    {/* Main marker */}
                    <div
                      onClick={(e) => handleAnnotationMarkerClick(ann.id, e)}
                      style={{
                        position: "absolute",
                        left: `${ann.xPercent}%`,
                        top: `${ann.yPercent}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: isActive ? 20 : 10,
                        cursor: "pointer",
                      }}
                    >
                      {/* Active pulse ring */}
                      {isActive && (
                        <div style={{
                          position: "absolute",
                          inset: -7,
                          borderRadius: "50%",
                          border: `2px solid ${color}`,
                          opacity: 0.55,
                          animation: "ping 1.4s ease-in-out infinite",
                          pointerEvents: "none",
                        }} />
                      )}

                      {/* Circle marker */}
                      <div style={{
                        width: isActive ? 26 : 22,
                        height: isActive ? 26 : 22,
                        borderRadius: "50%",
                        background: color,
                        border: "2.5px solid white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: isActive ? 11 : 10,
                        fontWeight: 800,
                        color: "white",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                        transition: "width 0.15s, height 0.15s",
                        userSelect: "none",
                      }}>
                        {i + 1}
                      </div>

                      {/* Label box */}
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        ...(onLeft
                          ? { right: "calc(100% + 5px)" }
                          : { left: "calc(100% + 5px)" }),
                        ...(onTop && !onLeft
                          ? {}
                          : {}),
                        whiteSpace: "nowrap",
                        background: isActive ? color : "rgba(15,23,42,0.93)",
                        border: `1.5px solid ${color}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "white",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                        pointerEvents: "none",
                        lineHeight: 1.4,
                      }}>
                        {ann.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {watermarkText && <Watermark email={watermarkText} />}
      </div>

      {/* Footer */}
      {annotations.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
          <span>{annotations.length} annotation{annotations.length !== 1 ? "s" : ""} — click markers to explore</span>
          {zoom > 1 && <span className="text-primary-500 font-medium">Scroll to pan · Ctrl+scroll to zoom</span>}
        </div>
      )}
    </div>
  );
}
