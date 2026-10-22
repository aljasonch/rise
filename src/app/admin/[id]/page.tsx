"use client";

import Link from "next/link";
import { get as idbGet, keys as idbKeys } from "idb-keyval";
import { use, useEffect, useState } from "react";
import { FiArrowLeft, FiMail, FiShield, FiUser } from "react-icons/fi";
import { AdminHeader, Button, EmptyState, Lamp, LinkButton, Modal, Panel, Stat } from "@/components/ui";
import { sections, totalQuestions } from "@/data/test";
import {
  config,
  scoreSession,
  statusLabel,
  useNow,
  useStore,
  violationLabel,
  type Status,
} from "@/lib/store";
import type { Capture, CaptureMoment } from "@/lib/proctor";

const captureLabel: Record<CaptureMoment, string> = {
  mulai: "Mulai",
  berkala: "Berkala",
  selesai: "Selesai",
};

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
  return `${minutes}m`;
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

const lampTone = (status: Status) =>
  status === "berlangsung"
    ? ("ok" as const)
    : status === "dihentikan"
      ? ("danger" as const)
      : status === "waktu_habis"
        ? ("warn" as const)
        : ("idle" as const);

export default function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = useStore((state) => state.sessions[id]);
  const stop = useStore((state) => state.stop);
  const markReviewed = useStore((state) => state.markReviewed);

  const [confirmStop, setConfirmStop] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [captures, setCaptures] = useState<Capture[]>([]);
  const now = useNow(1000);
  // Tangkapan berkala ditulis tab peserta; muat ulang tiap 30 dtk selama sesi berjalan.
  const refreshTick = session?.status === "berlangsung" ? Math.floor(now / 30_000) : 0;

  useEffect(() => {
    void (async () => {
      const found: Record<string, string> = {};
      for (const violation of session?.violations ?? []) {
        const shot = (await idbGet(`snapshot:${violation.id}`)) as string | undefined;
        if (shot) found[violation.id] = shot;
      }
      setSnapshots(found);

      const keys = ((await idbKeys()) as IDBValidKey[])
        .filter((key) => typeof key === "string" && key.startsWith(`capture:${id}:`))
        .sort();
      setCaptures((await Promise.all(keys.map((key) => idbGet(key)))) as Capture[]);
    })();
  }, [id, session?.violations, session?.status, refreshTick]);

  if (!session) {
    return (
      <div className="min-h-screen">
        <AdminHeader />
        <main className="mx-auto w-full max-w-[1280px] px-5 py-12 sm:px-8">
          <EmptyState
            icon={<FiUser aria-hidden size={20} />}
            title="Sesi tidak ditemukan"
            description="Sesi yang dicari mungkin sudah dihapus."
            action={
              <LinkButton href="/admin" icon={<FiArrowLeft aria-hidden size={15} />}>
                Daftar sesi
              </LinkButton>
            }
          />
        </main>
      </div>
    );
  }

  const score = scoreSession(session);
  const answered = Object.keys(session.answers).length;
  const violations = session.violations ?? [];
  const running = session.status === "berlangsung";
  const left = Math.max(0, session.deadline - now);
  const currentSection = sections[session.section];

  return (
    <div className="min-h-screen pb-16">
      <AdminHeader />

      <main className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-input px-2.5 py-1.5 text-xs font-medium text-chalk-2 transition-colors hover:bg-fill hover:text-chalk"
        >
          <FiArrowLeft aria-hidden size={14} />
          Daftar sesi
        </Link>

        <header className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-chalk">
                {session.candidate.name}
              </h1>
              <Lamp tone={lampTone(session.status)}>{statusLabel[session.status]}</Lamp>
              {session.reviewed && <Lamp tone="ok">Ditinjau</Lamp>}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-chalk-2">
              <span>{session.candidate.position}</span>
              <span aria-hidden className="h-3 w-px bg-chassis-3" />
              <span className="inline-flex items-center gap-1.5">
                <FiMail aria-hidden size={13} />
                {session.candidate.email}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!session.reviewed && !running && (
              <Button variant="secondary" onClick={() => markReviewed(session.id)}>
                Tandai ditinjau
              </Button>
            )}
            {running && (
              <Button variant="danger" onClick={() => setConfirmStop(true)}>
                Hentikan sesi
              </Button>
            )}
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-chassis-3 bg-chassis-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Skor kognitif",
              value: score.answered === 0 ? "—" : `${score.correct}/${score.total}`,
              note: score.answered === 0 ? undefined : `${score.percent}%`,
            },
            {
              label: "Terjawab",
              value: `${answered}/${totalQuestions}`,
              note: `${Math.round((answered / totalQuestions) * 100)}%`,
            },
            {
              label: "Pelanggaran",
              value: `${violations.length}/${config.maxViolations}`,
              note: violations.length >= config.maxViolations ? "Dihentikan" : undefined,
            },
            {
              label: "Durasi",
              value: duration((session.endedAt ?? now) - session.startedAt),
              note: dateTime(session.startedAt),
            },
            {
              label: running ? "Sisa waktu" : "Status waktu",
              value: running ? clock(left) : session.endedAt ? "Selesai" : "Habis",
              note: currentSection?.name,
            },
          ].map((item) => (
            <Stat
              key={item.label}
              label={item.label}
              value={item.value}
              note={item.note}
              className="bg-chassis-2 px-4 py-3.5"
            />
          ))}
        </dl>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Panel className="overflow-hidden">
            <header className="flex items-center justify-between gap-3 border-b border-chassis-3 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-chalk">
                <FiShield aria-hidden size={15} className="text-chalk-2" />
                Log pengawasan
              </h2>
              <span className="readout text-xs text-chalk-2">
                {violations.length}/{config.maxViolations}
              </span>
            </header>

            {violations.length === 0 ? (
              <p className="px-4 py-5 text-sm text-chalk-2">Tidak ada pelanggaran.</p>
            ) : (
              <ul className="divide-y divide-chassis-3">
                {violations.map((v, idx) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="readout shrink-0 text-xs text-chalk-2">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-chalk">{violationLabel[v.kind]}</span>
                      <span className="min-w-0 truncate text-xs text-chalk-2">{v.message}</span>
                    </div>
                    <span className="readout shrink-0 text-[11px] text-chalk-2">
                      {dateTime(v.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <header className="flex items-center justify-between gap-3 border-b border-chassis-3 px-4 py-3">
              <h2 className="text-sm font-medium text-chalk">Bukti</h2>
              <span className="readout text-xs text-chalk-2">
                {Object.keys(snapshots).length + captures.length}
              </span>
            </header>

            {Object.keys(snapshots).length === 0 && captures.length === 0 ? (
              <p className="px-4 py-5 text-sm text-chalk-2">Tidak ada bukti tersimpan.</p>
            ) : (
              <div className="space-y-4 p-4">
                {captures.map((cap) => (
                  <div key={cap.timestamp}>
                    <p className="readout text-[11px] text-chalk-2">
                      {captureLabel[cap.moment]} · {dateTime(cap.timestamp)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {[
                        { src: cap.screen, name: "layar" },
                        { src: cap.camera, name: "kamera" },
                      ]
                        .filter((shot) => shot.src)
                        .map((shot) => (
                          <a
                            key={shot.name}
                            href={shot.src}
                            download={`${shot.name}-${cap.moment}-${cap.timestamp}.jpg`}
                            title={`${shot.name} (${captureLabel[cap.moment]})`}
                            className="overflow-hidden rounded-input border border-chassis-3"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URL, bukan aset Next */}
                            <img src={shot.src} alt={shot.name} className="h-20 w-32 object-cover" />
                          </a>
                        ))}
                    </div>
                  </div>
                ))}
                {Object.keys(snapshots).length > 0 && (
                  <div>
                    <p className="readout text-[11px] text-chalk-2">Kamera saat pelanggaran</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {violations
                        .filter((v) => snapshots[v.id])
                        .map((v) => (
                          <a
                            key={v.id}
                            href={snapshots[v.id]}
                            download={`snapshot-${v.kind}-${v.timestamp}.jpg`}
                            title={v.message}
                            className="overflow-hidden rounded-input border border-chassis-3"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URL, bukan aset Next */}
                            <img src={snapshots[v.id]} alt={violationLabel[v.kind]} className="h-20 w-28 object-cover" />
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-chalk">Hasil per subtes</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {score.sections.map((sec, idx) => (
              <Panel key={sec.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-chalk">
                    {idx + 1}. {sec.name}
                  </span>
                  <Lamp tone={sec.kind === "kognitif" ? "idle" : "ok"}>
                    {sec.kind === "kognitif" ? "Kognitif" : "Sikap"}
                  </Lamp>
                </div>
                <p className="readout mt-3 text-lg text-chalk">
                  {sec.answered}/{sec.total}
                  <span className="ml-1.5 text-xs text-chalk-2">
                    {sec.kind === "kognitif" ? `${sec.correct} benar` : "terjawab"}
                  </span>
                </p>
              </Panel>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-chalk">Rincian jawaban</h2>
            <div className="flex flex-wrap gap-1 rounded-input border border-chassis-3 p-1">
              {sections.map((sec, idx) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`rounded-input px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === idx
                      ? "bg-signal text-chassis"
                      : "text-chalk-2 hover:bg-fill hover:text-chalk"
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
                <article key={question.id} className="sheet p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="readout mt-0.5 grid size-6 shrink-0 place-items-center rounded-input border border-rule bg-paper-2 text-xs font-medium text-muted">
                        {qIdx + 1}
                      </span>
                      <p className="text-sm font-medium leading-relaxed text-ink">{question.text}</p>
                    </div>
                    {isAnswered ? (
                      <Lamp tone={isCognitive ? (isCorrect ? "ok" : "danger") : "ok"}>
                        {isCognitive ? (isCorrect ? "Benar" : "Salah") : "Terjawab"}
                      </Lamp>
                    ) : (
                      <Lamp tone="idle">Kosong</Lamp>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-1.5 pl-9 text-xs sm:grid-cols-2">
                    {question.options.map((opt, optIdx) => {
                      const isSelected = selectedValue === optIdx;
                      const isKey = isCognitive && question.answer === optIdx;

                      return (
                        <div
                          key={opt}
                          className={`flex items-start gap-2.5 rounded-input border p-2.5 ${
                            isSelected && isKey
                              ? "border-ink bg-ink/8 font-medium text-ink"
                              : isSelected && !isKey
                                ? "border-danger/40 bg-danger/8 font-medium text-danger"
                                : isKey
                                  ? "border-ink/30 bg-paper-2 text-ink"
                                  : "border-rule bg-paper-2 text-muted"
                          }`}
                        >
                          <span
                            className={`readout grid size-5 shrink-0 place-items-center rounded-input border text-[10px] font-semibold ${
                              isSelected
                                ? "border-ink bg-ink text-paper"
                                : "border-rule bg-paper text-muted"
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="min-w-0 flex-1 leading-relaxed">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {confirmStop && (
        <Modal
          title="Hentikan sesi?"
          description="Sesi akan langsung berstatus dihentikan dan tidak bisa dibatalkan."
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
                Hentikan
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
