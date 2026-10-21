"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft, FiClock, FiPlay } from "react-icons/fi";
import { Brand, Stat } from "@/components/ui";
import { sections, totalMinutes, totalQuestions } from "@/data/test";
import { ProctorChecklist, StartButton, useProctorPrecheck } from "@/lib/proctor";
import { config, defaultSsoUser, useNow, useStore, type Identity } from "@/lib/store";
import End from "@/components/test/End";
import Run from "@/components/test/Run";

type Phase = "check" | "run" | "end" | "resume";

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

function EntryScreen({ identity, onStart }: { identity: Identity; onStart: () => void }) {
  const { checks, allPassed, refreshing, recheck } = useProctorPrecheck();

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-input px-2.5 py-1.5 text-sm text-chalk-2 transition-colors hover:bg-fill hover:text-chalk"
        >
          <FiArrowLeft aria-hidden size={15} />
          Beranda
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-12 lg:pt-10">
        <div className="lg:sticky lg:top-24">
          <p className="text-sm text-chalk-2">
            Hai, <span className="text-chalk">{identity.name}</span>
          </p>
          <h1 className="mt-2 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-chalk sm:text-5xl">
            Asesmen psikotes
          </h1>

          <dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-chassis-3 bg-chassis-3">
            {[
              { label: "Subtes", value: sections.length },
              { label: "Soal", value: totalQuestions },
              { label: "Menit", value: totalMinutes },
            ].map((item) => (
              <Stat
                key={item.label}
                label={item.label}
                value={item.value}
                className="bg-chassis-2 px-4 py-3.5"
              />
            ))}
          </dl>

          <div className="mt-8">
            <StartButton
              allPassed={allPassed}
              size="lg"
              icon={<FiPlay aria-hidden size={15} />}
              onStart={onStart}
            />
          </div>
        </div>

        <ProctorChecklist
          checks={checks}
          allPassed={allPassed}
          refreshing={refreshing}
          onRecheck={recheck}
        />
      </section>
    </main>
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
    } else if (session.status === "berlangsung") {
      setPhase("run");
    } else {
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

  if (phase === "resume" && session) {
    const section = sections[session.section];
    const left = Math.max(0, session.deadline - now);
    const violationsCount = session.violations?.length ?? 0;

    return (
      <main className="min-h-screen">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Brand />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-input px-2.5 py-1.5 text-sm text-chalk-2 transition-colors hover:bg-fill hover:text-chalk"
          >
            <FiArrowLeft aria-hidden size={15} />
            Beranda
          </Link>
        </header>

        <div className="mx-auto w-full max-w-lg px-5 pb-16 sm:px-8">
          <section className="panel p-6">
            <p className="field text-chalk-2">Sesi berjalan</p>
            <h1 className="mt-2 text-xl font-semibold text-chalk">{session.candidate.name}</h1>

            <dl className="mt-6 divide-y divide-chassis-3 border-y border-chassis-3">
              {[
                { label: "Subtes", value: section?.name ?? "—" },
                {
                  label: "Sisa waktu",
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <FiClock aria-hidden size={14} className="text-chalk-2" />
                      <span className="readout">{clock(left)}</span>
                    </span>
                  ),
                },
                { label: "Terjawab", value: Object.keys(session.answers).length },
                { label: "Pelanggaran", value: `${violationsCount}/${config.maxViolations}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-chalk-2">{row.label}</dt>
                  <dd className="readout text-chalk">{row.value}</dd>
                </div>
              ))}
            </dl>

            <StartButton
              className="mt-6 w-full"
              size="lg"
              label="Lanjutkan"
              icon={<FiPlay aria-hidden size={15} />}
              onStart={() => setPhase("run")}
            />
          </section>
        </div>
      </main>
    );
  }

  return <EntryScreen identity={identity} onStart={handleStart} />;
}
