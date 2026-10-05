"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "./config";
import { attach, getCamera, getScreen, grab, players, stopStreams, streams } from "./media";
import { startFaceWatch } from "./face";
import { saveLive, saveSnap } from "./snap";
import { useStore } from "./store";
import type { ViolationType } from "./violations";

export type Blocked = "fullscreen" | "camera" | "screen" | null;
export type ProctorAlert = { id: string; text: string; critical: boolean };

// Nama enum asli dari proctor-sdk, dipetakan ke tipe aplikasi.
const SDK_MAP: Record<string, ViolationType> = {
  NO_FACE: "NO_FACE",
  MULTIPLE_FACES: "MULTIPLE_FACES",
  FULLSCREEN_EXIT: "FULLSCREEN_EXIT",
  TAB_SWITCH: "TAB_SWITCH",
  COPY_PASTE_ATTEMPT: "COPY_PASTE",
  MULTIPLE_SCREENS: "MULTIPLE_SCREENS",
};

const blockedKey = (e: KeyboardEvent) => {
  const k = e.key.toLowerCase();
  if (e.key === "F12") return true;
  if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) return true;
  if (e.ctrlKey && ["u", "s", "p"].includes(k)) return true;
  return false;
};

const faceEngine = () =>
  new URLSearchParams(location.search).get("face") === "sdk" ? "sdk" : config.faceEngine;

// Cabut webcam dan penghentian berbagi dari bar browser keduanya membuat track
// berakhir atau ter-mute, jadi keduanya dipantau di sini.
const watchTrack = (
  stream: MediaStream | undefined,
  down: () => void,
  up: () => void,
) => {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  track.addEventListener("ended", down);
  track.addEventListener("mute", down);
  track.addEventListener("unmute", up);
  return () => {
    track.removeEventListener("ended", down);
    track.removeEventListener("mute", down);
    track.removeEventListener("unmute", up);
  };
};

