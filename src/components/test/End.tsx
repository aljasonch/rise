"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Button, Stat } from "@/components/ui";
import { totalQuestions } from "@/data/test";
import { exitFullscreenIfActive, stopProctorStream, stopScreenEvidence } from "@/lib/proctor";
import { config, statusLabel, useStore } from "@/lib/store";

const duration = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} detik`;
  return seconds === 0 ? `${minutes} menit` : `${minutes} menit ${seconds} detik`;
};

const stamp: Record<string, { text: string; tone: string }> = {
  selesai: { text: "SELESAI", tone: "border-ink text-ink" },
  waktu_habis: { text: "WAKTU HABIS", tone: "border-warn-fg text-warn-fg" },
  dihentikan: { text: "DIHENTIKAN", tone: "border-danger-fg text-danger-fg" },
};

export default function End() {
  const session = useStore((state) => state.sessions[state.activeId]);
  const clearActive = useStore((state) => state.clearActive);

  useEffect(() => {
    stopProctorStream();
    stopScreenEvidence();
    void exitFullscreenIfActive();
  }, []);

  if (!session) return null;

  const answered = Object.keys(session.answers).length;
  const violationsCount = session.violations?.length ?? 0;
  const endedAt = session.endedAt ?? session.deadline;
  const mark = stamp[session.status] ?? stamp.selesai;

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
        <article className="sheet relative overflow-hidden p-7 sm:p-10">
          {/* Stempel: satu momen visual di seluruh aplikasi. */}
          <div
            aria-hidden
            className={`animate-stamp pointer-events-none absolute right-6 top-7 rotate-[-2.5deg] rounded-input border-2 px-3 py-1.5 text-lg font-bold tracking-[0.14em] ${mark.tone}`}
          >
            {mark.text}
          </div>

          <p className="field text-muted">Hasil asesmen</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            {session.candidate.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{session.candidate.position}</p>

          <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-input border border-rule bg-rule sm:grid-cols-4">
            {[
              { label: "Durasi", value: duration(endedAt - session.startedAt) },
              { label: "Terjawab", value: `${answered}/${totalQuestions}` },
              { label: "Pelanggaran", value: `${violationsCount}/${config.maxViolations}` },
              { label: "Status", value: statusLabel[session.status] },
            ].map((item) => (
              <Stat
                key={item.label}
                label={item.label}
                value={item.value}
                valueClassName="text-sm"
                className="bg-paper px-3.5 py-3"
              />
            ))}
          </dl>

          <p className="mt-8 border-t border-rule pt-5 text-sm leading-relaxed text-muted">
            Nilai lengkap tersedia di panel admin.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-input border border-rule bg-paper-2 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-ink/40 hover:text-ink"
            >
              Beranda
            </Link>
            <Button
              icon={<FiRefreshCw aria-hidden size={15} />}
              onClick={() => clearActive()}
            >
              Sesi baru
            </Button>
          </div>
        </article>
      </div>
    </main>
  );
}
