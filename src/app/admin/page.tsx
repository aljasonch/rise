"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FiArrowRight,
  FiBarChart2,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { AdminHeader, Badge, Button, Card, EmptyState, Metric, ProgressBar } from "@/components/ui";
import { sections, totalQuestions } from "@/data/test";
import { scoreSession, statusLabel, useNow, useStore, type Status } from "@/lib/store";

type Filter = "semua" | "berlangsung" | "selesai" | "dihentikan";

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
  return `${minutes}m`;
};

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const statusTone = (status: Status) =>
  status === "berlangsung"
    ? ("accent" as const)
    : status === "selesai"
      ? ("ok" as const)
      : status === "waktu_habis"
        ? ("warn" as const)
        : ("danger" as const);

export default function Page() {
  const sessions = useStore((state) => state.sessions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const now = useNow(1000);

  const all = Object.values(sessions).sort((a, b) => b.startedAt - a.startedAt);
  const live = all.filter((session) => session.status === "berlangsung");
  const finished = all.filter((session) => session.status === "selesai" || session.status === "waktu_habis");
  const stopped = all.filter((session) => session.status === "dihentikan");

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: all.length },
    { key: "berlangsung", label: "Berlangsung", count: live.length },
    { key: "selesai", label: "Selesai", count: finished.length },
    { key: "dihentikan", label: "Dihentikan", count: stopped.length },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const rows = all.filter((session) => {
    if (filter === "berlangsung" && session.status !== "berlangsung") return false;
    if (filter === "selesai" && session.status !== "selesai" && session.status !== "waktu_habis") return false;
    if (filter === "dihentikan" && session.status !== "dihentikan") return false;

    if (!normalizedQuery) return true;
    return (
      session.candidate.name.toLowerCase().includes(normalizedQuery) ||
      session.candidate.position.toLowerCase().includes(normalizedQuery) ||
      session.candidate.email.toLowerCase().includes(normalizedQuery)
    );
  });

  const empty = all.length === 0;

  return (
    <div className="min-h-screen">
      <AdminHeader />

      <main className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              Admin Panel
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sesi peserta</h1>
          </div>
          <Link
            href="/test"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-input border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-neutral-800 hover:bg-neutral-800"
          >
            Buka alur peserta
            <FiArrowRight aria-hidden size={16} />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Total sesi" value={all.length} icon={<FiUsers aria-hidden size={16} />} />
          <Metric label="Berlangsung" value={live.length} icon={<FiClock aria-hidden size={16} />} />
          <Metric label="Selesai" value={finished.length} icon={<FiBarChart2 aria-hidden size={16} />} />
          <Metric label="Dihentikan" value={stopped.length} icon={<FiX aria-hidden size={16} />} />
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-card border border-line bg-surface p-3 shadow-card lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <FiSearch
              aria-hidden
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, posisi, atau email"
              aria-label="Cari sesi"
              className="w-full rounded-input border border-line bg-surface py-2.5 pl-9 pr-9 text-sm transition-colors placeholder:text-faint hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-input text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <FiX aria-hidden size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-input px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === item.key
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {item.label}
                <span className={`tabular-nums ${filter === item.key ? "text-white/60" : "text-faint"}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {empty ? (
            <EmptyState
              icon={<FiUsers aria-hidden size={22} />}
              title="Belum ada sesi"
              description="Belum ada peserta yang memulai sesi."
              action={
                <Link
                  href="/test"
                  className="inline-flex items-center gap-2 rounded-input border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Mulai sesi peserta
                  <FiArrowRight aria-hidden size={16} />
                </Link>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<FiSearch aria-hidden size={22} />}
              title="Tidak ada sesi yang cocok"
              description="Ubah kata kunci atau filter untuk melihat sesi lain."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("semua");
                  }}
                >
                  Reset pencarian
                </Button>
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-muted text-left text-[11px] uppercase tracking-[0.06em] text-muted">
                      <th className="px-4 py-2.5 font-medium">Peserta</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Progres</th>
                      <th className="px-4 py-2.5 font-medium">Skor</th>
                      <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Mulai</th>
                      <th className="hidden px-4 py-2.5 font-medium md:table-cell">Durasi</th>
                      <th className="w-10 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((session) => {
                      const score = scoreSession(session);
                      const answered = Object.keys(session.answers).length;
                      const running = session.status === "berlangsung";
                      const sectionName = sections[session.section]?.name ?? "—";

                      return (
                        <tr key={session.id} className="group transition-colors hover:bg-surface-muted/70">
                          <td className="px-4 py-3">
                            <Link href={`/admin/${session.id}`} className="block rounded-input">
                              <span className="block font-medium text-ink">{session.candidate.name}</span>
                              <span className="mt-0.5 block text-xs text-muted">
                                {session.candidate.position} · {session.candidate.email}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={statusTone(session.status)} dot>
                              {statusLabel[session.status]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-40">
                              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                                <span className="truncate">{sectionName}</span>
                                <span className="shrink-0 tabular-nums">
                                  {answered}/{totalQuestions}
                                </span>
                              </div>
                              <ProgressBar
                                className="mt-1.5"
                                value={answered}
                                max={totalQuestions}
                                tone={running ? "accent" : "ok"}
                                label={`Progres ${session.candidate.name}`}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium tabular-nums">
                              {score.answered === 0 ? "—" : `${score.correct}/${score.total}`}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted">
                              {score.answered === 0 ? "belum dijawab" : `${score.percent}% benar`}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-xs tabular-nums text-muted lg:table-cell">
                            {dateTime(session.startedAt)}
                          </td>
                          <td className="hidden px-4 py-3 text-xs tabular-nums text-muted md:table-cell">
                            {duration((session.endedAt ?? now) - session.startedAt)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <Link
                              href={`/admin/${session.id}`}
                              aria-label={`Buka sesi ${session.candidate.name}`}
                              className="inline-grid size-8 place-items-center rounded-input text-faint transition-colors hover:bg-surface-muted group-hover:text-ink"
                            >
                              <FiChevronRight aria-hidden size={17} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
          Sesi disimpan lokal di browser ini. Menghapus data situs akan menghapus seluruh riwayat.
        </p>
      </main>
    </div>
  );
}
