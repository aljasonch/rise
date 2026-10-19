import Link from "next/link";
import { FiArrowUpRight, FiBarChart2, FiUser } from "react-icons/fi";
import { Brand } from "@/components/Brand";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Brand label="Admin" />
        <nav className="flex items-center gap-1.5">
          <Link
            href="/test"
            aria-label="Alur kandidat"
            className="inline-flex items-center gap-2 rounded-input px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <FiUser aria-hidden size={15} />
            <span className="hidden sm:inline">Alur kandidat</span>
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-input bg-surface-muted px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line"
          >
            <FiBarChart2 aria-hidden size={15} />
            Sesi
          </Link>
          <Link
            href="/"
            aria-label="Beranda"
            className="grid size-9 place-items-center rounded-input text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <FiArrowUpRight aria-hidden size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
