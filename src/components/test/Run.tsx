"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiFlag,
  FiUser,
} from "react-icons/fi";
import { Badge, Brand, Button, Card, Modal, ProgressBar, Toast } from "@/components/ui";
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

  return (
    <div className="min-h-screen select-none">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-8">
          <Brand label="Asesmen" />
          <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />

          <Badge tone="accent">
            {active.name} · {section + 1}/{sections.length}
          </Badge>
          <span className="text-xs text-muted">
            <span className="font-medium tabular-nums text-ink">{answeredTotal}</span>/{total} dijawab
          </span>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span
              aria-live="polite"
              className={`inline-flex items-center gap-2 rounded-input border px-3 py-1.5 text-sm font-medium tabular-nums ${
                critical ? "border-danger/30 bg-surface-muted text-danger" : "border-line bg-surface-muted text-ink"
              }`}
            >
              <FiClock aria-hidden size={15} />
              {clock(left)}
              {critical && <span className="hidden text-[11px] font-normal sm:inline">hampir habis</span>}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{active.description}</span>
            <span className="tabular-nums">
              Soal {index + 1} dari {questions.length}
            </span>
          </div>
          <ProgressBar value={answeredTotal} max={total} label="Progres jawaban" />

          <Card className="mt-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{active.name}</Badge>
              <Badge tone="neutral">
                {active.kind === "kognitif" ? "Pilih satu jawaban" : "Skala sikap"}
              </Badge>
              <span
                className={`ml-auto inline-flex items-center gap-1.5 text-xs ${
                  isAnswered ? "text-ink" : "text-muted"
                }`}
              >
                {isAnswered ? (
                  <>
                    <FiCheck aria-hidden size={14} />
                    Jawaban tersimpan
                  </>
                ) : (
                  "Belum dijawab"
                )}
              </span>
            </div>

            <h1 id="question-text" className="mt-5 text-balance text-xl font-medium leading-relaxed sm:text-2xl">
              {current.text}
            </h1>

            {active.kind === "kepribadian" ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Tidak ada jawaban benar atau salah. Pilih yang paling menggambarkan diri Anda.
                </p>
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
                        className={`flex flex-col items-center justify-start gap-2 rounded-input border px-2 py-3 text-center text-xs leading-snug transition-colors duration-150 ${
                          selected
                            ? "border-accent bg-accent-soft text-ink"
                            : "border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-muted"
                        }`}
                      >
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                            selected
                              ? "border-accent bg-accent text-white"
                              : "border-line-strong text-transparent"
                          }`}
                        >
                          <FiCheck aria-hidden size={12} />
                        </span>
                        <span className={selected ? "font-medium text-ink" : ""}>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </>
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
                      className={`flex w-full items-start gap-3 rounded-input border px-4 py-3 text-left text-sm transition-colors duration-150 ${
                        selected
                          ? "border-accent bg-accent-soft text-ink"
                          : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                          selected
                            ? "border-accent bg-accent text-white"
                            : "border-line bg-surface text-muted"
                        }`}
                      >
                        {String.fromCharCode(65 + value)}
                      </span>
                      <span className="min-w-0 flex-1 leading-relaxed">{option}</span>
                      {selected && <FiCheck aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}

            <p aria-live="polite" className="sr-only">
              {isAnswered ? "Jawaban tersimpan" : ""}
            </p>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="secondary"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
              >
                Sebelumnya
              </Button>

              <div className="flex items-center justify-end gap-2">
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
            </div>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Nomor soal</h2>
              <span className="text-xs tabular-nums text-muted">
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
                    className={`grid h-9 place-items-center rounded-input border text-xs tabular-nums transition-colors duration-150 ${
                      currentItem
                        ? "border-accent bg-accent-soft text-accent"
                        : done
                          ? "border-accent bg-accent text-white"
                          : "border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-muted"
                    }`}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm border border-accent bg-accent-soft" />
                Sekarang
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-accent" />
                Terjawab
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm border border-line bg-surface" />
                Belum
              </span>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <FiUser aria-hidden size={15} className="text-muted" />
              Peserta
            </h2>
            <p className="mt-2 text-sm font-medium text-ink">{session.candidate.name}</p>
            <p className="text-xs text-muted">{session.candidate.position}</p>
            <p className="mt-1 font-mono text-xs text-muted">{session.candidate.email}</p>
          </Card>
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[65] flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2">
          {notice && (
            <Toast key={`notice-${notice}`} title={notice} tone="neutral" onClose={dismissNotice} />
          )}
        </div>
      </div>

      {modal === "section" && next && (
        <Modal
          title={`Lanjut ke subtes ${next.name}?`}
          description={`Anda tidak dapat kembali ke subtes ${active.name}. Waktu ${next.minutes} menit akan dimulai.`}
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
              ? "Semua soal sudah dijawab. Jawaban tidak dapat diubah setelah tes selesai."
              : `${unanswered} soal belum dijawab. Jawaban tidak dapat diubah setelah tes selesai.`
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
                Selesaikan tes
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
