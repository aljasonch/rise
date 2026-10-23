"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCamera,
  FiCheck,
  FiGlobe,
  FiLoader,
  FiMonitor,
  FiRefreshCw,
  FiWifi,
  FiX,
} from "react-icons/fi";
import { set as idbSet } from "idb-keyval";
import { Button } from "@/components/ui";
import { isMobileDevice, isVirtualCamera } from "@/lib/guards";
import {
  config,
  useStore,
  violationLabel,
  type PrecheckKind,
  type Violation,
  type ViolationKind,
} from "@/lib/store";

export type CheckState = "checking" | "ok" | "fail";

export type CheckItem = {
  kind: PrecheckKind;
  label: string;
  state: CheckState;
  detail: string;
  note?: string;
  pingMs?: number;
};

type NavigatorUABrand = { brand: string; version: string };
type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    brands?: NavigatorUABrand[];
    mobile?: boolean;
  };
  brave?: unknown;
  keyboard?: {
    lock?: (keyCodes?: string[]) => Promise<void>;
    unlock?: () => void;
  };
  connection?: {
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
  };
};

type ScreenWithExtended = Screen & {
  isExtended?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

// ==========================================
// 0. Wajib Berbagi Seluruh Layar (dipanggil di dalam gesture klik Mulai)
// ==========================================
let screenStream: MediaStream | null = null;
let screenVideo: HTMLVideoElement | null = null;
let shareEndedHandler: (() => void) | null = null;

export function setShareEndedHandler(fn: (() => void) | null) {
  shareEndedHandler = fn;
}

export const screenShareActive = () =>
  Boolean(screenStream?.getVideoTracks().some((track) => track.readyState === "live"));

function releaseScreenShare() {
  screenStream?.getTracks().forEach((track) => track.stop());
  screenStream = null;
  if (screenVideo) {
    screenVideo.pause();
    screenVideo.srcObject = null;
  }
}

// Salinan asli disimpan karena guard memasang patch penolak di mediaDevices.getDisplayMedia.
const nativeGetDisplayMedia =
  typeof navigator !== "undefined" ? navigator.mediaDevices?.getDisplayMedia.bind(navigator.mediaDevices) : undefined;

// Gagal = resolve tanpa throw; pemanggil memeriksa guardScreenShare().
export async function requestScreenShare(): Promise<void> {
  if (guardScreenShare() || !nativeGetDisplayMedia) return;
  releaseScreenShare();
  try {
    const stream = await nativeGetDisplayMedia({
      video: { displaySurface: "monitor" },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    if (track.getSettings().displaySurface !== "monitor") {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    track.addEventListener("ended", () => shareEndedHandler?.());
    screenStream = stream;
  } catch {
    // Ditolak atau tidak didukung
  }
}

export function guardScreenShare() {
  const live =
    screenStream?.getVideoTracks().filter((track) => track.readyState === "live") ?? [];
  // Tergantung kebijakan browser, pilihan Tab/Jendela bisa dilaporkan "monitor" saat share.
  // Bukti sesi (tangkapan layar berkala) menutup kasus itu pada peninjauan.
  return live.length > 0 && live.every((track) => track.getSettings().displaySurface === "monitor");
}

// Frame video -> JPEG data URL; layar diperkecil agar entri IndexedDB tetap kecil.
function frameOf(video: HTMLVideoElement | null, maxWidth: number): string | undefined {
  if (!video?.videoWidth) return;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
}

async function captureScreen(): Promise<string | undefined> {
  if (!screenStream || !screenShareActive()) return;
  if (!screenVideo) {
    screenVideo = document.createElement("video");
    screenVideo.muted = true;
    screenVideo.playsInline = true;
  }
  if (screenVideo.srcObject !== screenStream) screenVideo.srcObject = screenStream;
  if (screenVideo.paused) await screenVideo.play();
  return frameOf(screenVideo, 1280);
}

export type CaptureMoment = "mulai" | "berkala" | "selesai";
export type Capture = { moment: CaptureMoment; timestamp: number; screen?: string; camera?: string };

// Hanya memakai stream yang masih hidup, jadi tidak pernah memicu prompt izin baru.
// ponytail: tanpa kuota/eviction handling; pindah ke backend bila bukti harus permanen.
export async function captureEvidence(sessionId: string, moment: CaptureMoment): Promise<void> {
  const camera = captureSnapshot();
  const screen = await captureScreen().catch(() => undefined);
  if (!screen && !camera) return;
  const timestamp = Date.now();
  const entry: Capture = { moment, timestamp, screen, camera };
  await idbSet(`capture:${sessionId}:${String(timestamp)}`, entry).catch(() => undefined);
}

export function stopScreenEvidence() {
  releaseScreenShare();
}

// ==========================================
// 1. Pemeriksaan Browser, Monitor, & Internet (+ Ping)
// ==========================================
export function checkBrowser(): { ok: boolean; detail: string } {
  if (typeof window === "undefined") {
    return { ok: false, detail: "Memeriksa..." };
  }

  const nav = window.navigator as NavigatorWithUAData;
  const ua = nav.userAgent || "";

  if (nav.brave || /OPR\/|Opera|Vivaldi|Firefox\/|FxiOS/i.test(ua)) {
    return { ok: false, detail: "Harus Chrome atau Edge" };
  }

  const touchOnly =
    window.matchMedia("(pointer: coarse)").matches &&
    !window.matchMedia("(any-pointer: fine)").matches;
  if (isMobileDevice(ua, nav.userAgentData?.mobile, touchOnly)) {
    return { ok: false, detail: "Hanya laptop/desktop" };
  }

  const brands = nav.userAgentData?.brands ?? [];
  if (brands.length > 0) {
    const isEdge = brands.some((b) => /Microsoft Edge/i.test(b.brand));
    const isChrome = brands.some((b) => /Google Chrome/i.test(b.brand));
    if (isEdge) return { ok: true, detail: "Microsoft Edge" };
    if (isChrome) return { ok: true, detail: "Google Chrome" };
    return { ok: false, detail: "Harus Chrome atau Edge" };
  }

  if (/Edg\//i.test(ua)) return { ok: true, detail: "Microsoft Edge" };
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    return { ok: true, detail: "Google Chrome" };
  }

  return { ok: false, detail: "Harus Chrome atau Edge" };
}

export function checkMonitor(): { ok: boolean; detail: string } {
  if (typeof window === "undefined") {
    return { ok: false, detail: "Memeriksa..." };
  }

  const scr = window.screen as ScreenWithExtended;
  if (scr.isExtended === true) {
    return { ok: false, detail: "Monitor eksternal terdeteksi" };
  }

  return { ok: true, detail: "Layar tunggal" };
}

export async function checkInternet(): Promise<{ ok: boolean; detail: string; pingMs?: number }> {
  if (typeof window === "undefined") {
    return { ok: false, detail: "Memeriksa..." };
  }

  const nav = window.navigator as NavigatorWithUAData;
  if (!nav.onLine) {
    return { ok: false, detail: "Terputus" };
  }

  const conn = nav.connection;
  if (conn?.effectiveType === "slow-2g") {
    return { ok: false, detail: "Terlalu lambat" };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);
  const startMs = performance.now();

  try {
    const res = await fetch(`${window.location.origin}/?_ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    const pingMs = Math.max(1, Math.round(performance.now() - startMs));
    window.clearTimeout(timeout);

    if (!res.ok && res.status >= 500) {
      return { ok: false, detail: "Server tidak terjangkau", pingMs };
    }
    if (pingMs > 2500) {
      return { ok: false, detail: "Latensi terlalu tinggi", pingMs };
    }

    return { ok: true, pingMs, detail: "Terhubung" };
  } catch {
    window.clearTimeout(timeout);
    return { ok: false, detail: "Tidak dapat menjangkau jaringan" };
  }
}

// ==========================================
// 2. Fullscreen Mode Helpers
// ==========================================
export function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.fullscreenElement);
}

export async function enterFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }
    try {
      const nav = window.navigator as NavigatorWithUAData;
      // Tanpa argumen = kunci semua tombol sistem (Meta/Win, Alt+Tab, Esc, F11) di Chromium Fullscreen + HTTPS.
      await nav.keyboard?.lock?.();
    } catch {
      // Abaikan jika browser tidak mendukung Keyboard Lock API
    }
    return true;
  } catch {
    return Boolean(document.fullscreenElement);
  }
}

export async function exitFullscreenIfActive(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    const nav = window.navigator as NavigatorWithUAData;
    nav.keyboard?.unlock?.();
  } catch {
    // Abaikan
  }
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // Abaikan jika sudah keluar
  }
}

// ==========================================
// 3. Singleton Offscreen Webcam & FaceDetector
// ==========================================
type FaceDetectorInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { detections: Array<unknown> };
};

let sharedStream: MediaStream | null = null;
let sharedVideo: HTMLVideoElement | null = null;
let cameraLabel = "";
let detectorPromise: Promise<FaceDetectorInstance> | null = null;
let lastVideoTimestamp = -1;

async function getFaceDetector(): Promise<FaceDetectorInstance> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "/mediapipe/blaze_face_short_range.tflite",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });
    })().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

// Snapshot frame kamera (data URL JPEG) untuk bukti pelanggaran dan tangkapan berkala.
function captureSnapshot(): string | undefined {
  const live = sharedStream?.getVideoTracks().some((track) => track.readyState === "live");
  return live ? frameOf(sharedVideo, 640) : undefined;
}

async function ensureOffscreenVideo(): Promise<HTMLVideoElement> {
  const hasLiveTrack =
    sharedStream &&
    sharedStream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled);

  // Kamera dicabut/dimatikan atau diganti kamera lain: pakai label track yang sedang aktif.
  const resetStream =
    hasLiveTrack &&
    (isVirtualCamera(sharedStream!.getVideoTracks()[0].label) ||
      sharedStream!.getVideoTracks()[0].label !== cameraLabel);
  if (!hasLiveTrack || resetStream) {
    if (sharedStream) {
      sharedStream.getTracks().forEach((t) => t.stop());
      sharedStream = null;
    }
    sharedStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });
    // Jika browser memilih kamera virtual sebagai default, alihkan ke kamera fisik bila tersedia.
    if (isVirtualCamera(sharedStream.getVideoTracks()[0]?.label ?? "")) {
      const devices = (await navigator.mediaDevices.enumerateDevices?.()) ?? [];
      const physical = devices.find(
        (d) => d.kind === "videoinput" && d.deviceId && d.label && !isVirtualCamera(d.label),
      );
      if (physical) {
        sharedStream.getTracks().forEach((t) => t.stop());
        sharedStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: physical.deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      }
    }
    cameraLabel = sharedStream.getVideoTracks()[0]?.label ?? "";
  }

  if (!sharedVideo) {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    sharedVideo = video;
  }

  if (sharedVideo.srcObject !== sharedStream) {
    sharedVideo.srcObject = sharedStream;
    await sharedVideo.play();
  } else if (sharedVideo.paused) {
    await sharedVideo.play();
  }

  return sharedVideo;
}

export function stopProctorStream() {
  if (sharedStream) {
    sharedStream.getTracks().forEach((track) => track.stop());
    sharedStream = null;
  }
  if (sharedVideo) {
    sharedVideo.pause();
    sharedVideo.srcObject = null;
  }
}

export function CameraPreview({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => {
      const video = videoRef.current;
      const live = Boolean(
        sharedStream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled),
      );
      setActive(live);
      if (!video) return;
      if (live && video.srcObject !== sharedStream) {
        video.srcObject = sharedStream;
        void video.play().catch(() => undefined);
      } else if (!live && video.srcObject) {
        video.srcObject = null;
      }
    };
    sync();
    const id = window.setInterval(sync, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-input border border-chassis-3 bg-chassis-2 ${className}`}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={`h-full w-full -scale-x-100 object-cover ${active ? "block" : "hidden"}`}
      />
      {!active && (
        <div className="grid h-full w-full place-items-center text-chalk-2">
          <FiCamera aria-hidden size={18} />
        </div>
      )}
      <span
        aria-hidden
        className={`absolute right-2 top-2 size-2 rounded-full ${
          active ? "bg-ok-fg" : "bg-danger-fg"
        }`}
      />
    </div>
  );
}

const vcamNote = "Tutup aplikasi kamera virtual, lalu Periksa ulang.";

export async function checkWebcamFace(): Promise<{ ok: boolean; detail: string; note?: string }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, detail: "Webcam tidak didukung" };
  }

  try {
    const [video, detector] = await Promise.all([
      ensureOffscreenVideo(),
      getFaceDetector().catch((err) => {
        console.error("Gagal memuat detektor wajah", err);
        throw new Error("detector");
      }),
    ]);
    const track = sharedStream?.getVideoTracks()[0];

    if (!track || track.readyState !== "live" || track.muted) {
      return { ok: false, detail: "Kamera tidak aktif" };
    }

    if (isVirtualCamera(track.label)) {
      return {
        ok: false,
        detail: `Kamera virtual terdeteksi: ${track.label}`,
        note: vcamNote,
      };
    }

    const devices = (await navigator.mediaDevices.enumerateDevices?.()) ?? [];
    const installedVcam = devices.find(
      (d) => d.kind === "videoinput" && d.label && isVirtualCamera(d.label),
    );
    if (installedVcam && process.env.NEXT_PUBLIC_ALLOW_INSTALLED_VCAM !== "true") {
      return {
        ok: false,
        detail: `Kamera virtual terdeteksi: ${installedVcam.label}`,
        note: vcamNote,
      };
    }

    if (video.readyState < 2 || video.videoWidth === 0) {
      return { ok: false, detail: "Menyiapkan kamera..." };
    }

    const nowMs = Math.max(lastVideoTimestamp + 1, Math.floor(performance.now()));
    lastVideoTimestamp = nowMs;

    const result = detector.detectForVideo(video, nowMs);
    const count = result.detections?.length ?? 0;

    if (count === 0) {
      return { ok: false, detail: "Wajah tidak terdeteksi" };
    }
    if (count > 1) {
      return { ok: false, detail: `${count} wajah (wajib sendiri)` };
    }

    return {
      ok: true,
      detail: "1 wajah terdeteksi",
      ...(installedVcam
        ? { note: `Kamera virtual terpasang (${installedVcam.label}) diabaikan untuk mode uji.` }
        : {}),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "detector") {
      return { ok: false, detail: "Gagal memuat detektor wajah" };
    }
    return { ok: false, detail: "Akses webcam ditolak" };
  }
}

// ==========================================
// 4. Hook Pre-Check untuk Halaman Mulai (/ dan /test)
// ==========================================
const initialChecks: Record<PrecheckKind, CheckItem> = {
  browser: {
    kind: "browser",
    label: "Browser",
    state: "checking",
    detail: "Memeriksa...",
  },
  internet: {
    kind: "internet",
    label: "Internet",
    state: "checking",
    detail: "Memeriksa...",
  },
  monitor: {
    kind: "monitor",
    label: "Layar eksternal",
    state: "checking",
    detail: "Memeriksa...",
  },
  webcam: {
    kind: "webcam",
    label: "Kamera & wajah",
    state: "checking",
    detail: "Memeriksa...",
  },
};

export function useProctorPrecheck() {
  const [checks, setChecks] = useState<Record<PrecheckKind, CheckItem>>(initialChecks);
  const [refreshing, setRefreshing] = useState(false);

  const runAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);

    const browserRes = checkBrowser();
    const monitorRes = checkMonitor();

    setChecks((prev) => ({
      ...prev,
      browser: {
        ...prev.browser,
        state: browserRes.ok ? "ok" : "fail",
        detail: browserRes.detail,
      },
      monitor: {
        ...prev.monitor,
        state: monitorRes.ok ? "ok" : "fail",
        detail: monitorRes.detail,
      },
    }));

    const [netRes, camRes] = await Promise.all([checkInternet(), checkWebcamFace()]);

    setChecks((prev) => ({
      ...prev,
      internet: {
        ...prev.internet,
        state: netRes.ok ? "ok" : "fail",
        detail: netRes.detail,
        pingMs: netRes.pingMs,
      },
      webcam: {
        ...prev.webcam,
        state: camRes.ok ? "ok" : "fail",
        detail: camRes.detail,
        note: camRes.note,
      },
    }));

    if (showSpinner) setRefreshing(false);
  }, []);

  useEffect(() => {
    const immediate = window.setTimeout(() => {
      void runAll(false);
    }, 0);
    const interval = window.setInterval(() => {
      void runAll(false);
    }, 2200);

    const onScreenChange = () => {
      const monitorRes = checkMonitor();
      setChecks((prev) => ({
        ...prev,
        monitor: {
          ...prev.monitor,
          state: monitorRes.ok ? "ok" : "fail",
          detail: monitorRes.detail,
        },
      }));
    };

    const onNetChange = () => {
      void checkInternet().then((netRes) => {
        setChecks((prev) => ({
          ...prev,
          internet: {
            ...prev.internet,
            state: netRes.ok ? "ok" : "fail",
            detail: netRes.detail,
            pingMs: netRes.pingMs,
          },
        }));
      });
    };

    const scr = window.screen as ScreenWithExtended;
    scr.addEventListener?.("change", onScreenChange);
    window.addEventListener("online", onNetChange);
    window.addEventListener("offline", onNetChange);

    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(interval);
      scr.removeEventListener?.("change", onScreenChange);
      window.removeEventListener("online", onNetChange);
      window.removeEventListener("offline", onNetChange);
    };
  }, [runAll]);

  const list = [checks.browser, checks.internet, checks.monitor, checks.webcam];
  const allPassed = list.every((item) => item.state === "ok");

  return {
    checks: list,
    allPassed,
    refreshing,
    recheck: () => void runAll(true),
  };
}

