"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiMonitor,
  FiRefreshCw,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { Stepper } from "@/components/Stepper";
import { Badge, Button, Card, ProgressBar, Spinner } from "@/components/ui";
import { cameraKindLabel, listCameras, physicalCameras, type CameraInfo } from "@/lib/cameras";
import { watchSingleFace } from "@/lib/face";
import type { Identity } from "@/lib/identity";
import { getCamera, getScreen, mediaIssue, streams, stopStreams } from "@/lib/media";
import { useStore } from "@/lib/store";

type CheckState = "menunggu" | "meminta" | "siap" | "gagal";

type Issue = { title: string; message: string };

const stateMeta: Record<CheckState, { label: string; tone: "neutral" | "accent" | "ok" | "danger" }> = {
  menunggu: { label: "Belum siap", tone: "neutral" },
  meminta: { label: "Memproses", tone: "accent" },
  siap: { label: "Siap", tone: "ok" },
  gagal: { label: "Perlu tindakan", tone: "danger" },
};

const browserIssue = (): Issue | null => {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) {
    return {
      title: "Koneksi aman diperlukan",
      message: "Buka halaman ini melalui HTTPS atau localhost agar kamera dan layar dapat diakses.",
    };
  }
  if (!("isExtended" in screen)) {
    return {
      title: "Browser belum didukung",
      message: "Gunakan Chrome atau Edge terbaru di komputer.",
    };
  }
  if (window.matchMedia("(pointer: coarse)").matches) {
    return {
      title: "Perangkat sentuh tidak didukung",
      message: "Tes ini membutuhkan komputer dengan kamera dan layar penuh.",
    };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      title: "Akses media tidak tersedia",
      message: "Periksa izin browser dan pastikan halaman dibuka melalui HTTPS.",
    };
  }
  return null;
};

