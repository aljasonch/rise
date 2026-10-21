"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowRight, FiChevronRight, FiSearch, FiUsers, FiX } from "react-icons/fi";
import { AdminHeader, Button, EmptyState, Lamp, LinkButton, ProgressBar, Stat } from "@/components/ui";
import { sections, totalQuestions } from "@/data/test";
import { config, scoreSession, statusLabel, useNow, useStore, type Status } from "@/lib/store";

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

const lampTone = (status: Status) =>
  status === "berlangsung"
    ? ("ok" as const)
    : status === "dihentikan"
      ? ("danger" as const)
      : status === "waktu_habis"
        ? ("warn" as const)
        : ("idle" as const);

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
            <p className="field text-chalk-2">Panel admin</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-chalk">Sesi peserta</h1>
          </div>
          <LinkButton href="/test" icon={<FiArrowRight aria-hidden size={15} />}>
            Alur peserta
          </LinkButton>
        </div>

        <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-chassis-3 bg-chassis-3 sm:grid-cols-4">
          {[
            { label: "Total sesi", value: all.length },
            { label: "Berlangsung", value: live.length },
            { label: "Selesai", value: finished.length },
            { label: "Dihentikan", value: stopped.length },
          ].map((item) => (
            <Stat
              key={item.label}
              label={item.label}
              value={item.value}
              className="bg-chassis-2 px-4 py-3.5"
            />
          ))}
        </dl>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <FiSearch
              aria-hidden
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chalk-2"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, posisi, email"
              aria-label="Cari sesi"
              className="w-full rounded-input border border-chassis-3 bg-chassis-2 py-2 pl-9 pr-9 text-sm text-chalk transition-colors placeholder:text-chalk-2 focus:border-signal focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-input text-chalk-2 transition-colors hover:bg-fill hover:text-chalk"
              >
                <FiX aria-hidden size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-input border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  filter === item.key
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-transparent text-chalk-2 hover:bg-fill hover:text-chalk"
                }`}
              >
                {item.label}
                <span className="readout">{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {empty ? (
            <EmptyState
              icon={<FiUsers aria-hidden size={20} />}
              title="Belum ada sesi"
              description="Belum ada peserta yang memulai sesi."
              action={
                <LinkButton href="/test" icon={<FiArrowRight aria-hidden size={15} />}>
                  Mulai sesi peserta
                </LinkButton>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<FiSearch aria-hidden size={20} />}
              title="Tidak ada sesi yang cocok"
              description="Ubah kata kunci atau filter."
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
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-chassis-3 text-left">
                      {[
                        "Peserta",
                        "Status",
                        "Progres",
                        "Skor",
                        "Pelanggaran",
                        "Mulai",
                        "Durasi",
                      ].map((head) => (
                        <th key={head} className="field px-4 py-2.5 font-normal text-chalk-2">
                          {head}
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-chassis-3">
                    {rows.map((session) => {
                      const score = scoreSession(session);
                      const answered = Object.keys(session.answers).length;
                      const violationsCount = session.violations?.length ?? 0;
                      const sectionName = sections[session.section]?.name ?? "—";

                      return (
                        <tr key={session.id} className="group transition-colors hover:bg-fill">
                          <td className="px-4 py-3">
                            <Link href={`/admin/${session.id}`} className="block">
                              <span className="block font-medium text-chalk">{session.candidate.name}</span>
                              <span className="mt-0.5 block text-xs text-chalk-2">
                                {session.candidate.position}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Lamp tone={lampTone(session.status)}>{statusLabel[session.status]}</Lamp>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-36">
                              <div className="flex items-center justify-between gap-2 text-[11px] text-chalk-2">
                                <span className="truncate">{sectionName}</span>
                                <span className="readout shrink-0">
                                  {answered}/{totalQuestions}
                                </span>
                              </div>
                              <ProgressBar className="mt-1.5" value={answered} max={totalQuestions} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="readout text-chalk">
                              {score.answered === 0 ? "—" : `${score.correct}/${score.total}`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Lamp tone={violationsCount > 0 ? "danger" : "idle"}>
                              {violationsCount}/{config.maxViolations}
                            </Lamp>
                          </td>
                          <td className="readout px-4 py-3 text-xs text-chalk-2">
                            {dateTime(session.startedAt)}
                          </td>
                          <td className="readout px-4 py-3 text-xs text-chalk-2">
                            {duration((session.endedAt ?? now) - session.startedAt)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <Link
                              href={`/admin/${session.id}`}
                              aria-label={`Buka sesi ${session.candidate.name}`}
                              className="inline-grid size-8 place-items-center rounded-input text-chalk-2 transition-colors hover:bg-fill-2 hover:text-chalk"
                            >
                              <FiChevronRight aria-hidden size={16} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-chalk-2">
          Sesi disimpan lokal di browser ini. Menghapus data situs akan menghapus seluruh riwayat.
        </p>
      </main>
    </div>
  );
}
