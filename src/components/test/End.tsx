"use client";

import Link from "next/link";
import { FiArrowLeft, FiCheckCircle, FiClock, FiList, FiRefreshCw, FiSlash } from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { Badge, Button, Card, Metric } from "@/components/ui";
import { totalQuestions } from "@/data/test";
import { useStore, statusLabel } from "@/lib/store";

const duration = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} detik`;
  return seconds === 0 ? `${minutes} menit` : `${minutes} menit ${seconds} detik`;
};

const title: Record<string, string> = {
  selesai: "Tes selesai",
  waktu_habis: "Waktu habis",
  dihentikan: "Tes dihentikan",
};

const description: Record<string, string> = {
  selesai: "Jawaban Anda telah tersimpan dengan aman. Pengawas dapat meninjau hasil asesmen ini.",
  waktu_habis: "Waktu tes berakhir. Jawaban yang sudah tersimpan tetap dapat ditinjau pengawas.",
  dihentikan: "Sesi dihentikan oleh pengawas. Hubungi pengawas jika Anda membutuhkan penjelasan.",
};

export default function End() {
  const session = useStore((state) => state.sessions[state.activeId]);
  const clearActive = useStore((state) => state.clearActive);

  if (!session) return null;

  const answered = Object.keys(session.answers).length;
  const endedAt = session.endedAt ?? session.deadline;

  const StatusIcon =
    session.status === "selesai" ? FiCheckCircle : session.status === "waktu_habis" ? FiClock : FiSlash;
  const tone = session.status === "selesai" ? "ok" : session.status === "waktu_habis" ? "warn" : "danger";

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-input px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <FiArrowLeft aria-hidden size={15} />
          Beranda
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-4 sm:px-8">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span
                className={`grid size-12 place-items-center rounded-full border ${
                  tone === "ok"
                    ? "border-line bg-surface-muted text-ink"
                    : tone === "warn"
                      ? "border-line bg-surface-muted text-ink"
                      : "border-danger/20 bg-surface-muted text-danger"
                }`}
              >
                <StatusIcon aria-hidden size={22} />
              </span>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                {title[session.status] ?? "Tes selesai"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {session.candidate.name} · {session.candidate.position}
              </p>
            </div>
            <Badge tone={tone === "ok" ? "ok" : tone === "warn" ? "warn" : "danger"} dot>
              {statusLabel[session.status]}
            </Badge>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{description[session.status]}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Metric
              label="Durasi pengerjaan"
              value={duration(endedAt - session.startedAt)}
              icon={<FiClock aria-hidden size={16} />}
            />
            <Metric
              label="Soal dijawab"
              value={
                <span>
                  {answered}
                  <span className="text-base font-normal text-muted">/{totalQuestions}</span>
                </span>
              }
              icon={<FiList aria-hidden size={16} />}
            />
          </div>

          <p className="mt-6 rounded-input border border-line bg-surface-muted p-3 text-xs leading-relaxed text-muted">
            Nilai dan evaluasi asesmen tidak ditampilkan di halaman peserta. Hasil lengkap tersedia untuk
            pengawas di panel admin.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-input px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              Kembali ke beranda
            </Link>
            <Button
              icon={<FiRefreshCw aria-hidden size={16} />}
              onClick={() => clearActive()}
            >
              Mulai sesi baru
            </Button>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          Sesi ini tetap tersimpan di panel admin meskipun Anda memulai sesi baru.
        </p>
      </div>
    </main>
  );
}