// Tombol Mulai bersama: fullscreen + wajib berbagi seluruh layar, semuanya di dalam satu gesture klik.
export function StartButton({
  allPassed = true,
  label = "Mulai",
  icon,
  size = "md",
  className = "",
  onStart,
}: {
  allPassed?: boolean;
  label?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  onStart: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button
        size={size}
        className={className}
        disabled={!allPassed}
        loading={busy}
        icon={icon}
        onClick={async () => {
          if (!allPassed) return;
          setBusy(true);
          setError("");
          await enterFullscreen();
          await requestScreenShare();
          setBusy(false);
          if (!guardScreenShare()) {
            void exitFullscreenIfActive();
            setError("Wajib membagikan seluruh layar.");
            return;
          }
          onStart();
        }}
      >
        {label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger-fg">
          {error}
        </p>
      )}
    </>
  );
}

// ==========================================
// 5. Komponen Panel Pre-Check (Kolom Kanan)
// ==========================================
const checkIcons: Record<PrecheckKind, typeof FiGlobe> = {
  browser: FiGlobe,
  internet: FiWifi,
  monitor: FiMonitor,
  webcam: FiCamera,
};

export function ProctorChecklist({
  checks,
  allPassed,
  refreshing,
  onRecheck,
}: {
  checks: CheckItem[];
  allPassed: boolean;
  refreshing: boolean;
  onRecheck: () => void;
}) {
  const passedCount = checks.filter((c) => c.state === "ok").length;

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-chassis-3 px-5 py-3.5">
        <h2 className="field text-chalk-2">Pemeriksaan perangkat</h2>
        <span className="readout text-xs text-chalk-2">
          {passedCount}/{checks.length}
        </span>
      </header>

      <ul className="divide-y divide-chassis-3">
        {checks.map((item) => {
          const Icon = checkIcons[item.kind];
          return (
            <li key={item.kind} className="flex items-start gap-3.5 px-5 py-3.5">
              <span
                aria-hidden
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-input border ${
                  item.state === "ok"
                    ? "border-ok-fg/40 bg-ok-fg/12 text-ok-fg"
                    : item.state === "fail"
                      ? "border-danger-fg/45 bg-danger-fg/12 text-danger-fg"
                      : "border-hairline bg-fill text-chalk-2"
                }`}
              >
                <Icon aria-hidden size={14} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-chalk">{item.label}</p>
                  {item.kind === "internet" && typeof item.pingMs === "number" && (
                    <span className="readout shrink-0 text-xs text-signal">{item.pingMs} ms</span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-xs leading-relaxed ${
                    item.state === "fail" ? "text-danger-fg" : "text-chalk-2"
                  }`}
                >
                  {item.detail}
                </p>
                {item.note && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-chalk-2">{item.note}</p>
                )}
                {item.kind === "webcam" && (
                  <CameraPreview className="mt-2.5 aspect-[4/3] w-48" />
                )}
              </div>

              <span
                aria-label={
                  item.state === "ok"
                    ? "Lolos"
                    : item.state === "fail"
                      ? "Belum memenuhi syarat"
                      : "Memeriksa"
                }
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${
                  item.state === "ok"
                    ? "border-ok-fg bg-ok-fg text-chassis"
                    : item.state === "fail"
                      ? "border-danger-fg/50 bg-danger-fg/15 text-danger-fg"
                      : "border-hairline bg-fill text-chalk-2"
                }`}
              >
                {item.state === "ok" ? (
                  <FiCheck aria-hidden size={13} />
                ) : item.state === "fail" ? (
                  <FiX aria-hidden size={13} />
                ) : (
                  <FiLoader aria-hidden size={13} className="animate-spin" />
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-chassis-3 px-5 py-3">
        <p className="text-xs text-chalk-2">
          {allPassed ? "Siap mulai." : "Perbaiki kendala di atas."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={refreshing}
          icon={<FiRefreshCw aria-hidden size={13} />}
          onClick={onRecheck}
        >
          Periksa ulang
        </Button>
      </div>
    </section>
  );
}

// ==========================================
// 6. Hook Guard Lengkap (Non-UI + UI Proctoring) di Run.tsx
// ==========================================
export function useProctorGuard(enabled: boolean) {
  const recordViolation = useStore((state) => state.recordViolation);
  const sessionId = useStore((state) => state.activeId);
  const violationsCount = useStore(
    (state) => state.sessions[state.activeId]?.violations?.length ?? 0,
  );

  const [warning, setWarning] = useState<Violation | null>(null);
  const [blanked, setBlanked] = useState(() => enabled && !guardScreenShare());
  const [blankReason, setBlankReason] = useState(() =>
    enabled && !guardScreenShare()
      ? "Wajib membagikan seluruh layar untuk melanjutkan asesmen."
      : "",
  );
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined" ? Boolean(document.fullscreenElement) : true,
  );

  // Ref ke elemen DOM tirai hitam untuk manipulasi sinkron 0ms (tanpa menunggu render React)
  const shieldRef = useRef<HTMLDivElement | null>(null);
  const warningOpenRef = useRef(false);
  const modifierHeldRef = useRef(false);
  const mountedAtRef = useRef(0);
  // Global cooldown agar 1 insiden (mis. screenshot -> blur -> keluar fullscreen) hanya dihitung 1x
  const ignoreViolationsUntilRef = useRef(0);
  const faceFailStreakRef = useRef(0);
  const netFailStreakRef = useRef(0);

  const setInstantBlackout = useCallback((show: boolean) => {
    const el = shieldRef.current;
    if (!el) return;
    if (show) {
      el.style.display = "flex";
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    } else {
      el.style.display = "none";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }
  }, []);

  const triggerViolation = useCallback(
    (kind: ViolationKind, message: string, shouldBlank = false) => {
      const nowMs = Date.now();
      // Jika pop-up peringatan sedang terbuka atau masih dalam masa transisi singkat, abaikan sepenuhnya
      if (warningOpenRef.current || nowMs < ignoreViolationsUntilRef.current) {
        return;
      }

      // Kunci secara sinkron di milidetik yang sama agar event susulan (blur/visibility/fullscreen) tidak ikut tercatat
      warningOpenRef.current = true;

      if (shouldBlank) {
        setInstantBlackout(true);
        setBlanked(true);
        setBlankReason(message);
      }

      // Frame kamera saat insiden; webcam sedang diblokir tetap memakai frame terakhir.
      const snapshot = captureSnapshot();
      const recorded = recordViolation(kind, message, Boolean(snapshot));
      if (recorded) {
        if (snapshot) {
          void idbSet(`snapshot:${recorded.id}`, snapshot).catch(() => undefined);
        }
        setWarning(recorded);
      } else {
        warningOpenRef.current = false;
      }
    },
    [recordViolation, setInstantBlackout],
  );

  const dismissWarning = useCallback(async () => {
    // Tahan pelanggaran baru selama dialog izin berbagi layar / fullscreen terbuka.
    warningOpenRef.current = true;
    setWarning(null);

    await enterFullscreen();
    await requestScreenShare();
    const fsOk = isFullscreenActive();
    const shareOk = guardScreenShare();

    if (!fsOk || !shareOk) {
      // Tetap kunci layar hitam tanpa menambah hitungan pelanggaran sampai syarat terpenuhi.
      setInstantBlackout(true);
      setBlanked(true);
      setBlankReason(
        !shareOk
          ? "Wajib membagikan seluruh layar untuk melanjutkan asesmen."
          : "Wajib berada dalam mode layar penuh untuk melanjutkan asesmen.",
      );
      setIsFullscreen(fsOk);
      return;
    }

    ignoreViolationsUntilRef.current = Date.now() + 1500;
    warningOpenRef.current = false;
    modifierHeldRef.current = false;
    faceFailStreakRef.current = 0;
    netFailStreakRef.current = 0;

    setInstantBlackout(false);
    setBlanked(false);
    setBlankReason("");
    setIsFullscreen(true);
  }, [setInstantBlackout]);

  // A. Proctoring UI: Pre-emptive DOM Blackout, Disable Copy, Screenshot, Screenrecord, & Full-screen
  useEffect(() => {
    if (!enabled) return;

    mountedAtRef.current = Date.now();
    ignoreViolationsUntilRef.current = Date.now() + 500;

    if (guardScreenShare()) {
      ignoreViolationsUntilRef.current = Date.now() + 1500;
    } else {
      // Sesi dimuat ulang tanpa berbagi seluruh layar: langsung kunci sampai dipulihkan.
      warningOpenRef.current = true;
      setInstantBlackout(true);
    }

    void enterFullscreen().then((ok) => {
      setIsFullscreen(ok);
    });

    const preventCopyAction = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onCopyOrCut = (event: ClipboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      triggerViolation("copy", "Percobaan menyalin teks soal (Copy/Cut dinonaktifkan)");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const code = event.code;
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      // PRE-EMPTIVE BLACKOUT (0ms Sinkron ke DOM):
      // Begitu tombol Meta (Windows/Cmd), Shift, Control, atau Alt ditekan,
      // layar langsung dihitamkan secara sinkron (0ms) sebelum jari sempat menekan 'S' pada Win+Shift+S
      if (
        event.key === "Meta" ||
        event.key === "OS" ||
        event.key === "Shift" ||
        event.key === "Alt" ||
        event.key === "Control" ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        modifierHeldRef.current = true;
        setInstantBlackout(true);
        // Dengan Keyboard Lock aktif, cegah tombol Win/Meta membuka Start Menu OS.
        if (event.key === "Meta" || event.key === "OS" || code === "MetaLeft" || code === "MetaRight") {
          event.preventDefault();
        }
      }

      // Keyboard Lock menangkap pintasan pindah aplikasi / jendela di Windows & macOS sebelum diproses OS:
      // - Windows: Alt+Tab, Alt+Esc, Alt+F4, Win+Tab, Win+D, Win+E
      // - macOS: Cmd+Tab, Cmd+Space (Spotlight), Cmd+` (pindah jendela), Cmd+H (Hide), Cmd+M (Minimize),
      //   Cmd+Q (Quit), Cmd+Option+Esc, Ctrl+Panah (Mission Control / pindah Space)
      if (
        (event.altKey && (key === "tab" || code === "Tab" || key === "escape" || key === "f4")) ||
        (event.metaKey &&
          (key === "tab" ||
            code === "Tab" ||
            code === "Space" ||
            key === " " ||
            code === "Backquote" ||
            ["d", "e", "h", "m", "q"].includes(key))) ||
        (event.ctrlKey && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key))
      ) {
        event.preventDefault();
        event.stopPropagation();
        triggerViolation(
          "screenshot",
          "Pintasan berpindah aplikasi (Alt+Tab / Cmd+Tab / System Shortcut) tidak diizinkan selama tes",
          true,
        );
        return;
      }

      // Keyboard Lock menangkap Escape, F11 (Windows), & Ctrl+Cmd+F (macOS) agar tidak keluar dari Fullscreen.
      if (
        key === "escape" ||
        code === "Escape" ||
        key === "f11" ||
        code === "F11" ||
        (event.metaKey && event.ctrlKey && key === "f")
      ) {
        event.preventDefault();
        event.stopPropagation();
        triggerViolation(
          "fullscreen",
          "Percobaan keluar dari mode layar penuh (Esc / F11 / Ctrl+Cmd+F) tidak diizinkan selama tes",
          true,
        );
        return;
      }

      // Kombinasi Win+Shift (awal dari Win+Shift+S)
      if (event.metaKey && event.shiftKey) {
        event.preventDefault();
        void navigator.clipboard?.writeText?.("").catch(() => undefined);
        triggerViolation(
          "screenshot",
          "Pintasan tangkapan layar (Win+Shift+S / Screenshot) tidak diizinkan selama tes",
          true,
        );
        return;
      }

      const isPrintScreen = key === "printscreen" || code === "PrintScreen" || event.keyCode === 44;
      const isOsScreenshot =
        (event.metaKey && event.shiftKey && (key === "s" || key === "3" || key === "4")) ||
        (event.ctrlKey && event.shiftKey && key === "s");

      if (isPrintScreen || isOsScreenshot) {
        event.preventDefault();
        event.stopPropagation();
        void navigator.clipboard?.writeText?.("").catch(() => undefined);
        triggerViolation(
          "screenshot",
          "Tangkapan layar (Screenshot / Snipping Tool) tidak diizinkan selama tes",
          true,
        );
        return;
      }

      const isScreenRecordShortcut =
        (event.metaKey && event.altKey && key === "r") ||
        (event.metaKey && event.shiftKey && key === "5") ||
        (event.altKey && key === "f9") ||
        (event.metaKey && key === "g");

      if (isScreenRecordShortcut) {
        event.preventDefault();
        event.stopPropagation();
        triggerViolation(
          "screenrecord",
          "Perekaman layar (Screen Record / Game Bar) tidak diizinkan selama tes",
          true,
        );
        return;
      }

      if (
        (ctrlOrMeta && ["c", "x", "u", "p", "s", "a", "w", "t", "n", "r"].includes(key)) ||
        key === "f12" ||
        key === "f5" ||
        (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key))
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (key === "c" || key === "x" || key === "p") {
          triggerViolation("copy", `Shortcut ${key.toUpperCase()} tidak diizinkan selama asesmen`);
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen" || event.code === "PrintScreen" || event.keyCode === 44) {
        event.preventDefault();
        void navigator.clipboard?.writeText?.("").catch(() => undefined);
        triggerViolation(
          "screenshot",
          "Tombol PrintScreen terdeteksi. Screenshot dilarang selama tes.",
          true,
        );
        return;
      }

      // Jika semua modifier dilepas dan tidak ada pelanggaran aktif, buka kembali tirai hitam
      if (!event.metaKey && !event.shiftKey && !event.altKey && !event.ctrlKey) {
        modifierHeldRef.current = false;
        if (!warningOpenRef.current) {
          setInstantBlackout(false);
          setBlanked(false);
          setBlankReason("");
        }
      }
    };

    // Jika Snipping Tool dibuka (atau pindah aplikasi), jadikan 1 pelanggaran saja bersama screenshot
    const onWindowBlur = (event: FocusEvent) => {
      // Pastikan hanya event blur milik window utama, BUKAN perpindahan fokus elemen tombol/modal di dalam halaman
      if (event.target !== window) return;
      if (Date.now() < ignoreViolationsUntilRef.current || warningOpenRef.current) {
        return;
      }
      const wasShortcut = modifierHeldRef.current;
      modifierHeldRef.current = false;
      void navigator.clipboard?.writeText?.("").catch(() => undefined);

      triggerViolation(
        "screenshot",
        wasShortcut
          ? "Tangkapan layar (Screenshot / Snipping Tool) tidak diizinkan selama tes"
          : "Meninggalkan jendela ujian / membuka aplikasi tangkapan layar",
        true,
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (Date.now() < ignoreViolationsUntilRef.current || warningOpenRef.current) {
          return;
        }
        modifierHeldRef.current = false;
        triggerViolation(
          "screenshot",
          "Meninggalkan tampilan ujian / berpindah tab selama asesmen",
          true,
        );
      }
    };

    const onFullscreenChange = () => {
      const active = isFullscreenActive();
      setIsFullscreen(active);
      if (!active) {
        if (warningOpenRef.current) {
          return;
        }
        triggerViolation(
          "fullscreen",
          "Keluar dari mode Full-screen. Peserta wajib tetap berada dalam mode layar penuh.",
          true,
        );
      }
    };

    const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
    const hasDisplayMedia = typeof mediaDevices?.getDisplayMedia === "function";
    const originalGetDisplayMedia = hasDisplayMedia
      ? mediaDevices.getDisplayMedia.bind(mediaDevices)
      : null;

    if (mediaDevices && hasDisplayMedia) {
      mediaDevices.getDisplayMedia = async () => {
        // Berbagi ulang (mis. setelah "Stop sharing") diizinkan selama sesi, tetap wajib seluruh layar.
        if (!guardScreenShare()) {
          triggerViolation(
            "screenrecord",
            "Percobaan merekam layar (Screen Recording) terdeteksi dan diblokir",
            true,
          );
          throw new DOMException("Screen recording is disabled during assessment.", "NotAllowedError");
        }
        await requestScreenShare();
        if (!guardScreenShare()) {
          throw new DOMException("Seluruh layar wajib dibagikan.", "NotAllowedError");
        }
        return screenStream!;
      };
    }

    // "Stop sharing" mengakhiri track secara instan; polling 1,5 dtk jadi cadangan.
    const onShareEnded = () => {
      releaseScreenShare();
      triggerViolation(
        "screenrecord",
        "Berbagi layar dihentikan. Berbagi seluruh layar wajib aktif selama asesmen.",
        true,
      );
    };
    setShareEndedHandler(onShareEnded);

    const onEnterPiP = (event: Event) => {
      event.preventDefault();
      triggerViolation("screenrecord", "Perekaman / Picture-in-Picture tidak diizinkan", true);
    };

    document.addEventListener("copy", onCopyOrCut, true);
    document.addEventListener("cut", onCopyOrCut, true);
    document.addEventListener("paste", preventCopyAction, true);
    document.addEventListener("contextmenu", preventCopyAction, true);
    document.addEventListener("selectstart", preventCopyAction, true);
    document.addEventListener("dragstart", preventCopyAction, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("enterpictureinpicture", onEnterPiP, true);

    return () => {
      document.removeEventListener("copy", onCopyOrCut, true);
      document.removeEventListener("cut", onCopyOrCut, true);
      document.removeEventListener("paste", preventCopyAction, true);
      document.removeEventListener("contextmenu", preventCopyAction, true);
      document.removeEventListener("selectstart", preventCopyAction, true);
      document.removeEventListener("dragstart", preventCopyAction, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("enterpictureinpicture", onEnterPiP, true);
      setShareEndedHandler(null);

      if (mediaDevices && originalGetDisplayMedia) {
        mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
      try {
        (window.navigator as NavigatorWithUAData).keyboard?.unlock?.();
      } catch {
        // Abaikan
      }
    };
  }, [enabled, sessionId, triggerViolation, setInstantBlackout]);

  // B. Proctoring Non-UI: Polling berkala Browser, Monitor, Internet, Webcam Face, & Validasi Fullscreen
  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (warningOpenRef.current || Date.now() < ignoreViolationsUntilRef.current) return;

      const fsActive = isFullscreenActive();
      setIsFullscreen(fsActive);
      if (!fsActive) {
        triggerViolation(
          "fullscreen",
          "Mode Full-screen tidak aktif. Peserta wajib mengerjakan dalam mode layar penuh.",
          true,
        );
        return;
      }

      if (!guardScreenShare()) {
        releaseScreenShare();
        triggerViolation(
          "screenrecord",
          "Berbagi seluruh layar tidak aktif. Peserta wajib membagikan seluruh layar.",
          true,
        );
        return;
      }

      const browserRes = checkBrowser();
      if (!browserRes.ok) {
        triggerViolation("browser", browserRes.detail);
        return;
      }

      const monitorRes = checkMonitor();
      if (!monitorRes.ok) {
        triggerViolation("monitor", monitorRes.detail);
        return;
      }

      const netRes = await checkInternet();
      if (!netRes.ok) {
        netFailStreakRef.current += 1;
        if (!navigator.onLine || netFailStreakRef.current >= 2) {
          netFailStreakRef.current = 0;
          triggerViolation("internet", netRes.detail);
          return;
        }
      } else {
        netFailStreakRef.current = 0;
      }

      const camRes = await checkWebcamFace();
      if (!camRes.ok) {
        faceFailStreakRef.current += 1;
        if (faceFailStreakRef.current >= 2) {
          faceFailStreakRef.current = 0;
          triggerViolation("webcam", camRes.detail);
        }
      } else {
        faceFailStreakRef.current = 0;
      }
    };

    const interval = window.setInterval(() => {
      void tick();
    }, 1500);

    const onOffline = () => {
      triggerViolation("internet", "Koneksi internet terputus (offline)");
    };

    const onScreenChange = () => {
      const monitorRes = checkMonitor();
      if (!monitorRes.ok) {
        triggerViolation("monitor", monitorRes.detail);
      }
    };

    const scr = window.screen as ScreenWithExtended;
    window.addEventListener("offline", onOffline);
    scr.addEventListener?.("change", onScreenChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("offline", onOffline);
      scr.removeEventListener?.("change", onScreenChange);
    };
  }, [enabled, triggerViolation]);

  // C. Bukti: tangkapan layar + kamera saat mulai dan tiap 5 menit (akhir ditangkap di End.tsx).
  useEffect(() => {
    if (!enabled || !sessionId) return;
    void captureEvidence(sessionId, "mulai");
    const interval = window.setInterval(() => {
      void captureEvidence(sessionId, "berkala");
    }, 5 * 60_000);
    return () => window.clearInterval(interval);
  }, [enabled, sessionId]);

  return {
    shieldRef,
    warning,
    blanked,
    blankReason,
    isFullscreen,
    violationsCount,
    maxViolations: config.maxViolations,
    dismissWarning,
    restoreScreen: dismissWarning,
    violationTitle: warning ? violationLabel[warning.kind] : "",
  };
}
