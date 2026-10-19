import Link from "next/link";

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
      className={`inline-flex items-center gap-2.5 rounded-input ${className}`}
    >
      <span className="text-sm font-semibold tracking-[0.12em] text-ink">RISE</span>
      {label && (
        <>
          <span aria-hidden className="h-4 w-px bg-line" />
          <span className="text-xs font-medium text-muted">{label}</span>
        </>
      )}
    </Link>
  );
}
