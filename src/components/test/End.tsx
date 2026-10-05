"use client";

import { Card } from "@/components/ui";
import { sections } from "@/data/test";
import { config } from "@/lib/config";
import { useStore } from "@/lib/store";
import { violationLabel, type ViolationType } from "@/lib/violations";

const title: Record<string, string> = {
  selesai: "Tes selesai",
  waktu_habis: "Waktu habis",
  dihentikan: "Tes dihentikan",
};

const duration = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return `${m} menit ${Math.floor((ms % 60000) / 1000)} detik`;
};

export default function End() {
  const session = useStore((s) => s.sessions[s.activeId]);
  if (!session) return null;

  const total = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answered = Object.keys(session.answers).length;
  const endedAt = session.endedAt ?? session.deadline;

  const counts = session.violations.reduce<Partial<Record<ViolationType, number>>>(
    (acc, v) => ({ ...acc, [v.type]: (acc[v.type] ?? 0) + 1 }),
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-8">
      <Card className="w-full p-8" style={{ maxWidth: config.width.card }}>
        <h1 className="text-xl font-semibold">{title[session.status] ?? "Tes selesai"}</h1>

        <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-muted">Durasi</dt>
            <dd className="tabular-nums">{duration(endedAt - session.startedAt)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-muted">Soal terjawab</dt>
            <dd className="tabular-nums">
              {answered}/{total}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-muted">Pelanggaran</dt>
            <dd className="tabular-nums">{session.violations.length}</dd>
          </div>
        </dl>

        {Object.keys(counts).length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {Object.entries(counts).map(([type, n]) => (
              <li key={type} className="flex items-center justify-between text-sm">
                <span className="text-muted">{violationLabel[type as ViolationType]}</span>
                <span className="tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
