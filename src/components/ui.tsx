"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white border border-ink hover:bg-neutral-800",
  outline: "bg-surface text-ink border border-line hover:bg-bg",
  danger: "bg-danger text-white border border-danger hover:bg-red-700",
  ghost: "bg-transparent text-muted border border-transparent hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-input px-3.5 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-card border border-line bg-surface ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  const tones = {
    muted: "text-muted border-line",
    ok: "text-ok border-ok/30",
    warn: "text-warn border-warn/30",
    danger: "text-danger border-danger/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-input border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Modal({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6">
      <div className="animate-fade w-full max-w-md rounded-card border border-line bg-surface p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
