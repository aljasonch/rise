"use client";

import Link from "next/link";
import { use, useState } from "react";
import {
  FiArrowLeft,
  FiBarChart2,
  FiClock,
  FiLayers,
  FiMail,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { AdminHeader, Badge, Button, Card, EmptyState, Metric, Modal, ProgressBar } from "@/components/ui";
import { sections, totalQuestions } from "@/data/test";
import { scoreSession, statusLabel, useNow, useStore, type Status } from "@/lib/store";

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`;
  return `${minutes} menit`;
};

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = useStore((state) => state.sessions[id]);
  const stop = useStore((state) => state.stop);
  const markReviewed = useStore((state) => state.markReviewed);

  const [confirmStop, setConfirmStop] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const now = useNow(1000);

  if (!session) {
    return (
      <div className="min-h-screen">
        <AdminHeader />
        <main className="mx-auto w-full max-w-[1280px] px-5 py-12 sm:px-8">
          <EmptyState
            icon={<FiUser aria-hidden size={22} />}
            title="Sesi tidak ditemukan"
            description="Sesi yang dicari mungkin sudah dihapus atau tidak pernah dibuat."
            action={
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-input border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                <FiArrowLeft aria-hidden size={16} />
                Kembali ke daftar sesi
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const score = scoreSession(session);
  const answered = Object.keys(session.answers).length;
  const running = session.status === "berlangsung";
  const left = Math.max(0, session.deadline - now);
  const currentSection = sections[session.section];

  return (
    <div className="min-h-screen pb-16">
      <AdminHeader />

      <main className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <FiArrowLeft aria-hidden size={14} />
            Daftar sesi
          </Link>
        </div>

        {/* Session Header */}
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{session.candidate.name}</h1>
              <Badge tone={statusTone(session.status)} dot>
                {statusLabel[session.status]}
              </Badge>
              {session.reviewed && <Badge tone="ok">Sudah ditinjau</Badge>}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{session.candidate.position}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <FiMail aria-hidden size={13} />
                {session.candidate.email}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!session.reviewed && !running && (
              <Button variant="secondary" onClick={() => markReviewed(session.id)}>
                Tandai sudah ditinjau
              </Button>
            )}
            {running && (
              <Button variant="danger" onClick={() => setConfirmStop(true)}>
                Hentikan sesi
              </Button>
            )}
          </div>
        </div>

        {/* Proctoring Notice */}
        <div className="mt-6 rounded-card border border-line bg-surface-muted p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted">
              <FiShield aria-hidden size={14} />
            </span>
            <div className="text-xs">
              <p className="font-medium text-ink">Fitur Pengawasan (Proctoring)</p>
              <p className="mt-0.5 leading-relaxed text-muted">
                Proctoring lama (deteksi wajah MediaPipe, kunci layar/fullscreen, rekaman kamera) telah dibersihkan
                dari sistem. Fitur proctoring baru siap dibangun dari awal sesuai kebutuhan spesifikasi.
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="Skor Kognitif"
            value={score.answered === 0 ? "—" : `${score.correct}/${score.total}`}
            hint={score.answered === 0 ? "Belum ada jawaban" : `${score.percent}% akurasi`}
            icon={<FiBarChart2 aria-hidden size={16} />}
          />
          <Metric
            label="Soal Terjawab"
            value={
              <span>
                {answered}
                <span className="text-base font-normal text-muted">/{totalQuestions}</span>
              </span>
            }
            hint={`Progres ${Math.round((answered / totalQuestions) * 100)}%`}
            icon={<FiLayers aria-hidden size={16} />}
          />
          <Metric
            label="Durasi"
            value={duration((session.endedAt ?? now) - session.startedAt)}
            hint={`Mulai: ${dateTime(session.startedAt)}`}
            icon={<FiClock aria-hidden size={16} />}
          />
          <Metric
            label={running ? "Sisa Waktu Subtes" : "Status Waktu"}
            value={running ? clock(left) : session.endedAt ? "Selesai" : "Waktu habis"}
            hint={running ? `Subtes ${session.section + 1} (${currentSection?.name})` : undefined}
            icon={<FiClock aria-hidden size={16} />}
          />
        </div>

        {/* Subtest Breakdown */}
        <div className="mt-8">
          <h2 className="text-base font-semibold">Hasil per Subtes</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {score.sections.map((sec, idx) => (
              <Card key={sec.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">
                    {idx + 1}. {sec.name}
                  </span>
                  <Badge tone={sec.kind === "kognitif" ? "neutral" : "accent"}>
                    {sec.kind === "kognitif" ? "Kognitif" : "Sikap"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted">
                    <span>Terjawab</span>
                    <span className="font-medium text-ink tabular-nums">
                      {sec.answered}/{sec.total}
                    </span>
                  </div>
                  {sec.kind === "kognitif" && (
                    <div className="flex justify-between text-muted">
                      <span>Benar</span>
                      <span className="font-medium text-ink tabular-nums">
                        {sec.correct}/{sec.total} ({sec.percent}%)
                      </span>
                    </div>
                  )}
                  <ProgressBar value={sec.answered} max={sec.total} label={`Progres ${sec.name}`} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Detailed Question Review */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Rincian Jawaban Soal</h2>
            <div className="flex flex-wrap gap-1 border-b border-line sm:border-b-0">
              {sections.map((sec, idx) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`rounded-input px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === idx
                      ? "bg-ink text-white"
                      : "text-muted hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {sections[activeTab]?.questions.map((question, qIdx) => {
              const selectedValue = session.answers[question.id];
              const isAnswered = selectedValue !== undefined;
              const isCognitive = sections[activeTab].kind === "kognitif";
              const isCorrect = isCognitive && selectedValue === question.answer;

              return (
                <Card key={question.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-muted text-xs font-semibold text-muted">
                        {qIdx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-relaxed text-ink">{question.text}</p>
                      </div>
                    </div>
                    {isAnswered ? (
                      isCognitive ? (
                        <Badge tone={isCorrect ? "ok" : "danger"} dot>
                          {isCorrect ? "Benar" : "Salah"}
                        </Badge>
                      ) : (
                        <Badge tone="ok">Terjawab</Badge>
                      )
                    ) : (
                      <Badge tone="neutral">Belum dijawab</Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 pl-9 text-xs sm:grid-cols-2">
                    {question.options.map((opt, optIdx) => {
                      const isSelected = selectedValue === optIdx;
                      const isKey = isCognitive && question.answer === optIdx;

                      return (
                        <div
                          key={opt}
                          className={`flex items-start gap-2.5 rounded-input border p-2.5 transition-colors ${
                            isSelected && isKey
                              ? "border-accent bg-accent-soft text-ink font-medium"
                              : isSelected && !isKey
                                ? "border-danger/30 bg-surface-muted text-danger font-medium"
                                : isKey
                                  ? "border-accent/40 bg-surface-muted text-ink font-medium"
                                  : "border-line bg-surface text-muted"
                          }`}
                        >
                          <span
                            className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
                              isSelected ? "border-accent bg-accent text-white" : "border-line text-muted"
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="min-w-0 flex-1 leading-relaxed">{opt}</span>
                          {isSelected && <span className="text-[10px] text-muted">(Pilihan)</span>}
                          {isKey && !isSelected && <span className="text-[10px] text-muted">(Kunci)</span>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {confirmStop && (
        <Modal
          title="Hentikan sesi peserta?"
          description="Sesi peserta akan langsung berstatus 'dihentikan'. Tindakan ini tidak dapat dibatalkan."
          onClose={() => setConfirmStop(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirmStop(false)}>
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  stop(session.id);
                  setConfirmStop(false);
                }}
              >
                Hentikan sesi
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
