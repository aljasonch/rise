import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiBarChart2,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiMonitor,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { sections, totalMinutes, totalQuestions } from "@/data/test";

function RoleCard({
  href,
  icon: Icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: IconType;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-4 rounded-card border p-5 shadow-card transition-colors duration-150 ${
        primary
          ? "border-ink bg-ink text-white hover:border-neutral-800 hover:bg-neutral-800"
          : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted"
      }`}
    >
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-input ${
          primary ? "text-white" : " text-muted"
        }`}
      >
        <Icon aria-hidden size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">{title}</span>
          <FiArrowUpRight
            aria-hidden
            size={18}
            className={primary ? "text-white/80" : "text-faint group-hover:text-ink"}
          />
        </span>
        <span className={`mt-1 block text-sm leading-relaxed ${primary ? "text-white/80" : "text-muted"}`}>
          {description}
        </span>
      </span>
    </Link>
  );
}

function Fact({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden size={16} className="mt-0.5 shrink-0 text-muted" />
      <div>
        <p className="text-sm font-medium tabular-nums">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-input border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-muted"
        >
          Panel admin
          <FiArrowRight aria-hidden size={15} />
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-12">
        <div>
          <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Psikotes
          </h1>

          <div className="mt-8 grid max-w-lg grid-cols-1 gap-4 border-y border-line py-5 sm:grid-cols-3">
            <Fact icon={FiLayers} label="subtes" value={String(sections.length)} />
            <Fact icon={FiCheckCircle} label="soal" value={String(totalQuestions)} />
            <Fact icon={FiClock} label="menit pengerjaan" value={String(totalMinutes)} />
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
              <FiCamera aria-hidden size={14} />
              Kamera fisik saja
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
              <FiMonitor aria-hidden size={14} />
              Seluruh layar
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
              <FiShield aria-hidden size={14} />
              Data lokal di perangkat
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          <RoleCard
            href="/test"
            icon={FiUser}
            title="Mulai sebagai kandidat"
            description="Isi identitas, siapkan kamera dan layar, lalu kerjakan asesmen."
            primary
          />
          <RoleCard
            href="/admin"
            icon={FiBarChart2}
            title="Buka panel admin"
            description="Tinjau sesi nyata, skor kognitif, pelanggaran, dan tangkapan kamera."
          />

          <div className="rounded-card border border-line bg-surface-muted p-4 text-xs leading-relaxed text-muted">
            <p className="font-medium text-ink">Catatan data</p>
            <p className="mt-1">
              Sesi dan tangkapan layar disimpan di browser ini. Tidak ada data demo yang
              ditampilkan di panel admin.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
