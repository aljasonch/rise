"use client";

import { config } from "@/lib/config";

// Watermark berulang dengan SVG inline, tidak bisa Selecting teksnya.
export default function Watermark({ name, id }: { name: string; id: string }) {
  const text = `${name} - ${id.slice(0, 8)}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220">` +
    `<text x="0" y="120" transform="rotate(-30 0 120)" fill="black" fill-opacity="${config.watermarkOpacity}" ` +
    `font-family="sans-serif" font-size="15">${text}</text></svg>`;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      }}
    />
  );
}
