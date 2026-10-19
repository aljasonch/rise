/* eslint-disable @next/next/no-img-element -- snapshot IndexedDB berupa data URL, next/image tidak bisa mengoptimalkannya */
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiCamera, FiDownload, FiMaximize2, FiMonitor, FiX } from "react-icons/fi";
import type { Shot, Snap } from "@/lib/snap";

export const hasCapture = (snap?: Snap) => Boolean(snap?.cam || snap?.screen);

export const captureTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function CaptureFrame({
  label,
  icon: Icon,
  src,
  aspect,
  emptyTitle,
  emptyHint,
  footer,
  live = false,
  onOpen,
  className = "",
}: {
  label: string;
  icon: IconType;
  src?: string;
  aspect: "camera" | "screen";
  emptyTitle: string;
  emptyHint: string;
  footer?: ReactNode;
  live?: boolean;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-card border border-line bg-surface shadow-card ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-ink">
          <Icon aria-hidden size={14} className="text-muted" />
          {label}
        </span>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-ink" />
            Langsung
          </span>
        )}
      </div>

      <div
        className={`relative bg-media ${aspect === "camera" ? "aspect-[4/3]" : "aspect-video"}`}
      >
        {src ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Buka ${label} ukuran penuh`}
            className="group block h-full w-full cursor-zoom-in"
          >
            <img src={src} alt={`Tangkapan ${label}`} loading="lazy" className="h-full w-full object-contain" />
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-input border border-white/15 bg-black/45 px-2 py-1 text-[11px] text-white/85 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <FiMaximize2 aria-hidden size={12} />
              Perbesar
            </span>
          </button>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
            <span className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white/60">
              <Icon aria-hidden size={18} />
            </span>
            <div>
              <p className="text-xs font-medium text-white/75">{emptyTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">{emptyHint}</p>
            </div>
          </div>
        )}
      </div>

      {footer && (
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11px] text-muted">
          {footer}
        </figcaption>
      )}
    </figure>
  );
}

export function CaptureLightbox({
  snap,
  title,
  timestamp,
  onClose,
}: {
  snap: Snap;
  title: string;
  timestamp?: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  const stamp = timestamp ? captureTime(timestamp) : "";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Tangkapan ${title}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-card border border-line bg-surface shadow-float">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {stamp && <p className="mt-0.5 text-xs tabular-nums text-muted">Diambil pukul {stamp}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau"
            className="grid size-9 place-items-center rounded-input text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <FiX aria-hidden size={18} />
          </button>
        </div>

        <div className="grid items-start gap-3 p-4 lg:grid-cols-[4fr_6fr]">
          {[
            { src: snap.cam, label: "Kamera", icon: FiCamera },
            { src: snap.screen, label: "Layar", icon: FiMonitor },
          ].map(({ src, label, icon: Icon }) => (
            <figure key={label} className="overflow-hidden rounded-input border border-line">
              {src ? (
                <img
                  src={src}
                  alt={`Tangkapan ${label}`}
                  className="h-[32vh] w-full bg-media object-contain lg:h-[340px]"
                />
              ) : (
                <div className="grid h-[32vh] place-items-center bg-media text-white/50 lg:h-[340px]">
                  <span className="flex flex-col items-center gap-2 text-xs">
                    <Icon aria-hidden size={20} />
                    Tidak ada tangkapan
                  </span>
                </div>
              )}
              <figcaption className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Icon aria-hidden size={13} className="text-muted" />
                  {label}
                </span>
                {src && (
                  <a
                    href={src}
                    download={`${title.toLowerCase().replaceAll(" ", "-")}-${label.toLowerCase()}.jpg`}
                    className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <FiDownload aria-hidden size={13} />
                    Unduh
                  </a>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SnapshotThumb({
  src,
  label,
  icon: Icon,
  onClick,
}: {
  src?: string;
  label: string;
  icon: IconType;
  onClick?: () => void;
}) {
  const content = src ? (
    <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <span className="grid h-full w-full place-items-center text-muted">
      <Icon aria-hidden size={15} />
    </span>
  );

  return (
    <span className="group relative block h-16 w-24 shrink-0 overflow-hidden rounded-input border border-line bg-surface-muted">
      {onClick && src ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={`Buka tangkapan ${label}`}
          className="h-full w-full cursor-zoom-in"
        >
          {content}
          <span className="absolute inset-0 grid place-items-center bg-ink/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <FiMaximize2 aria-hidden size={14} className="text-white" />
          </span>
        </button>
      ) : (
        content
      )}
    </span>
  );
}

export function ArchiveCard({ shot, onClick }: { shot: Shot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Buka snapshot ${captureTime(shot.at)}`}
      className="group w-64 shrink-0 rounded-input border border-line bg-surface p-2 text-left transition-colors hover:border-line-strong hover:bg-surface-muted"
    >
      <span className="grid grid-cols-2 gap-1.5">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[6px] bg-media">
          {shot.cam ? (
            <img src={shot.cam} alt="Kamera" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-white/40">
              <FiCamera aria-hidden size={14} />
            </span>
          )}
        </span>
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[6px] bg-media">
          {shot.screen ? (
            <img src={shot.screen} alt="Layar" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-white/40">
              <FiMonitor aria-hidden size={14} />
            </span>
          )}
        </span>
      </span>
      <span className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span className="tabular-nums">{captureTime(shot.at)}</span>
        <span className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <FiMaximize2 aria-hidden size={11} />
          Perbesar
        </span>
      </span>
    </button>
  );
}