export const useProctor = (sessionId: string, containerRef: React.RefObject<HTMLDivElement | null>) => {
  const addViolation = useStore((s) => s.addViolation);
  const closeViolation = useStore((s) => s.closeViolation);

  const [blocked, setBlocked] = useState<Blocked>(null);
  const [unfocused, setUnfocused] = useState(false);
  const [faces, setFaces] = useState(0);
  const [alert, setAlert] = useState<ProctorAlert | null>(null);
  const [cam, setCam] = useState<MediaStream | undefined>(() => streams.cam);

  const shot = useCallback((key: "cam" | "screen") => {
    const video = players[key];
    return video && video.readyState >= 2 ? grab(video) : "";
  }, []);

  const report = useCallback(
    (type: ViolationType) => {
      const id = addViolation(type);
      if (!id) return;
      const total = useStore.getState().sessions[sessionId]?.violations.length ?? 0;
      const left = config.maxViolations - total;
      setAlert({
        id,
        critical: left <= 1,
        text:
          left <= 1
            ? "Satu pelanggaran lagi sebelum tes dihentikan"
            : `Pelanggaran ${total} dari ${config.maxViolations}`,
      });
      if (total <= config.maxSnapshots) {
        void saveSnap(id, { cam: shot("cam"), screen: shot("screen") });
      }
    },
    [addViolation, sessionId, shot],
  );

  // Tutup penyebab hanya kalau itu yang sedang memblokir layar.
  const release = useCallback(
    (cause: Blocked, type: ViolationType) => {
      setBlocked((cur) => (cur === cause ? null : cur));
      closeViolation(type);
    },
    [closeViolation],
  );

  // Susun ulang pemantauan track, dipanggil ulang setiap kali stream diganti.
  const unwatch = useRef<(() => void)[]>([]);
  const rewatch = useCallback(() => {
    unwatch.current.forEach((off) => off());
    const offs = [
      watchTrack(
        streams.cam,
        () => {
          setBlocked("camera");
          report("CAMERA_OFF");
        },
        () => release("camera", "CAMERA_OFF"),
      ),
      watchTrack(
        streams.screen,
        () => {
          setBlocked("screen");
          report("SCREEN_SHARE_STOPPED");
        },
        () => release("screen", "SCREEN_SHARE_STOPPED"),
      ),
    ];
    unwatch.current = offs.filter((off) => off !== undefined);
  }, [report, release]);

  const clearAlert = useCallback(() => setAlert(null), []);

  const restore = useCallback(async () => {
    const cause = blocked;
    if (cause === "fullscreen") await document.documentElement.requestFullscreen();
    if (cause === "camera") {
      await getCamera();
      setCam(streams.cam);
      release(cause, "CAMERA_OFF");
    }
    if (cause === "screen") {
      await getScreen();
      release(cause, "SCREEN_SHARE_STOPPED");
    }
    setBlocked(null);
    // Track baru hasil pemulihan harus dipantau lagi.
    rewatch();
  }, [blocked, release, rewatch]);

  useEffect(() => {
    if (!sessionId) return;
    const engine = faceEngine();
    const camVideo = attach("cam");
    attach("screen");

    let stopFace: (() => void) | undefined;
    let sdk: { start: () => Promise<void>; destroy: () => void } | undefined;

    if (camVideo && engine !== "sdk") {
      stopFace = startFaceWatch(camVideo, ({ violation, faces: n }) => {
        setFaces(n);
        if (violation) {
          report(violation);
          return;
        }
        closeViolation("NO_FACE");
        closeViolation("MULTIPLE_FACES");
        closeViolation("LOOK_AWAY");
      });
    }

    const initSdk = async () => {
      const container = containerRef.current;
      if (!container) return;
      const { default: ProctorSDK } = await import("proctor-sdk");
      sdk = new ProctorSDK({
        containerElement: container,
        enabledChecks: {
          fullscreen: true,
          tabSwitch: true,
          copyPaste: true,
          multipleScreens: true,
          faceDetection: engine === "sdk",
        },
        callbacks: {
          onStatusChange: () => {},
          onWebcamStreamReady: () => setFaces(1),
          onViolation: ({ type, active }) => {
            const mapped = SDK_MAP[type];
            if (!mapped) return;
            if (!active) {
              closeViolation(mapped);
              if (mapped === "FULLSCREEN_EXIT") setBlocked((cur) => (cur === "fullscreen" ? null : cur));
              return;
            }
            report(mapped);
            if (mapped === "FULLSCREEN_EXIT") setBlocked("fullscreen");
          },
        },
      });
      await sdk.start();
    };
    void initSdk();

    // SDK hanya memeriksa layar tambahan sekali saat start, jadi listen juga
    // event change supaya monitor yang ditambahkan saat tes berjalan ikut terhitung.
    const onScreens = () => {
      if (!("isExtended" in screen)) return;
      if (screen.isExtended) report("MULTIPLE_SCREENS");
      else closeViolation("MULTIPLE_SCREENS");
    };
    const onBlur = () => {
      setUnfocused(true);
      report("WINDOW_BLUR");
    };
    const onFocus = () => setUnfocused(false);
    const onClipboard = (e: Event) => {
      e.preventDefault();
      report("COPY_PASTE");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!blockedKey(e)) return;
      e.preventDefault();
      report("SHORTCUT");
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") report("SHORTCUT");
    };
    // Mandiri, tidak bergantung pada callback SDK: naik dan turunnya overlay
    // beserta episode pelanggaran harus selalu simetris di listener ini.
    const onFullscreen = () => {
      if (document.fullscreenElement) {
        setBlocked((cur) => (cur === "fullscreen" ? null : cur));
        closeViolation("FULLSCREEN_EXIT");
        return;
      }
      setBlocked("fullscreen");
      report("FULLSCREEN_EXIT");
    };
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    rewatch();

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("contextmenu", onClipboard);
    document.addEventListener("copy", onClipboard);
    document.addEventListener("cut", onClipboard);
    document.addEventListener("paste", onClipboard);
    document.addEventListener("dragstart", onClipboard);
    document.addEventListener("fullscreenchange", onFullscreen);
    screen.addEventListener("change", onScreens);

    const live = window.setInterval(() => {
      if (useStore.getState().sessions[sessionId]?.status !== "berlangsung") return;
      void saveLive(sessionId, { cam: shot("cam"), screen: shot("screen") });
    }, config.snapshotEveryMs);

    return () => {
      stopFace?.();
      sdk?.destroy();
      window.clearInterval(live);
      unwatch.current.forEach((off) => off());
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("contextmenu", onClipboard);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("cut", onClipboard);
      document.removeEventListener("paste", onClipboard);
      document.removeEventListener("dragstart", onClipboard);
      document.removeEventListener("fullscreenchange", onFullscreen);
      screen.removeEventListener("change", onScreens);
      stopStreams();
      if (document.fullscreenElement) void document.exitFullscreen();
      navigator.keyboard?.unlock?.();
    };
  }, [sessionId, containerRef, report, release, rewatch, shot, closeViolation]);

  return { blocked, unfocused, restore, faces, alert, cam, clearAlert };
};
