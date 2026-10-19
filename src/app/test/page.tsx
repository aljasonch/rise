"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiAlertCircle, FiArrowLeft, FiClock, FiMaximize2, FiMonitor, FiPlay, FiShield } from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { Button, Card } from "@/components/ui";
import { sections } from "@/data/test";
import { emptyIdentity, type Identity } from "@/lib/identity";
import { getCamera, getScreen, mediaIssue, stopStreams } from "@/lib/media";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import Check from "@/components/test/Check";
import End from "@/components/test/End";
import Intro from "@/components/test/Intro";
import Run from "@/components/test/Run";

type Phase = "intro" | "check" | "run" | "end" | "resume";
type Issue = { title: string; message: string };

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

  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeIssue, setResumeIssue] = useState<Issue | null>(null);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const now = useNow(1000);

  // Jika peserta meninggalkan halaman sebelum tes dimulai, jangan biarkan
  // kamera dan layar tetap aktif di latar belakang.
  useEffect(
    () => () => {
      stopStreams();
    },
    [],
  );

  // Sinkronisasi ke status store tanpa menimpa fase yang sedang dijalankan.
  if (session?.id !== seen.id) {
    setSeen({ id: session?.id, status: session?.status });
    if (!session) {
      setPhase("intro");
      // Sesi baru harus dimulai dengan identitas kosong, bukan identitas
      // peserta sebelumnya yang masih tersimpan di state halaman.
      setIdentity(emptyIdentity);
    } else if (session.status !== "berlangsung") setPhase("end");
    else if (phase === "intro") setPhase("resume");
  } else if (session && session.status !== seen.status) {
    setSeen({ id: session.id, status: session.status });
    if (session.status !== "berlangsung") setPhase("end");
  }

  const requestFullscreen = async () => {
    await document.documentElement.requestFullscreen();
    if (!document.fullscreenElement) throw new Error("Layar penuh tidak aktif");
    try {
      await navigator.keyboard?.lock?.(["Escape"]);
    } catch {
      // Keyboard Lock tidak tersedia di semua browser.
    }
  };

  const enterFullscreen = async () => {
    setResumeBusy(true);
    setResumeIssue(null);

    try {
      await requestFullscreen();
      setNeedsFullscreen(false);
      setPhase("run");
    } catch {
      setResumeIssue({
        title: "Layar penuh diperlukan",
        message: "Izinkan browser membuka layar penuh, lalu coba lagi.",
      });
    } finally {
      setResumeBusy(false);
    }
  };

  const resume = async () => {
    setResumeBusy(true);
    setResumeIssue(null);
    let step: "camera" | "screen" = "camera";

    try {
      await getCamera();
      step = "screen";
      await getScreen();

      // Dialog izin kamera dan layar dapat mengeluarkan browser dari
      // fullscreen. Masuk lagi sebelum Run dipasang supaya tidak tercatat
      // sebagai pelanggaran keluar layar penuh.
      try {
        await requestFullscreen();
        setNeedsFullscreen(false);
        setPhase("run");
      } catch {
        // Aktivasi pengguna bisa habis selama dialog izin. Minta satu klik
        // lagi, tetapi jangan jalankan tes tanpa layar penuh.
        setNeedsFullscreen(true);
      }
    } catch (error) {
      setResumeIssue(mediaIssue(error, step));
      stopStreams();
      if (document.fullscreenElement) await document.exitFullscreen();
    } finally {
      setResumeBusy(false);
    }
  };

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
              <FiShield aria-hidden size={22} />
            </span>

            <h1 className="mt-5 text-xl font-semibold tracking-tight">Lanjutkan sesi</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {needsFullscreen ? (
                <>
                  Kamera dan berbagi layar sudah terhubung. Satu klik lagi untuk masuk layar
                  penuh sebelum tes dilanjutkan.
                </>
              ) : (
                <>
                  Sesi atas nama{" "}
                  <span className="font-medium text-ink">{session.candidate.name}</span> masih
                  berjalan. Kamera, berbagi layar, dan layar penuh akan diminta lagi.
                </>
              )}
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

            {needsFullscreen && (
              <p className="mt-4 flex items-start gap-2 rounded-input border border-line bg-surface-muted p-3 text-xs leading-relaxed text-muted">
                <FiMaximize2 aria-hidden size={14} className="mt-0.5 shrink-0" />
                Kamera dan layar sudah siap. Klik Masuk layar penuh agar tes dimulai dalam layar
                penuh dan tidak dianggap keluar dari layar penuh.
              </p>
            )}

            {resumeIssue && (
              <p className="mt-4 flex items-start gap-1.5 rounded-input border border-danger/20 bg-surface-muted p-3 text-xs leading-relaxed text-danger">
                <FiAlertCircle aria-hidden size={14} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">{resumeIssue.title}.</span> {resumeIssue.message}
                </span>
              </p>
            )}

            {needsFullscreen ? (
              <Button
                className="mt-6 w-full"
                size="lg"
                loading={resumeBusy}
                icon={<FiMaximize2 aria-hidden size={16} />}
                onClick={() => void enterFullscreen()}
              >
                Masuk layar penuh
              </Button>
            ) : (
              <Button
                className="mt-6 w-full"
                size="lg"
                loading={resumeBusy}
                icon={<FiPlay aria-hidden size={16} />}
                onClick={() => void resume()}
              >
                Lanjutkan sesi
              </Button>
            )}

            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <FiMonitor aria-hidden size={13} className="mt-0.5 shrink-0" />
              Jangan tutup browser atau mematikan kamera selama sesi berlangsung.
            </p>
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
