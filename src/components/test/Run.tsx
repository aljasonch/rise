"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiFlag,
  FiMaximize,
  FiShield,
} from "react-icons/fi";
import { Button, Lamp, Modal, ProgressBar, Toast } from "@/components/ui";
import { CameraPreview, guardScreenShare, useProctorGuard } from "@/lib/proctor";
import { config, useNow, useStore, type Status } from "@/lib/store";
import { sections, totalQuestions } from "@/data/test";

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function Run() {
  const session = useStore((state) => state.sessions[state.activeId]);
  const answer = useStore((state) => state.answer);
  const nextSection = useStore((state) => state.nextSection);
  const finish = useStore((state) => state.finish);
  const notice = useStore((state) => state.notice);
  const setNotice = useStore((state) => state.setNotice);

  const {
    shieldRef,
    warning,
    blanked,
    blankReason,
    isFullscreen,
    violationsCount,
    maxViolations,
    dismissWarning,
    restoreScreen,
    violationTitle,
  } = useProctorGuard(session?.status === "berlangsung");

  const ended = useRef(false);
  const warned = useRef(false);

  const [index, setIndex] = useState(0);
  const [section, setSection] = useState(session?.section ?? 0);
  const [modal, setModal] = useState<"" | "section" | "finish">("");

  const now = useNow(config.tickMs);
  const left = session ? Math.max(0, session.deadline - now) : 0;
  const critical = left > 0 && left <= config.criticalMs;

  const answeredTotal = Object.keys(session?.answers ?? {}).length;
  const total = totalQuestions;
  const isLast = section === sections.length - 1;
  const active = sections[section] ?? sections[0];
  const questions = active.questions;
  const current = questions[Math.min(index, questions.length - 1)];
  const isAnswered = Boolean(current && session && current.id in session.answers);
  const unanswered = total - answeredTotal;

  // Pindah subtes selalu kembali ke soal pertama.
  if (session && session.section !== section) {
    setSection(session.section);
    setIndex(0);
  }

  const closeModal = useCallback(() => setModal(""), []);
  const dismissNotice = useCallback(() => setNotice(""), [setNotice]);

  const stop = useCallback(
    (status: Status) => {
      if (ended.current) return;
      ended.current = true;
      finish(status);
    },
    [finish],
  );

  // Sisa waktu dibaca dari deadline, bukan dari counter yang dikurangi.
  useEffect(() => {
    if (!session || left > 0) return;
    if (isLast) {
      stop("waktu_habis");
      return;
    }
    setNotice("Waktu subtes habis. Lanjut ke subtes berikutnya.");
    nextSection();
  }, [left, session, isLast, nextSection, stop, setNotice]);

  useEffect(() => {
    if (session?.forceStop) stop("dihentikan");
  }, [session?.forceStop, stop]);

  useEffect(() => {
    warned.current = false;
  }, [session?.section]);

  useEffect(() => {
    if (!critical || warned.current) return;
    warned.current = true;
    setNotice("Sisa waktu kurang dari satu menit.");
  }, [critical, setNotice]);

  if (!session) return null;

  const pick = (value: number) => answer(current.id, value);
  const goTo = (nextIdx: number) => {
    setIndex(nextIdx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const advance = () => {
    if (index < questions.length - 1) {
      goTo(index + 1);
      return;
    }
    setModal(isLast ? "finish" : "section");
  };

  const next = sections[section + 1];
  const sectionDone = questions.filter((question) => question.id in session.answers).length;
  const showBlankScreen = blanked;

  return (
    <div
      className="min-h-screen select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Tirai Hitam Sinkron 0ms (Selalu ada di DOM agar langsung menutup layar saat tombol Win/Shift/PrintScreen ditekan) */}
      <div
        ref={shieldRef}
        aria-live="assertive"
        style={{
          display: showBlankScreen ? "flex" : "none",
          opacity: showBlankScreen ? 1 : 0,
        }}
        className="fixed inset-0 z-[68] flex-col items-center justify-center bg-black px-6 text-center text-white select-none"
      >
        <span className="grid size-12 place-items-center rounded-input border border-white/20 bg-white/10 text-white">
          <FiShield aria-hidden size={22} />
        </span>
        <p className="mt-4 text-base font-semibold">Layar Dilindungi</p>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-white/70">
          {blankReason || "Tangkapan layar dan perekaman layar tidak diizinkan."}
        </p>
        <p className="mt-1 text-[10px] text-white/40">
          Berbagi layar: {guardScreenShare() ? "aktif" : "tidak aktif"}
        </p>
        {!warning && (
          <button
            type="button"
            onClick={restoreScreen}
            className="mt-5 inline-flex items-center gap-2 rounded-input border border-white/25 bg-white/15 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
          >
            <FiMaximize aria-hidden size={14} />
            {guardScreenShare() ? "Kembali ke layar penuh" : "Bagikan seluruh layar & lanjutkan"}
          </button>
        )}
      </div>

      {/* Watermark identitas: jejak di setiap foto layar dari HP. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-20 select-none opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200"><text x="16" y="100" font-family="monospace" font-size="14" fill="#0f172a">${session.candidate.name} · ${session.candidate.email} · ${new Date(session.startedAt).toLocaleString("id-ID")}</text></svg>`,
          )}")`,
        }}
      />

      <header className="rail sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:px-8">
          <span className="readout text-sm font-semibold tracking-[0.14em] text-chalk">RISE</span>

          <span aria-hidden className="hidden h-3.5 w-px bg-chassis-3 sm:block" />

          <span className="text-sm text-chalk">{active.name}</span>
          <span className="readout text-xs text-chalk-2">
            {section + 1}/{sections.length}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <Lamp tone={isFullscreen ? "ok" : "danger"}>
              {isFullscreen ? "Layar penuh" : "Bukan layar penuh"}
            </Lamp>
            {violationsCount > 0 && (
              <Lamp tone="danger">
                Pelanggaran {violationsCount}/{maxViolations}
              </Lamp>
            )}
            <span
              aria-live="polite"
              className={`readout inline-flex items-center gap-2 rounded-input border px-2.5 py-1 text-sm font-medium ${
                critical
                  ? "border-danger-fg/50 bg-danger-fg/15 text-danger-fg"
                  : "border-chassis-3 bg-chassis-2 text-chalk"
              }`}
            >
              <FiClock aria-hidden size={14} />
              {clock(left)}
            </span>
          </div>
        </div>
      </header>

      <div
        className={`mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_260px] ${
          showBlankScreen ? "invisible pointer-events-none" : ""
        }`}
      >
        <main className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-chalk-2">{active.description}</p>
            <p className="readout text-xs text-chalk-2">
              {index + 1}/{questions.length}
            </p>
          </div>
          <ProgressBar className="mt-2" value={answeredTotal} max={total} />

          <article className="sheet mt-4 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="field text-muted">{active.name}</span>
              <span aria-hidden className="h-3 w-px bg-rule" />
              <span className="text-xs text-muted">
                {active.kind === "kognitif" ? "Pilih satu jawaban" : "Skala sikap"}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
                {isAnswered && <FiCheck aria-hidden size={14} className="text-ink" />}
                {isAnswered ? "Tersimpan" : "Belum dijawab"}
              </span>
            </div>

            <h1
              id="question-text"
              className="mt-5 text-balance text-xl font-medium leading-[1.45] text-ink sm:text-[26px]"
            >
              {current.text}
            </h1>

            {active.kind === "kepribadian" ? (
              <div
                role="radiogroup"
                aria-labelledby="question-text"
                className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-5"
              >
                {current.options.map((option, value) => {
                  const selected = session.answers[current.id] === value;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => pick(value)}
                      className={`flex flex-col items-center gap-2 rounded-input border px-2.5 py-3.5 text-center text-xs leading-snug transition-colors ${
                        selected
                          ? "border-ink bg-ink text-paper"
                          : "border-rule bg-paper-2 text-muted hover:border-ink/40 hover:text-ink"
                      }`}
                    >
                      <span
                        className={`grid size-4 place-items-center rounded-full border ${
                          selected ? "border-paper bg-paper" : "border-rule"
                        }`}
                      >
                        {selected && <FiCheck aria-hidden size={10} className="text-ink" />}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div role="radiogroup" aria-labelledby="question-text" className="mt-6 space-y-2">
                {current.options.map((option, value) => {
                  const selected = session.answers[current.id] === value;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => pick(value)}
                      className={`flex w-full items-start gap-3 rounded-input border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? "border-ink bg-ink/5 font-medium text-ink"
                          : "border-rule bg-paper-2 text-ink hover:border-ink/35"
                      }`}
                    >
                      <span
                        className={`readout mt-0.5 grid size-6 shrink-0 place-items-center rounded-input border text-[11px] font-semibold ${
                          selected ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-muted"
                        }`}
                      >
                        {String.fromCharCode(65 + value)}
                      </span>
                      <span className="min-w-0 flex-1 leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <p aria-live="polite" className="sr-only">
              {isAnswered ? "Jawaban tersimpan" : ""}
            </p>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="secondary"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
              >
                Sebelumnya
              </Button>

              {index < questions.length - 1 ? (
                <Button onClick={advance}>
                  Berikutnya
                  <FiArrowRight aria-hidden size={16} />
                </Button>
              ) : isLast ? (
                <Button icon={<FiFlag aria-hidden size={16} />} onClick={() => setModal("finish")}>
                  Selesai
                </Button>
              ) : (
                <Button onClick={() => setModal("section")}>
                  Subtes berikutnya
                  <FiArrowRight aria-hidden size={16} />
                </Button>
              )}
            </div>
          </article>
        </main>

        <aside className="space-y-4">
          <section className="panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="field text-chalk-2">Nomor soal</h2>
              <span className="readout text-xs text-chalk-2">
                {sectionDone}/{questions.length}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {questions.map((question, questionIndex) => {
                const done = question.id in session.answers;
                const currentItem = questionIndex === index;
                return (
                  <button
                    key={question.id}
                    type="button"
                    aria-label={`Soal ${questionIndex + 1}${done ? ", sudah dijawab" : ""}`}
                    aria-current={currentItem ? "step" : undefined}
                    onClick={() => goTo(questionIndex)}
                    className={`readout grid h-9 place-items-center rounded-input border text-xs font-medium transition-colors ${
                      currentItem
                        ? "border-signal bg-signal/15 text-signal"
                        : done
                          ? "border-chassis-3 bg-chassis-3 text-chalk"
                          : "border-chassis-3 bg-transparent text-chalk-2 hover:bg-fill hover:text-chalk"
                    }`}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-chalk-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-signal/40 ring-1 ring-signal" />
                Sekarang
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-chassis-3" />
                Terjawab
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm border border-chassis-3" />
                Belum
              </span>
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="field text-chalk-2">Kamera pengawas</h2>
            <CameraPreview className="mt-2.5 aspect-[4/3] w-full" />
          </section>

          <section className="panel p-4">
            <h2 className="field text-chalk-2">Peserta</h2>
            <p className="mt-2 text-sm font-medium text-chalk">{session.candidate.name}</p>
            <p className="text-xs text-chalk-2">{session.candidate.position}</p>
            <p className="readout mt-1 truncate text-[11px] text-chalk-2">{session.candidate.email}</p>
          </section>
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[65] flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2">
          {notice && (
            <Toast key={`notice-${notice}`} title={notice} tone="neutral" onClose={dismissNotice} />
          )}
        </div>
      </div>

      {warning && (
        <Modal
          title={`Pelanggaran ${violationsCount}/${maxViolations}`}
          description={violationTitle}
          actions={
            <Button
              icon={!isFullscreen ? <FiMaximize aria-hidden size={15} /> : undefined}
              onClick={dismissWarning}
            >
              {!isFullscreen ? "Kembali ke layar penuh" : "Lanjutkan"}
            </Button>
          }
        >
          <div className="rounded-input border border-danger-fg/35 bg-danger-fg/10 p-3.5">
            <div className="flex items-start gap-2.5">
              <FiAlertTriangle aria-hidden size={16} className="mt-0.5 shrink-0 text-danger-fg" />
              <p className="text-sm leading-relaxed text-fg">{warning.message}</p>
            </div>
            <p className="mt-3 border-t border-danger-fg/20 pt-2.5 text-[11px] leading-relaxed text-fg-2">
              {Math.max(0, maxViolations - violationsCount)} peringatan tersisa. Sesi dihentikan otomatis pada
              pelanggaran ke-{maxViolations}.
            </p>
          </div>
        </Modal>
      )}

      {modal === "section" && next && (
        <Modal
          title={`Lanjut ke ${next.name}?`}
          description={`Tidak bisa kembali ke ${active.name}. Waktu ${next.minutes} menit dimulai.`}
          onClose={closeModal}
          actions={
            <>
              <Button variant="secondary" onClick={closeModal}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  nextSection();
                  setIndex(0);
                  closeModal();
                }}
              >
                Mulai subtes
              </Button>
            </>
          }
        />
      )}

      {modal === "finish" && (
        <Modal
          title="Selesaikan tes?"
          description={
            unanswered === 0
              ? "Jawaban tidak bisa diubah setelah tes selesai."
              : `${unanswered} soal belum dijawab. Jawaban tidak bisa diubah setelah tes selesai.`
          }
          onClose={closeModal}
          actions={
            <>
              <Button variant="secondary" onClick={closeModal}>
                Periksa lagi
              </Button>
              <Button
                onClick={() => {
                  finish("selesai");
                  closeModal();
                }}
              >
                Selesaikan
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
