"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { riskLevel, riskScore } from "@/lib/risk";
import { useNow } from "@/lib/useNow";
import { config } from "@/lib/config";
import { sections } from "@/data/test";

type Filter = "semua" | "berlangsung" | "selesai" | "dihentikan";

const filters: { key: Filter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "berlangsung", label: "Berlangsung" },
  { key: "selesai", label: "Selesai" },
  { key: "dihentikan", label: "Dihentikan" },
];

const clock = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return m > 59 ? `${Math.floor(m / 60)}j ${m % 60}m` : `${m}m`;
};

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const riskTone = (level: string) =>
  level === "Tinggi" ? "text-danger" : level === "Sedang" ? "text-warn" : "text-muted";

export default function Page() {
  const sessions = useStore((s) => s.sessions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  // Durasi sesi yang sedang berjalan ikut bergerak tiap detik.
  const now = useNow(config.tickMs);

  const total = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const all = Object.values(sessions).sort((a, b) => b.startedAt - a.startedAt);
  const live = all.filter((s) => s.status === "berlangsung");
  const done = all.filter((s) => s.status !== "berlangsung");
  const flagged = done.filter(
    (s) => riskLevel(riskScore(s.violations)) !== "Rendah" && !s.reviewed,
  );

  const rows = all.filter((s) => {
    if (filter === "berlangsung" && s.status !== "berlangsung") return false;
    if (filter === "selesai" && s.status === "berlangsung") return false;
    if (filter === "dihentikan" && s.status !== "dihentikan") return false;
    return s.candidate.name.toLowerCase().includes(query.toLowerCase());
  });

  const stats = [
    { label: "Total", value: all.length },
    { label: "Berlangsung", value: live.length },
    { label: "Selesai", value: done.length },
    { label: "Perlu ditinjau", value: flagged.length },
  ];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-8 py-10">
      <h1 className="text-xl font-semibold">Sesi psikotes</h1>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-surface px-4 py-3">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama"
          className="w-64 rounded-input border border-line bg-surface px-3 py-2 text-sm"
        />
        <div className="flex rounded-input border border-line bg-surface p-0.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-input px-3 py-1.5 text-sm transition-colors duration-150 ${
                filter === f.key ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 font-medium">Kandidat</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Progres</th>
            <th className="py-2 font-medium">Pelanggaran</th>
            <th className="py-2 font-medium">Risiko</th>
            <th className="py-2 font-medium">Mulai</th>
            <th className="py-2 font-medium">Durasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const score = riskScore(s.violations);
            const level = riskLevel(score);
            const running = s.status === "berlangsung";
            return (
              <tr key={s.id} className="cursor-pointer border-b border-line hover:bg-surface">
                <td className="py-2.5">
                  <Link href={`/admin/${s.id}`} className="block">
                    <span className="block">{s.candidate.name}</span>
                    <span className="block text-xs text-muted">{s.candidate.position}</span>
                  </Link>
                </td>
                <td className="py-2.5">
                  <span className="flex items-center gap-1.5">
                    {running && <span className="size-1.5 animate-pulse rounded-full bg-ok" />}
                    {s.status}
                  </span>
                </td>
                <td className="py-2.5 tabular-nums">
                  {sections[s.section]?.name} - {Object.keys(s.answers).length}/{total}
                </td>
                <td className="py-2.5 tabular-nums">{s.violations.length}</td>
                <td className={`py-2.5 ${riskTone(level)}`}>{level}</td>
                <td className="py-2.5 tabular-nums text-muted">{time(s.startedAt)}</td>
                <td className="py-2.5 tabular-nums text-muted">
                  {clock((s.endedAt ?? now) - s.startedAt)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-muted">
                Tidak ada sesi
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
