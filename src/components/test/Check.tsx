"use client";

import { useState } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiPlay,
} from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { Stepper } from "@/components/Stepper";
import { Badge, Button, Card } from "@/components/ui";
import { sections, totalMinutes, totalQuestions } from "@/data/test";
import type { Identity } from "@/lib/identity";
import { useStore } from "@/lib/store";

export default function Check({
  identity,
  onBegin,
  onBack,
}: {
  identity: Identity;
  onBegin: () => void;
  onBack: () => void;
}) {
  const start = useStore((state) => state.start);
  const [consent, setConsent] = useState(false);

  const handleStart = () => {
    if (!consent) return;
    start(identity);
    onBegin();
  };

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-input px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <FiArrowLeft aria-hidden size={15} />
          Ubah identitas
        </button>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-2 sm:px-8">
        <Stepper current={2} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-8">
          <Card className="p-6 sm:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Langkah 2 dari 3</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Persiapan asesmen</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Pastikan Anda berada di lingkungan yang tenang dan siap mengerjakan tes tanpa gangguan.
            </p>

            <div className="mt-6 space-y-4 border-y border-line py-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input border border-line bg-surface-muted text-ink">
                  <FiClock aria-hidden size={15} />
                </span>
                <div>
                  <p className="text-sm font-medium">Batas waktu per subtes</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Setiap subtes memiliki pengatur waktu tersendiri. Waktu akan terus berjalan setelah subtes dimulai.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input border border-line bg-surface-muted text-ink">
                  <FiLayers aria-hidden size={15} />
                </span>
                <div>
                  <p className="text-sm font-medium">Navigasi subtes searah</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Setelah berpindah ke subtes berikutnya, Anda tidak dapat kembali ke subtes sebelumnya.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input border border-line bg-surface-muted text-ink">
                  <FiCheckCircle aria-hidden size={15} />
                </span>
                <div>
                  <p className="text-sm font-medium">Penyimpanan otomatis</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Setiap opsi yang Anda pilih langsung disimpan secara lokal di perangkat Anda.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-input border border-line bg-surface-muted p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 size-4 rounded border-line text-accent focus:ring-accent"
                />
                <span className="text-xs leading-relaxed text-ink">
                  Saya menyatakan bahwa data identitas yang saya masukkan adalah benar, dan saya siap
                  mengerjakan seluruh rangkaian asesmen ini secara mandiri dan jujur.
                </span>
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="secondary" onClick={onBack}>
                Kembali
              </Button>
              <Button
                disabled={!consent}
                onClick={handleStart}
                icon={<FiPlay aria-hidden size={16} />}
              >
                Mulai tes sekarang
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Peserta terdaftar</h2>
                <Badge tone="accent">Langkah 2</Badge>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <p className="font-medium text-ink">{identity.name}</p>
                <p className="text-muted">{identity.position}</p>
                <p className="font-mono text-muted">{identity.email}</p>
                {identity.verificationCode && (
                  <p className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-muted">
                    Kode: {identity.verificationCode}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Ringkasan subtes</h2>
                <span className="text-xs text-muted">{totalMinutes} menit</span>
              </div>

              <ol className="mt-4 divide-y divide-line border-y border-line">
                {sections.map((section, idx) => (
                  <li key={section.id} className="flex items-start gap-3 py-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line bg-surface-muted text-[10px] font-semibold text-muted">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{section.name}</p>
                      <p className="text-[11px] text-muted">{section.questions.length} soal</p>
                    </div>
                    <span className="text-xs tabular-nums text-muted">{section.minutes} mnt</span>
                  </li>
                ))}
              </ol>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted">Total</span>
                <span className="font-medium tabular-nums">{totalQuestions} soal</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
