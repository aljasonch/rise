"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Button, Modal } from "@/components/ui";
import { config } from "@/lib/config";
import { likertLabels, sections } from "@/data/test";
import { useStore, type Status } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { useProctor } from "@/lib/useProctor";
import { violationLabel } from "@/lib/violations";
import Overlay from "./Overlay";
import Watermark from "./Watermark";

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const stamp = (ms: number) => {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
};

function Toast({ text, critical, onDone }: { text: string; critical?: boolean; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, config.toastMs);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div
      className={`animate-fade fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-input border px-4 py-2 text-sm shadow-lg ${
        critical ? "border-danger bg-danger text-white" : "border-line bg-surface text-ink"
      }`}
    >
      {text}
    </div>
  );
}

export default function Run() {
  const session = useStore((s) => s.sessions[s.activeId]);
  const answer = useStore((s) => s.answer);
  const nextSection = useStore((s) => s.nextSection);
  const finish = useStore((s) => s.finish);

  const sdkRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const ended = useRef(false);
  const [index, setIndex] = useState(0);
  const [section, setSection] = useState(session?.section ?? 0);
  const [modal, setModal] = useState<"" | "section" | "finish">("");
  const [historyOpen, setHistoryOpen] = useState(true);

  const notice = useStore((s) => s.notice);
  const setNotice = useStore((s) => s.setNotice);
  const now = useNow(config.tickMs);
  const left = session ? Math.max(0, session.deadline - now) : 0;
  const { blocked, unfocused, restore, faces, alert, cam, clearAlert } = useProctor(session?.id ?? "", sdkRef);

  const active = sections[section];
  const questions = active.questions;
  const current = questions[Math.min(index, questions.length - 1)];
  const isLast = section === sections.length - 1;
  const total = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const unanswered = total - Object.keys(session?.answers ?? {}).length;

  // Pindah subtes selalu kembali ke soal pertama.
  if (session && session.section !== section) {
    setSection(session.section);
    setIndex(0);
  }

  // Fungsi ini dipanggil dari beberapa effect, jadi dijaga agar hanya sekali.
  const stop = useCallback(
    (status: Status) => {
      if (ended.current) return;
      ended.current = true;
      finish(status);
    },
    [finish],
  );

  useEffect(() => {
    const video = camRef.current;
    if (!video || !cam) return;
    video.srcObject = cam;
    video.play().catch(() => {});
  }, [cam]);

  // Sisa waktu dibaca dari deadline, bukan dari counter yang dikurangi.
  useEffect(() => {
    if (left > 0 || !session) return;
    if (isLast) {
      stop("waktu_habis");
      return;
    }
    setNotice("Waktu subtes habis");
    nextSection();
  }, [left, session, isLast, nextSection, stop, setNotice]);

  useEffect(() => {
    if (config.autoStop && session && session.violations.length >= config.maxViolations) {
      stop("dihentikan");
    }
  }, [session, stop]);

  useEffect(() => {
    if (session?.forceStop) stop("dihentikan");
  }, [session, stop]);

  // Stabil, kalau tidak timer toast di dalam Toast akan selalu terulang tiap detik.
  const dismissNotice = useCallback(() => setNotice(""), [setNotice]);

  if (!session) return null;

  const pick = (value: number) => answer(current.id, value);

  return (
    <div className="min-h-screen select-none">
      <header className="flex items-center gap-5 border-b border-line bg-surface px-6 py-3">
        <span className="text-sm font-semibold tracking-wide">RISE</span>
        <span className="text-sm">
          {active.name} {session.section + 1}/{sections.length}
        </span>
        <span className={`text-sm tabular-nums ${left < config.criticalMs ? "text-danger" : ""}`}>
          {clock(left)}
        </span>
        <span className="text-sm text-muted">
          Pelanggaran {session.violations.length}/{config.maxViolations}
        </span>
        <div className="relative ml-auto">
          <video
            ref={camRef}
            muted
            playsInline
            className="rounded-input border border-line object-cover"
            style={{ width: config.thumb.w, height: config.thumb.h }}
          />
          <span
            className={`absolute -right-0.5 -top-0.5 size-2 rounded-full ${faces === 1 ? "bg-ok" : "bg-danger"}`}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1120px] gap-8 px-6 py-8">
        <main className="min-w-0 flex-1">
          <div className={unfocused ? "blur-sm" : ""}>
            <p className="text-sm text-muted">
              Soal {index + 1} dari {questions.length}
            </p>
            <p className="mt-3 text-lg leading-relaxed">{current.text}</p>

            {active.id === "personality" ? (
              <div className="mt-6 grid grid-cols-5 gap-2">
                {likertLabels.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => pick(i)}
                    className={`rounded-input border px-2 py-3 text-center text-xs leading-tight transition-colors duration-150 ${
                      session.answers[current.id] === i
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface hover:bg-bg"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <ul className="mt-6 space-y-2">
                {current.options.map((option, i) => (
                  <li key={option}>
                    <button
                      onClick={() => pick(i)}
                      className={`flex w-full items-center gap-3 rounded-input border px-4 py-3 text-left text-sm transition-colors duration-150 ${
                        session.answers[current.id] === i
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface hover:bg-bg"
                      }`}
                    >
                      <span>{String.fromCharCode(65 + i)}.</span>
                      <span>{option}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                Sebelumnya
              </Button>
              {index < questions.length - 1 ? (
                <Button onClick={() => setIndex(index + 1)}>Berikutnya</Button>
              ) : isLast ? (
                <Button onClick={() => setModal("finish")}>Selesai</Button>
              ) : (
                <Button onClick={() => setModal("section")}>Subtes berikutnya</Button>
              )}
            </div>
          </div>
        </main>

        <aside className="w-64 shrink-0 space-y-6">
          <div>
            <p className="text-sm font-medium">Nomor soal</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => {
                const done = q.id in session.answers;
                return (
                  <button
                    key={q.id}
                    onClick={() => setIndex(i)}
                    className={`h-9 rounded-input border text-sm tabular-nums transition-colors duration-150 ${
                      i === index
                        ? "border-ink text-ink"
                        : done
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              Riwayat pelanggaran
              {historyOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {historyOpen && (
              <ul className="mt-2 space-y-1.5">
                {[...session.violations].reverse().map((v) => (
                  <li key={v.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-muted">{violationLabel[v.type]}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{stamp(v.at)}</span>
                  </li>
                ))}
                {session.violations.length === 0 && <li className="text-sm text-muted">-</li>}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Watermark name={session.candidate.name} id={session.id} />

      {alert && <Toast key={alert.id} text={alert.text} critical={alert.critical} onDone={clearAlert} />}
      {notice && <Toast text={notice} onDone={dismissNotice} />}

      {blocked && <Overlay blocked={blocked} onRestore={restore} />}

      {modal === "section" && (
        <Modal
          title="Lanjut ke subtes berikutnya?"
          body="Anda tidak dapat kembali ke subtes ini."
          actions={
            <>
              <Button variant="outline" onClick={() => setModal("")}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  nextSection();
                  setIndex(0);
                  setModal("");
                }}
              >
                Lanjut
              </Button>
            </>
          }
        />
      )}

      {modal === "finish" && (
        <Modal
          title="Selesaikan tes?"
          body={`${unanswered} soal belum dijawab.`}
          actions={
            <>
              <Button variant="outline" onClick={() => setModal("")}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  finish("selesai");
                  setModal("");
                }}
              >
                Selesaikan
              </Button>
            </>
          }
        />
      )}

      {/* Container proctor-sdk, harus absolute dan tidak display:none. */}
      <div ref={sdkRef} className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0" />
    </div>
  );
}
