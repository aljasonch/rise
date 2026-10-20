"use client";

import Link from "next/link";
import { useState } from "react";
import type { IconType } from "react-icons";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiPlay,
  FiUser,
} from "react-icons/fi";
import { Brand, Button, Card } from "@/components/ui";
import { sections, totalMinutes, totalQuestions } from "@/data/test";
import { defaultSsoUser, useNow, useStore, type Identity } from "@/lib/store";
import End from "@/components/test/End";
import Run from "@/components/test/Run";

type Phase = "check" | "run" | "end" | "resume";

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

function Fact({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden size={16} className="mt-0.5 shrink-0 text-muted" />
      <div>
        <p className="text-sm font-medium tabular-nums">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function Page() {
  const session = useStore((state) => state.sessions[state.activeId]);
  const start = useStore((state) => state.start);

  const [identity] = useState<Identity>(defaultSsoUser);
  const [phase, setPhase] = useState<Phase>(() => {
    if (!session) return "check";
    return session.status === "berlangsung" ? "resume" : "end";
  });
  const [seen, setSeen] = useState({ id: session?.id, status: session?.status });
  const now = useNow(1000);

  // Sinkronisasi ke status store tanpa menimpa fase yang sedang dijalankan.
  if (session?.id !== seen.id) {
    setSeen({ id: session?.id, status: session?.status });
    if (!session) {
      setPhase("check");
    } else if (session.status !== "berlangsung") {
      setPhase("end");
    }
  } else if (session && session.status !== seen.status) {
    setSeen({ id: session.id, status: session.status });
    if (session.status !== "berlangsung") setPhase("end");
  }

  const handleStart = () => {
    start(identity);
    setPhase("run");
  };

  if (phase === "run") return session?.status === "berlangsung" ? <Run /> : <End />;
  if (phase === "end") return <End />;

  if (phase === "resume" && session && session.status !== "berlangsung") return <End />;

  if (phase === "resume" && session) {
    const section = sections[session.section];
    const left = Math.max(0, session.deadline - now);

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

        <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-5 pb-16 pt-6 sm:px-8">
          <Card className="w-full max-w-lg p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-full border border-line bg-surface-muted text-ink">
              <FiUser aria-hidden size={22} />
            </span>

            <h1 className="mt-5 text-xl font-semibold tracking-tight">Lanjutkan sesi</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sesi atas nama <span className="font-medium text-ink">{session.candidate.name}</span> sedang berlangsung.
            </p>

            <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted">Subtes</dt>
                <dd className="font-medium">{section?.name ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted">Sisa waktu subtes</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                  <FiClock aria-hidden size={14} className="text-muted" />
                  {clock(left)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted">Jawaban tersimpan</dt>
                <dd className="font-medium tabular-nums">{Object.keys(session.answers).length}</dd>
              </div>
            </dl>

            <Button
              className="mt-6 w-full"
              size="lg"
              icon={<FiPlay aria-hidden size={16} />}
              onClick={() => setPhase("run")}
            >
              Lanjutkan tes
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  // Tampilan Beranda / Mulai Tes
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

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-12">
        <div>
          <p className="text-sm font-medium text-muted">
            Hai, <span className="font-semibold text-ink">{identity.name}</span>
          </p>

          <h1 className="mt-3 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Psikotes
          </h1>

          <div className="mt-8 grid max-w-lg grid-cols-1 gap-4 border-y border-line py-5 sm:grid-cols-3">
            <Fact icon={FiLayers} label="subtes" value={String(sections.length)} />
            <Fact icon={FiCheckCircle} label="soal" value={String(totalQuestions)} />
            <Fact icon={FiClock} label="menit" value={String(totalMinutes)} />
          </div>
        </div>

        <div className="grid gap-4">
          <button
            type="button"
            onClick={handleStart}
            className="group flex items-center justify-between gap-4 rounded-card border border-ink bg-ink p-5 text-left text-white shadow-card transition-colors duration-150 hover:border-neutral-800 hover:bg-neutral-800"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-input text-white">
              <FiPlay aria-hidden size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold">Mulai</span>
                <FiArrowUpRight
                  aria-hidden
                  size={18}
                  className="text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
