"use client";

/**
 * Watermark — overlays the user's email address semi-transparently
 * across an image container to discourage/trace screenshots.
 *
 * Usage: wrap the image in a `relative` container, then include <Watermark email={...} />.
 */
interface WatermarkProps {
  email: string;
}

export default function Watermark({ email }: WatermarkProps) {
  // Show only the username portion so the text isn't too long
  const label = email.split("@")[0] + " · PathoLearn";

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-20"
      aria-hidden="true"
    >
      {/* Rotated grid of repeated labels */}
      <div
        style={{
          position: "absolute",
          // extend beyond bounds so rotation doesn't leave gaps
          top: "-60%",
          left: "-60%",
          width: "220%",
          height: "220%",
          transform: "rotate(-28deg)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0",
          opacity: 0.14,
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            style={{
              display: "block",
              color: "white",
              fontSize: "10px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              padding: "22px 6px",
              letterSpacing: "0.04em",
              fontFamily: "monospace",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
