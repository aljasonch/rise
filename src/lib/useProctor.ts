"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "./config";
import { attach, getCamera, getScreen, grab, mediaIssue, players, stopStreams, streams } from "./media";
import { startFaceWatch } from "./face";
import { riskScore } from "./risk";
import { saveHist, saveLive, saveSnap } from "./snap";
import { useStore } from "./store";
import { violationLabel, violationWeight, type ViolationType } from "./violations";

export type Blocked = "fullscreen" | "camera" | "screen" | null;

export type ProctorAlert = {
  id: string;
  type: ViolationType;
  title: string;
  text: string;
  critical: boolean;
};

const blockedKey = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();
  if (event.key === "F12") return true;
  if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) return true;
  if (event.ctrlKey && ["u", "s", "p"].includes(key)) return true;
  return false;
};

// Cabut webcam dan penghentian berbagi dari bar browser keduanya membuat track
// berakhir atau ter-mute, jadi keduanya dipantau di sini.
const watchTrack = (stream: MediaStream | undefined, down: () => void, up: () => void) => {
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

export const useProctor = (sessionId: string) => {
  const addViolation = useStore((state) => state.addViolation);
  const closeViolation = useStore((state) => state.closeViolation);

  const [blocked, setBlocked] = useState<Blocked>(null);
  const [restoreError, setRestoreError] = useState("");
  const [unfocused, setUnfocused] = useState(false);
  const [faces, setFaces] = useState(0);
  const [alert, setAlert] = useState<ProctorAlert | null>(null);
  const [cam, setCam] = useState<MediaStream | undefined>(() => streams.cam);
  const [screenStream, setScreenStream] = useState<MediaStream | undefined>(() => streams.screen);
  const blockedRef = useRef<Blocked>(null);
  // Dialog izin kamera/layar dapat mengeluarkan browser dari fullscreen.
  // Selama jendela ini, event fullscreenchange tidak dicatat sebagai pelanggaran.
  const suppressFullscreenUntil = useRef(0);

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  const shot = useCallback((key: "cam" | "screen") => {
    const video = players[key];
    return video && video.readyState >= 2 ? grab(video) : "";
  }, []);

  const report = useCallback(
    (type: ViolationType) => {
      const id = addViolation(type);
      if (!id) return;
      const violations = useStore.getState().sessions[sessionId]?.violations ?? [];
      const points = violationWeight[type];
      setAlert({
        id,
        type,
        title: violationLabel[type],
        critical: points >= 3,
        text: `+${points} poin pelanggaran · total ${riskScore(violations)}`,
      });
      if (violations.length <= config.maxSnapshots) {
        void saveSnap(id, { cam: shot("cam"), screen: shot("screen") });
      }
    },
    [addViolation, sessionId, shot],
  );

  // Tutup penyebab hanya kalau itu yang sedang memblokir layar.
  const release = useCallback(
    (cause: Blocked, type: ViolationType) => {
      setBlocked((current) => (current === cause ? null : current));
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
    unwatch.current = offs.filter((off): off is () => void => off !== undefined);
  }, [report, release]);

  const clearAlert = useCallback(() => setAlert(null), []);

  const restore = useCallback(async () => {
    if (!blocked) return;
    setRestoreError("");
    const cause = blocked;

    try {
      if (cause === "camera" || cause === "screen") {
        // Izin kamera/layar akan membuka dialog browser yang dapat keluar
        // dari fullscreen; jangan hitung itu sebagai pelanggaran baru.
        suppressFullscreenUntil.current = Date.now() + 5000;
      }
      if (cause === "fullscreen") {
        await document.documentElement.requestFullscreen();
        if (!document.fullscreenElement) throw new Error("Layar penuh tidak aktif");
      }
      if (cause === "camera") {
        await getCamera();
        setCam(streams.cam);
        release(cause, "CAMERA_OFF");
      }
      if (cause === "screen") {
        await getScreen();
        setScreenStream(streams.screen);
        release(cause, "SCREEN_SHARE_STOPPED");
      }
      if (cause === "camera" || cause === "screen") {
        // Event fullscreenchange dari dialog izin bisa datang terlambat.
        suppressFullscreenUntil.current = Date.now() + 2000;
      }
      // Track baru hasil pemulihan harus dipantau lagi.
      rewatch();
      // Jika dialog izin membuat fullscreen hilang, minta layar penuh lagi
      // lewat overlay tanpa mencatat pelanggaran.
      setBlocked(cause !== "fullscreen" && !document.fullscreenElement ? "fullscreen" : null);
    } catch (error) {
      setRestoreError(mediaIssue(error, cause === "camera" ? "camera" : "screen").message);
    }
  }, [blocked, release, rewatch]);

  // Deteksi wajah selalu mengikuti stream kamera terbaru. Saat kamera dipulihkan,
  // stream diganti dan pemantauan wajah harus dimulai ulang di video baru.
  useEffect(() => {
    if (!sessionId || !cam) return;

    const camVideo = attach("cam");
    if (!camVideo) return;

    return startFaceWatch(camVideo, ({ violation, faces: count }) => {
      setFaces(count);
      if (violation) {
        report(violation);
        return;
      }
      closeViolation("NO_FACE");
      closeViolation("MULTIPLE_FACES");
      closeViolation("LOOK_AWAY");
    });
  }, [sessionId, cam, report, closeViolation]);

  // Lampirkan ulang video tersembunyi saat berbagi layar dipulihkan, supaya
  // snapshot layar tidak memakai elemen video dari stream yang sudah berhenti.
  useEffect(() => {
    if (!sessionId || !screenStream) return;
    attach("screen");
  }, [sessionId, screenStream]);

  useEffect(() => {
    if (!sessionId) return;

    // Periksa layar tambahan sekali saat mulai, lalu ikuti perubahan monitor
    // supaya layar yang ditambahkan saat tes berjalan ikut terhitung.
    const onScreens = () => {
      if (!("isExtended" in screen)) return;
      if (screen.isExtended) report("MULTIPLE_SCREENS");
      else closeViolation("MULTIPLE_SCREENS");
    };
    const onBlur = () => {
      setUnfocused(true);
      // Dialog izin kamera/layar saat pemulihan juga memicu blur; jangan
      // menambah pelanggaran baru saat overlay sedang meminta akses.
      if (blockedRef.current) return;
      report("WINDOW_BLUR");
    };
    const onFocus = () => setUnfocused(false);
    const onClipboard = (event: Event) => {
      event.preventDefault();
      report("COPY_PASTE");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!blockedKey(event)) return;
      event.preventDefault();
      report("SHORTCUT");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") report("SHORTCUT");
    };
    // Naik dan turunnya overlay beserta episode pelanggaran harus selalu
    // simetris di listener fullscreenchange.
    const onFullscreen = () => {
      if (document.fullscreenElement) {
        setBlocked((current) => (current === "fullscreen" ? null : current));
        closeViolation("FULLSCREEN_EXIT");
        return;
      }
      // Abaikan keluarnya fullscreen akibat dialog izin saat pemulihan.
      if (Date.now() < suppressFullscreenUntil.current) return;
      setBlocked("fullscreen");
      report("FULLSCREEN_EXIT");
    };
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault();

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
      const at = Date.now();
      const snap = { cam: shot("cam"), screen: shot("screen"), at };
      void saveLive(sessionId, snap);
      void saveHist(sessionId, { ...snap, at });
    }, config.snapshotEveryMs);

    return () => {
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
  }, [sessionId, report, release, rewatch, shot, closeViolation]);

  return { blocked, restoreError, unfocused, restore, faces, alert, cam, clearAlert };
};
