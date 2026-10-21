"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiPlay } from "react-icons/fi";
import { Brand, Stat } from "@/components/ui";
import { sections, totalMinutes, totalQuestions } from "@/data/test";
import { ProctorChecklist, StartButton, useProctorPrecheck } from "@/lib/proctor";
import { defaultSsoUser, useStore } from "@/lib/store";

export default function Page() {
  const router = useRouter();
  const start = useStore((state) => state.start);
  const candidate = defaultSsoUser;
  const { checks, allPassed, refreshing, recheck } = useProctorPrecheck();

  const handleStart = () => {
    start(candidate);
    router.push("/test");
  };

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Brand />
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-input border border-hairline px-3 py-1.5 text-sm text-fg-2 transition-colors hover:bg-fill hover:text-fg"
        >
          Admin
          <FiArrowRight aria-hidden size={15} />
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-12 lg:pt-10">
        <div className="lg:sticky lg:top-24">
          <h1 className="max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-chalk sm:text-5xl">
            Asesmen psikotes
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-chalk-2">
            {candidate.name} — {candidate.position}
          </p>

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
              onStart={handleStart}
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
