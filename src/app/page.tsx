"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiPlay,
} from "react-icons/fi";
import { Brand } from "@/components/ui";
import { sections, totalMinutes, totalQuestions } from "@/data/test";
import { defaultSsoUser, useStore } from "@/lib/store";

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
  const router = useRouter();
  const start = useStore((state) => state.start);
  const candidate = defaultSsoUser;

  const handleStart = () => {
    start(candidate);
    router.push("/test");
  };

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-input border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-muted"
        >
          Panel admin
          <FiArrowRight aria-hidden size={15} />
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-12">
        <div>
          <p className="text-sm font-medium text-muted">
            Hai, <span className="font-semibold text-ink">{candidate.name}</span>
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
