"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowUpRight,
  FiCheck,
  FiCheckCircle,
  FiInfo,
  FiLoader,
  FiUser,
  FiX,
} from "react-icons/fi";
import { config } from "@/lib/store";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-chassis hover:bg-signal-hi border border-signal",
  secondary:
    "border border-hairline bg-fill text-fg hover:bg-fill-2 hover:border-fg/50",
  ghost: "border border-transparent bg-transparent text-fg-2 hover:bg-fill hover:text-fg",
  danger: "border border-danger-fg/60 bg-danger-fg/12 text-danger-fg hover:bg-danger-fg/22",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
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
      className={`inline-flex select-none items-center justify-center gap-2 rounded-input font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <FiLoader aria-hidden className="animate-spin" size={15} /> : icon}
      {children}
    </button>
  );
}

/** Bingkai gelap: tempat seluruh readout dan kontrol berada. */
export function Panel({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`panel ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Tautan yang berpakaian seperti tombol utama. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-input font-medium transition-colors duration-150 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}

export type LampTone = "idle" | "ok" | "warn" | "danger";

const lampTones: Record<LampTone, string> = {
  idle: "border-hairline bg-fill text-fg-2",
  ok: "border-ok-fg/40 bg-ok-fg/12 text-ok-fg",
  warn: "border-warn-fg/40 bg-warn-fg/12 text-warn-fg",
  danger: "border-danger-fg/50 bg-danger-fg/12 text-danger-fg",
};

const lampDots: Record<LampTone, string> = {
  idle: "bg-fg-2",
  ok: "bg-ok-fg",
  warn: "bg-warn-fg",
  danger: "bg-danger-fg",
};

/**
 * Lampu status. Menggantikan badge: bentuknya sama untuk semua status,
 * yang membedakan hanya nyala lampunya.
 */
export function Lamp({
  tone = "idle",
  children,
  className = "",
}: {
  tone?: LampTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-input border px-2 py-0.5 text-[11px] font-medium ${lampTones[tone]} ${className}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${lampDots[tone]}`} />
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={`h-1 w-full overflow-hidden rounded-full bg-fill-2 ${className}`}
    >
      <div
        className="h-full rounded-full bg-signal transition-[width] duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/**
 * Pembacaan satu nilai di dalam `dl`. Angka selalu mono; label selalu silkscreen.
 */
export function Stat({
  label,
  value,
  note,
  className = "",
  valueClassName = "text-xl",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <dt className="field text-fg-2">{label}</dt>
      <dd className={`readout mt-1 font-medium text-fg ${valueClassName}`}>{value}</dd>
      {note && <p className="mt-0.5 truncate text-[11px] text-fg-2">{note}</p>}
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-6"
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
        className="panel animate-rise w-full max-w-lg rounded-card p-6 shadow-pop outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{description}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-input text-fg-2 transition-colors hover:bg-fill hover:text-fg"
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
  neutral: { icon: <FiInfo aria-hidden size={17} />, ring: "text-fg-2" },
  ok: { icon: <FiCheckCircle aria-hidden size={17} />, ring: "text-ok-fg" },
  warn: { icon: <FiAlertCircle aria-hidden size={17} />, ring: "text-warn-fg" },
  danger: { icon: <FiAlertTriangle aria-hidden size={17} />, ring: "text-danger-fg" },
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
      className="panel animate-rise flex w-full items-start gap-3 p-3.5 shadow-pop"
    >
      <span className={`mt-0.5 shrink-0 ${style.ring}`}>{style.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-fg-2">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-input text-fg-2 transition-colors hover:bg-fill hover:text-fg"
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
    <div className={`panel flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="grid size-11 place-items-center rounded-input border border-hairline bg-fill text-fg-2">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-fg-2">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <FiLoader aria-hidden size={size} className={`animate-spin ${className}`} />;
}

export function Brand({
  href = "/",
  label,
  className = "",
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label ? `RISE, ${label}` : "RISE, beranda"}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-5 place-items-center rounded-[3px] bg-signal">
          <FiCheck aria-hidden size={12} className="text-chassis" />
        </span>
        <span className="readout text-sm font-semibold tracking-[0.14em] text-fg">RISE</span>
      </span>
      {label && (
        <>
          <span aria-hidden className="h-3.5 w-px bg-hairline" />
          <span className="text-xs text-fg-2">{label}</span>
        </>
      )}
    </Link>
  );
}

export function AdminHeader() {
  return (
    <header className="rail sticky top-0 z-30">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Brand label="Admin" />
        <nav className="flex items-center gap-1">
          <Link
            href="/test"
            aria-label="Alur peserta"
            className="inline-flex items-center gap-2 rounded-input px-2.5 py-1.5 text-sm text-fg-2 transition-colors hover:bg-fill hover:text-fg"
          >
            <FiUser aria-hidden size={15} />
            <span className="hidden sm:inline">Peserta</span>
          </Link>
          <Link
            href="/"
            aria-label="Beranda"
            className="grid size-8 place-items-center rounded-input text-fg-2 transition-colors hover:bg-fill hover:text-fg"
          >
            <FiArrowUpRight aria-hidden size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