function ReadinessRow({
  icon: Icon,
  title,
  description,
  state,
  issue,
  action,
}: {
  icon: IconType;
  title: string;
  description: string;
  state: CheckState;
  issue?: Issue | null;
  action?: ReactNode;
}) {
  const meta = stateMeta[state];
  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-input border ${
            state === "siap"
              ? "border-line bg-surface-muted text-ink"
              : state === "gagal"
                ? "border-danger/20 bg-surface-muted text-danger"
                : "border-line bg-surface-muted text-muted"
          }`}
        >
          <Icon aria-hidden size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{title}</p>
            <Badge tone={meta.tone} dot={state !== "meminta"}>
              {state === "meminta" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size={11} />
                  Memproses
                </span>
              ) : (
                meta.label
              )}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
          {issue && (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-danger">
              <FiAlertCircle aria-hidden size={13} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-medium">{issue.title}.</span> {issue.message}
              </span>
            </p>
          )}
        </div>

        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
    </li>
  );
}

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

  // Dukungan browser tidak berubah selama halaman terbuka, jadi dibaca sekali
  // saat mount alih-alih disimpan ulang lewat effect.
  const [browserCheck] = useState<{ state: CheckState; issue: Issue | null }>(() => {
    const issue = browserIssue();
    return { state: issue ? "gagal" : "siap", issue };
  });
  const browser = browserCheck.state;
  const browserProblem = browserCheck.issue;

  const [display, setDisplay] = useState<CheckState>("menunggu");
  const [displayProblem, setDisplayProblem] = useState<Issue | null>(null);

  const [camera, setCamera] = useState<CheckState>("menunggu");
  const [cameraIssue, setCameraIssue] = useState<Issue | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [ignoredCameras, setIgnoredCameras] = useState<CameraInfo[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [camStream, setCamStream] = useState<MediaStream | undefined>(() => streams.cam);

  const [face, setFace] = useState<CheckState>("menunggu");
  const [faceIssue, setFaceIssue] = useState<Issue | null>(null);
  const [faceNonce, setFaceNonce] = useState(0);

  const [sharing, setSharing] = useState<CheckState>("menunggu");
  const [sharingIssue, setSharingIssue] = useState<Issue | null>(null);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | undefined>(() => streams.screen);

  const [consent, setConsent] = useState(false);
  const [beginning, setBeginning] = useState(false);
  const [beginIssue, setBeginIssue] = useState<Issue | null>(null);

  const camPreviewRef = useRef<HTMLVideoElement>(null);
  const screenPreviewRef = useRef<HTMLVideoElement>(null);
  const handedOff = useRef(false);

  useEffect(
    () => () => {
      // Saat tes dimulai, stream diserahkan ke Run. Navigasi lain harus
      // mematikan kamera agar tidak menyala tanpa halaman tes.
      if (!handedOff.current) stopStreams();
    },
    [],
  );

  useEffect(() => {
    const read = () => {
      if (!("isExtended" in screen)) {
        setDisplay("gagal");
        setDisplayProblem({
          title: "Pemeriksaan layar tidak tersedia",
          message: "Gunakan Chrome atau Edge terbaru.",
        });
        return;
      }
      if (screen.isExtended) {
        setDisplay("gagal");
        setDisplayProblem({
          title: "Layar tambahan terdeteksi",
          message: "Lepas monitor tambahan, lalu periksa kembali.",
        });
        return;
      }
      setDisplay("siap");
      setDisplayProblem(null);
    };

    read();
    screen.addEventListener("change", read);
    return () => screen.removeEventListener("change", read);
  }, []);

  const loadCameraList = useCallback(async () => {
    try {
      const all = await listCameras();
      const physical = physicalCameras(all).filter((item) => item.deviceId);
      setCameras(physical);
      setIgnoredCameras(all.filter((item) => item.kind === "virtual"));
      setSelectedId((current) =>
        physical.some((item) => item.deviceId === current) ? current : (physical[0]?.deviceId ?? ""),
      );
    } catch {
      // Label perangkat bisa tidak tersedia; kamera yang sudah aktif tetap dipakai.
    }
  }, []);

  const activateCamera = useCallback(
    async (deviceId?: string) => {
      setCameraBusy(true);
      setCameraIssue(null);
      setCamera("meminta");
      setFace("menunggu");
      setFaceIssue(null);

      try {
        const stream = await getCamera(deviceId);
        setCamStream(stream);
        setCamera("siap");

        const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        await loadCameraList();
        if (activeId) setSelectedId(activeId);
      } catch (error) {
        const issue = mediaIssue(error, "camera");
        setCameraIssue(issue);
        // Saat berpindah kamera gagal, kamera lama tetap dipakai.
        if (streams.cam) {
          setCamera("siap");
          setCamStream(streams.cam);
        } else {
          setCamera("gagal");
          setCamStream(undefined);
        }
      } finally {
        setCameraBusy(false);
      }
    },
    [loadCameraList],
  );

  useEffect(() => {
    const track = camStream?.getVideoTracks()[0];
    if (!track) return;

    const onEnded = () => {
      // Abaikan event dari track lama saat kamera sedang diganti.
      if (streams.cam?.getVideoTracks()[0] !== track) return;
      setCamera("gagal");
      setCamStream(undefined);
      setFace("menunggu");
      setFaceIssue(null);
      setCameraIssue({
        title: "Kamera terputus",
        message: "Sambungkan kembali kamera fisik, lalu tekan coba lagi.",
      });
    };

    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [camStream]);

  useEffect(() => {
    const video = camPreviewRef.current;
    if (camera !== "siap" || !camStream || !video) return;

    video.srcObject = camStream;
    void video.play().catch(() => {});
    setFace("menunggu");
    setFaceIssue(null);

    const stop = watchSingleFace(
      video,
      (ready) => {
        setFace(ready ? "siap" : "menunggu");
        if (ready) setFaceIssue(null);
      },
      () => {
        setFace("gagal");
        setFaceIssue({
          title: "Deteksi wajah gagal dimuat",
          message: "Muat ulang halaman atau tekan coba lagi.",
        });
      },
    );

    return stop;
  }, [camera, camStream, faceNonce]);

  useEffect(() => {
    const video = screenPreviewRef.current;
    if (sharing !== "siap" || !screenStream || !video) return;

    video.srcObject = screenStream;
    void video.play().catch(() => {});

    const track = screenStream.getVideoTracks()[0];
    const onEnded = () => {
      // Abaikan event dari track lama saat berbagi layar dimulai ulang.
      if (streams.screen?.getVideoTracks()[0] !== track) return;
      setSharing("gagal");
      setScreenStream(undefined);
      setSharingIssue({
        title: "Berbagi layar berhenti",
        message: "Bagikan seluruh layar lagi untuk melanjutkan.",
      });
    };

    track?.addEventListener("ended", onEnded);
    return () => track?.removeEventListener("ended", onEnded);
  }, [sharing, screenStream]);

  useEffect(() => {
    const media = navigator.mediaDevices;
    if (!media?.addEventListener) return;

    const onChange = () => {
      if (streams.cam) void loadCameraList();
    };
    media.addEventListener("devicechange", onChange);
    return () => media.removeEventListener("devicechange", onChange);
  }, [loadCameraList]);

  const allowScreen = async () => {
    setSharingBusy(true);
    setSharingIssue(null);
    setSharing("meminta");

    try {
      const stream = await getScreen();
      setScreenStream(stream);
      setSharing("siap");
    } catch (error) {
      setSharing("gagal");
      setSharingIssue(mediaIssue(error, "screen"));
      setScreenStream(undefined);
    } finally {
      setSharingBusy(false);
    }
  };

  const leave = () => {
    stopStreams();
    onBack();
  };

  const begin = async () => {
    setBeginning(true);
    setBeginIssue(null);

    try {
      // Fullscreen harus diminta di dalam klik yang sama karena butuh gestur pengguna.
      await document.documentElement.requestFullscreen();
      try {
        await navigator.keyboard?.lock?.(["Escape"]);
      } catch {
        // Keyboard Lock tidak tersedia di semua browser; pengawasan tetap berjalan.
      }
      handedOff.current = true;
      start(identity);
      onBegin();
    } catch {
      setBeginIssue({
        title: "Layar penuh diperlukan",
        message: "Klik mulai tes lagi, lalu izinkan browser membuka layar penuh.",
      });
      if (document.fullscreenElement) await document.exitFullscreen();
    } finally {
      setBeginning(false);
    }
  };

  const rows: {
    key: string;
    icon: IconType;
    title: string;
    description: string;
    state: CheckState;
    issue?: Issue | null;
    action?: ReactNode;
  }[] = [
    {
      key: "browser",
      icon: FiShield,
      title: "Browser",
      description: "Chrome atau Edge terbaru di komputer, dengan koneksi aman.",
      state: browser,
      issue: browserProblem,
    },
    {
      key: "display",
      icon: FiMonitor,
      title: "Layar",
      description: "Hanya satu layar aktif. Monitor tambahan harus dilepas.",
      state: display,
      issue: displayProblem,
    },
    {
      key: "camera",
      icon: FiCamera,
      title: "Kamera",
      description: "Kamera fisik aktif. Kamera virtual tidak diterima.",
      state: camera,
      issue: cameraIssue,
      action:
        camera === "siap" ? (
          <Badge tone="ok" dot>
            Aktif
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={cameraBusy}
            icon={<FiRefreshCw aria-hidden size={14} />}
            onClick={() => void activateCamera(selectedId || undefined)}
          >
            {camera === "gagal" ? "Coba lagi" : "Aktifkan"}
          </Button>
        ),
    },
    {
      key: "face",
      icon: FiUser,
      title: "Wajah",
      description:
        camera !== "siap"
          ? "Menunggu kamera aktif."
          : face === "siap"
            ? "Satu wajah terdeteksi dan stabil."
            : "Hadapkan wajah ke kamera dan pastikan pencahayaan cukup.",
      state: face,
      issue: faceIssue,
      action:
        face === "gagal" ? (
          <Button size="sm" variant="secondary" onClick={() => setFaceNonce((value) => value + 1)}>
            Coba lagi
          </Button>
        ) : undefined,
    },
    {
      key: "sharing",
      icon: FiMonitor,
      title: "Berbagi layar",
      description: "Pilih seluruh layar, bukan jendela atau tab.",
      state: sharing,
      issue: sharingIssue,
      action:
        sharing === "siap" ? (
          <Badge tone="ok" dot>
            Seluruh layar
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={sharingBusy}
            icon={<FiMonitor aria-hidden size={14} />}
            onClick={() => void allowScreen()}
          >
            {sharing === "gagal" ? "Coba lagi" : "Bagikan"}
          </Button>
        ),
    },
  ];

  const ready = [browser, camera, face, sharing, display].every((state) => state === "siap");
  const readyCount = [browser, camera, face, sharing, display].filter((state) => state === "siap").length;

  const missing = [
    browser !== "siap" ? "browser" : null,
    display !== "siap" ? "layar tunggal" : null,
    camera !== "siap" ? "kamera fisik" : null,
    face !== "siap" ? "wajah" : null,
    sharing !== "siap" ? "berbagi layar" : null,
  ].filter(Boolean) as string[];

  const helper = !consent
    ? "Centang persetujuan untuk melanjutkan."
    : missing.length > 0
      ? `Lengkapi: ${missing.join(", ")}.`
      : "Semua perangkat siap.";

  const activeCamera = cameras.find((item) => item.deviceId === selectedId);
  const activeCameraLabel = activeCamera?.label || camStream?.getVideoTracks()[0]?.label || "";

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <Button variant="ghost" size="sm" icon={<FiArrowLeft aria-hidden size={15} />} onClick={leave}>
          Kembali
        </Button>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-2 sm:px-8">
        <Stepper current={2} />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Langkah 2 dari 3</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Persiapan perangkat</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {identity.name} · {identity.position}. Semua pemeriksaan harus siap sebelum tes
              dimulai. Timer belum berjalan di tahap ini.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted">Kesiapan</span>
              <span className="font-medium tabular-nums">{readyCount} dari 5</span>
            </div>
            <ProgressBar value={readyCount} max={5} tone={ready ? "ok" : "accent"} label="Kesiapan perangkat" />
          </div>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="min-w-0 space-y-4">
            <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Pemeriksaan</h2>
                <p className="mt-1 text-xs text-muted">Ikuti setiap langkah dari atas ke bawah.</p>
              </div>
              <Badge tone={ready ? "ok" : "neutral"} dot>
                {ready ? "Siap" : "Belum lengkap"}
              </Badge>
            </div>

            <ul className="mt-4 divide-y divide-line border-t border-line">
              {rows.map((row) => (
                <ReadinessRow
                  key={row.key}
                  icon={row.icon}
                  title={row.title}
                  description={row.description}
                  state={row.state}
                  issue={row.issue}
                  action={row.action}
                />
              ))}
            </ul>

            <div className="mt-4 flex items-start gap-2 rounded-input border border-line bg-surface-muted p-3 text-xs leading-relaxed text-muted">
              <FiShield aria-hidden size={14} className="mt-0.5 shrink-0 text-muted" />
              Kamera virtual seperti OBS, ManyCam, atau DroidCam diblokir. Pilih kamera fisik saat
              diminta.
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <span className="font-medium">
                  Saya menyetujui pemantauan kamera dan layar selama tes.
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  Tangkapan kamera dan layar disimpan di perangkat ini untuk ditinjau
                  pengawas. Saya memahami bahwa kamera virtual dan layar tambahan tidak
                  diizinkan.
                </span>
              </span>
            </label>

            {beginIssue && (
              <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-danger">
                <FiAlertCircle aria-hidden size={13} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">{beginIssue.title}.</span> {beginIssue.message}
                </span>
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xs text-xs leading-relaxed text-muted">{helper}</p>
              <Button
                size="lg"
                loading={beginning}
                disabled={!ready || !consent}
                icon={ready && consent ? <FiCheckCircle aria-hidden size={16} /> : undefined}
                onClick={() => void begin()}
              >
                Mulai tes
              </Button>
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <FiCheck aria-hidden size={13} className="text-ink" />
              Anda tidak dapat kembali ke pemeriksaan ini setelah tes dimulai.
            </p>
          </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <FiCamera aria-hidden size={16} className="text-muted" />
                  <h2 className="text-sm font-semibold">Pratinjau kamera</h2>
                </div>
                <Badge tone={camera === "siap" ? "ok" : "neutral"} dot>
                  {camera === "siap" ? "Aktif" : "Belum aktif"}
                </Badge>
              </div>

              <div className="relative aspect-[4/3] bg-media">
                {camStream ? (
                  <video
                    ref={camPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70">
                      <FiCamera aria-hidden size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white/80">Kamera belum aktif</p>
                      <p className="mt-1 text-xs text-white/50">
                        Tekan Aktifkan pada pemeriksaan kamera.
                      </p>
                    </div>
                  </div>
                )}

                {camStream && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-media/85 px-3 py-2">
                    <span className="min-w-0 truncate text-xs text-white/75">
                      {activeCameraLabel || "Kamera fisik"}
                    </span>
                    <Badge tone={face === "siap" ? "ok" : face === "gagal" ? "danger" : "neutral"} dot>
                      {face === "siap" ? "1 wajah" : "Deteksi wajah"}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-3 px-4 py-4">
                {cameras.length > 0 ? (
                  <div>
                    <label htmlFor="camera-select" className="mb-1.5 block text-xs font-medium">
                      Kamera fisik
                    </label>
                    <select
                      id="camera-select"
                      value={selectedId}
                      disabled={cameraBusy}
                      onChange={(event) => void activateCamera(event.target.value)}
                      className="w-full rounded-input border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:opacity-50"
                    >
                      {cameras.map((cameraItem) => (
                        <option key={cameraItem.deviceId} value={cameraItem.deviceId}>
                          {cameraItem.label} — {cameraKindLabel[cameraItem.kind]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-muted">
                    Daftar kamera muncul setelah izin diberikan. Hanya kamera fisik yang
                    ditampilkan.
                  </p>
                )}

                {ignoredCameras.length > 0 && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                    <span className="font-medium text-ink">Kamera virtual diabaikan:</span>{" "}
                    {ignoredCameras.map((item) => item.label).join(", ")}
                  </p>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <FiMonitor aria-hidden size={16} className="text-muted" />
                  <h2 className="text-sm font-semibold">Pratinjau layar</h2>
                </div>
                <Badge tone={sharing === "siap" ? "ok" : "neutral"} dot>
                  {sharing === "siap" ? "Seluruh layar" : "Belum dibagikan"}
                </Badge>
              </div>

              <div className="relative aspect-video bg-media">
                {screenStream ? (
                  <video
                    ref={screenPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70">
                      <FiMonitor aria-hidden size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white/80">Layar belum dibagikan</p>
                      <p className="mt-1 text-xs text-white/50">
                        Pilih seluruh layar saat diminta.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
