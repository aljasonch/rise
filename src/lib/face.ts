import type { FaceLandmarker as FaceLandmarkerInstance } from "@mediapipe/tasks-vision";
import { frameDiff, isFrozenFrame } from "./cameras";
import { config } from "./config";
import { faceAngles } from "./pose";
import type { ViolationType } from "./violations";

export type FaceState = { violation: ViolationType | null; faces: number };

const debugOn = () => new URLSearchParams(location.search).has("debug");

const create = (
  vision: typeof import("@mediapipe/tasks-vision"),
  fileset: Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>>,
  delegate: "GPU" | "CPU",
) =>
  vision.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
    runningMode: "VIDEO",
    numFaces: 2,
    // numFaces > 1 mematikan smoothing bawaan, jadi keyakinan deteksi dan
    // tracking dinaikkan agar pose wajah tidak gemetar dan memicu LOOK_AWAY palsu.
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
    outputFacialTransformationMatrixes: true,
  });

// GPU jauh lebih ringan, tapi tidak selalu tersedia. Falls back ke CPU.
const createWithFallback = async (
  vision: typeof import("@mediapipe/tasks-vision"),
  fileset: Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>>,
) => {
  try {
    return await create(vision, fileset, "GPU");
  } catch {
    return create(vision, fileset, "CPU");
  }
};

const read = (video: HTMLVideoElement, landmarker: FaceLandmarkerInstance, frozen: boolean): FaceState => {
  const result = landmarker.detectForVideo(video, performance.now());
  const faces = result.faceLandmarks.length;

  if (frozen) return { violation: "CAMERA_FROZEN", faces };
  if (faces === 0) return { violation: "NO_FACE", faces };
  if (faces > 1) return { violation: "MULTIPLE_FACES", faces };

  // Tanpa matrix dianggap hadap depan: lebih baik tidak menuduh daripada salah tuduh.
  const m = result.facialTransformationMatrixes[0];
  const { yaw, pitch } = m ? faceAngles(m.data) : { yaw: 0, pitch: 0 };
  if (debugOn()) console.log("sudut wajah", yaw.toFixed(1), pitch.toFixed(1));

  const away = Math.abs(yaw) > config.lookAway.yawDeg || Math.abs(pitch) > config.lookAway.pitchDeg;
  return { violation: away ? "LOOK_AWAY" : null, faces };
};

// Sampel kecil tanpa smoothing, supaya noise sensor per piksel tidak ikut
// dirata-ratakan saat gambar diperkecil.
const frameSampler = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let last: Uint8ClampedArray | undefined;

  return (video: HTMLVideoElement) => {
    if (!ctx) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const next = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const frozen = last ? isFrozenFrame(last, next) : false;
    if (debugOn() && last) console.log("selisih frame", frameDiff(last, next).toFixed(2));
    last = next;
    return frozen;
  };
};

export const startFaceWatch = (
  video: HTMLVideoElement,
  onState: (state: FaceState) => void,
  onError?: (error: unknown) => void,
) => {
  let landmarker: FaceLandmarkerInstance | null = null;
  let timer: number | undefined;
  let stopped = false;
  const sample = frameSampler();

  // Kondisi harus bertahan graceMs sebelum dihitung, dan langsung clear saat normal.
  let pending: ViolationType | null = null;
  let since = 0;

  const tick = () => {
    if (!landmarker || video.readyState < 2) return;
    const found = read(video, landmarker, sample(video));

    if (found.violation !== pending) {
      pending = found.violation;
      since = Date.now();
    }
    if (!pending || Date.now() - since >= config.graceMs) onState(found);
  };

  const init = async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      if (stopped) return;
      landmarker = await createWithFallback(vision, fileset);
      if (stopped) return;
      timer = window.setInterval(tick, config.faceIntervalMs);
    } catch (error) {
      if (!stopped) onError?.(error);
    }
  };

  void init();

  return () => {
    stopped = true;
    if (timer) window.clearInterval(timer);
    landmarker?.close();
    landmarker = null;
  };
};

// Dipakai tahap persiapan: satu wajah harus stabil selama faceStableMs.
export const watchSingleFace = (
  video: HTMLVideoElement,
  onReady: (ready: boolean, frozen: boolean) => void,
  onError?: (error: unknown) => void,
) => {
  let since = 0;
  let ready = false;

  const stop = startFaceWatch(
    video,
    ({ faces, violation }) => {
      const frozen = violation === "CAMERA_FROZEN";
      if (faces !== 1 || frozen) {
        ready = false;
        onReady(false, frozen);
        return;
      }
      if (!ready) {
        ready = true;
        since = Date.now();
      }
      onReady(Date.now() - since >= config.faceStableMs, false);
    },
    onError,
  );

  return stop;
};
