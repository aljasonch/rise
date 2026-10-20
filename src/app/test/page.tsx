"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft, FiClock, FiPlay, FiUser } from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { Button, Card } from "@/components/ui";
import { sections } from "@/data/test";
import { emptyIdentity, type Identity } from "@/lib/identity";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import Check from "@/components/test/Check";
import End from "@/components/test/End";
import Intro from "@/components/test/Intro";
import Run from "@/components/test/Run";

type Phase = "intro" | "check" | "run" | "end" | "resume";

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function Page() {
  const session = useStore((state) => state.sessions[state.activeId]);

  const [identity, setIdentity] = useState<Identity>(emptyIdentity);
  const [phase, setPhase] = useState<Phase>(() => {
    if (!session) return "intro";
    return session.status === "berlangsung" ? "resume" : "end";
  });
  const [seen, setSeen] = useState({ id: session?.id, status: session?.status });
  const now = useNow(1000);

  // Sinkronisasi ke status store tanpa menimpa fase yang sedang dijalankan.
  if (session?.id !== seen.id) {
    setSeen({ id: session?.id, status: session?.status });
    if (!session) {
      setPhase("intro");
      setIdentity(emptyIdentity);
    } else if (session.status !== "berlangsung") {
      setPhase("end");
    } else if (phase === "intro") {
      setPhase("resume");
    }
  } else if (session && session.status !== seen.status) {
    setSeen({ id: session.id, status: session.status });
    if (session.status !== "berlangsung") setPhase("end");
  }

  if (phase === "check") {
    return (
      <Check
        identity={identity}
        onBegin={() => setPhase("run")}
        onBack={() => setPhase("intro")}
      />
    );
  }

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

  return (
    <Intro
      initial={identity}
      onContinue={(next) => {
        setIdentity(next);
        setPhase("check");
      }}
    />
  );
}
