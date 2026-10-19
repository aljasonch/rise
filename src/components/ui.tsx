"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiLoader, FiX } from "react-icons/fi";
import { config } from "@/lib/config";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "border border-ink bg-ink text-white hover:border-neutral-800 hover:bg-neutral-800",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-surface-muted hover:text-ink",
  danger: "border border-danger bg-danger text-white hover:bg-danger-strong hover:border-danger-strong",
  subtle: "border border-transparent bg-accent-soft text-accent hover:bg-line",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-input font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <FiLoader aria-hidden className="animate-spin" size={16} /> : icon}
      {children}
    </button>
  );
}

export function Card({
  className = "",
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { style?: CSSProperties }) {
  return (
    <div
      className={`rounded-card border border-line bg-surface shadow-card ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-muted",
  accent: "border-accent/25 bg-accent-soft text-accent",
  ok: "border-ink/20 bg-surface text-ink",
  warn: "border-line bg-surface-muted text-ink",
  danger: "border-danger/30 bg-surface text-danger",
};

const dotTones: Record<BadgeTone, string> = {
  neutral: "bg-faint",
  accent: "bg-accent",
  ok: "bg-ink",
  warn: "bg-muted",
  danger: "bg-danger",
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}
    >
      {dot && <span aria-hidden className={`size-1.5 rounded-full ${dotTones[tone]}`} />}
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  label = "Progres",
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "accent" | "ok" | "warn" | "danger" | "ink";
  label?: string;
  className?: string;
}) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tones = {
    accent: "bg-accent",
    ok: "bg-ink",
    warn: "bg-muted",
    danger: "bg-danger",
    ink: "bg-ink",
  };

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${tones[tone]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  icon,
  valueClassName = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueClassName}`}>{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function Modal({
  title,
  description,
  children,
  actions,
  onClose,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  actions: ReactNode;
  onClose?: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeRef.current) {
        event.preventDefault();
        closeRef.current();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-fade w-full max-w-lg rounded-t-card border border-line bg-surface p-6 shadow-float outline-none sm:rounded-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-input text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <FiX aria-hidden size={18} />
            </button>
          )}
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
      </div>
    </div>
  );
}

export type ToastTone = "neutral" | "ok" | "warn" | "danger";

const toastStyles: Record<ToastTone, { icon: ReactNode; ring: string }> = {
  neutral: { icon: <FiInfo aria-hidden size={18} />, ring: "bg-surface-muted text-muted" },
  ok: { icon: <FiCheckCircle aria-hidden size={18} />, ring: "bg-surface-muted text-ink" },
  warn: { icon: <FiAlertCircle aria-hidden size={18} />, ring: "bg-surface-muted text-ink" },
  danger: { icon: <FiAlertTriangle aria-hidden size={18} />, ring: "bg-surface-muted text-danger" },
};

export function Toast({
  title,
  description,
  tone = "neutral",
  onClose,
  duration = config.toastMs,
}: {
  title: string;
  description?: string;
  tone?: ToastTone;
  onClose?: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!onClose || duration <= 0) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  const style = toastStyles[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade flex w-full items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-float"
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-full border border-line ${style.ring}`}>{style.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-input text-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <FiX aria-hidden size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface-muted/70 px-6 py-12 text-center ${className}`}
    >
      <span className="grid size-12 place-items-center rounded-full border border-line bg-surface text-muted">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <FiLoader aria-hidden size={size} className={`animate-spin ${className}`} />;
}
