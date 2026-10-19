"use client";

import { useState } from "react";
import { FiAlertCircle, FiCamera, FiMaximize2, FiMonitor } from "react-icons/fi";
import { Button, Card } from "@/components/ui";
import type { Blocked } from "@/lib/useProctor";

const copy = {
  fullscreen: {
    title: "Kembali ke layar penuh",
    description:
      "Tes hanya boleh berjalan dalam layar penuh. Timer tetap berjalan selama layar ini ditampilkan.",
    action: "Buka layar penuh",
    icon: FiMaximize2,
    steps: [
      "Klik tombol di bawah.",
      "Izinkan browser membuka layar penuh.",
      "Jangan tekan Escape selama tes berlangsung.",
    ],
  },
  camera: {
    title: "Kamera terputus",
    description:
      "Pemantauan kamera berhenti. Sambungkan kembali kamera fisik untuk melanjutkan. Kamera virtual tidak diterima.",
    action: "Aktifkan kamera",
    icon: FiCamera,
    steps: [
      "Pastikan kamera fisik tersambung dan tidak tertutup.",
      "Tutup aplikasi lain yang sedang memakai kamera.",
      "Klik tombol dan pilih kamera fisik jika diminta.",
    ],
  },
  screen: {
    title: "Berbagi layar berhenti",
    description:
      "Pengawas tidak dapat melihat layar Anda. Bagikan seluruh layar lagi untuk melanjutkan.",
    action: "Bagikan layar",
    icon: FiMonitor,
    steps: [
      "Klik tombol di bawah.",
      "Pilih opsi Seluruh layar, bukan jendela atau tab.",
      "Jangan hentikan berbagi dari bilah browser.",
    ],
  },
} as const;

// Menutup seluruh area tes, bukan hanya blur, timer tetap berjalan di belakang.
export default function Overlay({
  blocked,
  onRestore,
  error,
}: {
  blocked: Exclude<Blocked, null>;
  onRestore: () => Promise<void>;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const { title, description, action, icon: Icon, steps } = copy[blocked];

  const restore = async () => {
    setBusy(true);
    try {
      await onRestore();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blocked-title"
      aria-describedby="blocked-description"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/95 p-5"
    >
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-full border border-danger/20 bg-surface-muted text-danger">
          <Icon aria-hidden size={22} />
        </span>

        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.1em] text-danger">Tes dijeda</p>
        <h2 id="blocked-title" className="mt-1.5 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p id="blocked-description" className="mt-2 text-sm leading-relaxed text-muted">
          {description}
        </p>

        <ol className="mt-5 space-y-2.5 border-y border-line py-4">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm">
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line bg-surface-muted text-[10px] font-semibold text-muted">
                {index + 1}
              </span>
              <span className="leading-relaxed text-muted">{step}</span>
            </li>
          ))}
        </ol>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-input border border-danger/20 bg-surface-muted p-3 text-xs leading-relaxed text-danger">
            <FiAlertCircle aria-hidden size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <Button
          className="mt-5 w-full"
          size="lg"
          autoFocus
          loading={busy}
          icon={<Icon aria-hidden size={16} />}
          onClick={() => void restore()}
        >
          {action}
        </Button>

        <p className="mt-3 text-center text-xs text-muted">
          Timer tes tetap berjalan sampai pengawasan pulih.
        </p>
      </Card>
    </div>
  );
}
