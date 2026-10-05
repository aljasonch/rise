"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import { Button, Card } from "@/components/ui";
import { config } from "@/lib/config";
import { watchSingleFace } from "@/lib/face";
import { getCamera, getScreen, streams } from "@/lib/media";
import { useStore } from "@/lib/store";

type State = "menunggu" | "siap" | "gagal";

const stateText: Record<State, string> = {
  menunggu: "Menunggu",
  siap: "Siap",
  gagal: "Gagal",
};

const stateTone: Record<State, string> = {
  menunggu: "text-muted",
  siap: "text-ok",
  gagal: "text-danger",
};

const browserOk = () => "isExtended" in screen && !matchMedia("(pointer: coarse)").matches;

const StatusIcon = ({ state }: { state: State }) => {
  if (state === "siap") return <FiCheckCircle size={18} className="text-ok" />;
  if (state === "gagal") return <FiXCircle size={18} className="text-danger" />;
  return <FiClock size={18} className="text-muted" />;
};

export default function Check({ onBegin }: { onBegin: () => void }) {
  const start = useStore((s) => s.start);

  const [browser, setBrowser] = useState<State>("menunggu");
  const [camera, setCamera] = useState<State>("menunggu");
  const [face, setFace] = useState<State>("menunggu");
  const [sharing, setSharing] = useState<State>("menunggu");
  const [display, setDisplay] = useState<State>("menunggu");
  const [consent, setConsent] = useState(false);

  const previewRef = useRef<HTMLVideoElement>(null);

  // Browser dan jumlah layar bisa diperiksa tanpa izin pengguna.
  useEffect(() => {
    const read = () => {
      setBrowser(browserOk() ? "siap" : "gagal");
      setDisplay(screen.isExtended ? "gagal" : "siap");
    };
    read();
    screen.addEventListener("change", read);
    return () => screen.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    const video = previewRef.current;
    if (!video || !streams.cam) return;
    video.srcObject = streams.cam;
    video.play().catch(() => {});
  }, [camera]);

  // Wajah dihitung pada pratinjau di baris Kamera.
  useEffect(() => {
    const video = previewRef.current;
    if (camera !== "siap" || !video) return;
    let settled = false;
    return watchSingleFace(video, (ready) => {
      if (ready) {
        settled = true;
        setFace("siap");
        return;
      }
      if (!settled) setFace("gagal");
    });
  }, [camera]);

  const allowCamera = async () => {
    try {
      await getCamera();
      setCamera("siap");
    } catch {
      setCamera("gagal");
    }
  };

  const allowScreen = async () => {
    try {
      await getScreen();
      setSharing("siap");
    } catch {
      setSharing("gagal");
    }
  };

  const ready = [browser, camera, face, sharing, display].every((s) => s === "siap");

  const begin = async () => {
    // Fullscreen harus diminta di dalam klik yang sama karena butuh gestur pengguna.
    await document.documentElement.requestFullscreen();
    await navigator.keyboard?.lock?.(["Escape"]);
    start();
    onBegin();
  };

  const rows = [
    { label: "Browser", state: browser, error: "Gunakan Chrome atau Edge di komputer" },
    { label: "Kamera", state: camera, error: "Gunakan Chrome atau Edge di komputer" },
    { label: "Wajah", state: face, error: "Tampilkan satu wajah di kamera" },
    { label: "Berbagi layar", state: sharing, error: "Pilih seluruh layar" },
    { label: "Layar", state: display, error: "Lepas layar tambahan" },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center px-8">
      <Card className="w-full p-8" style={{ maxWidth: config.width.card }}>
        <h1 className="text-lg font-semibold">Persiapan</h1>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-3 py-3">
              <StatusIcon state={row.state} />

              <div className="min-w-0 flex-1">
                <p className="text-sm">{row.label}</p>
                {row.state === "gagal" && <p className="mt-0.5 text-xs text-danger">{row.error}</p>}
              </div>

              {row.label === "Kamera" && camera === "siap" && (
                <video
                  ref={previewRef}
                  muted
                  playsInline
                  className="rounded-input border border-line object-cover"
                  style={{ width: config.preview.w, height: config.preview.h }}
                />
              )}

              <span className={`w-20 text-right text-sm ${stateTone[row.state]}`}>{stateText[row.state]}</span>

              {row.label === "Kamera" && camera !== "siap" && (
                <Button variant="outline" onClick={allowCamera}>
                  {camera === "gagal" ? "Coba lagi" : "Izinkan"}
                </Button>
              )}

              {row.label === "Berbagi layar" && sharing !== "siap" && (
                <Button variant="outline" onClick={allowScreen}>
                  {sharing === "gagal" ? "Coba lagi" : "Bagikan layar"}
                </Button>
              )}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--ink)]"
          />
          Saya menyetujui pemantauan kamera dan layar selama tes
        </label>

        <Button className="mt-6 w-full justify-center" disabled={!ready || !consent} onClick={begin}>
          Mulai tes
        </Button>
      </Card>
    </main>
  );
}
