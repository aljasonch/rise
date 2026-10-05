import type { FaceLandmarker as FaceLandmarkerInstance } from "@mediapipe/tasks-vision";
import { config } from "./config";
import type { ViolationType } from "./violations";

export type FaceState = { violation: ViolationType | null; faces: number };

// Indeks landmark FaceMesh: 1 hidung, 234 dan 454 pipi, 10 dahi, 152 dagu.
const NOSE = 1;
const CHEEK_L = 234;
const CHEEK_R = 454;
const TOP = 10;
const CHIN = 152;

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

// Rasio landmark dinormalisasi 0..1, dibandingkan dengan rentang di config.
const read = (video: HTMLVideoElement, landmarker: FaceLandmarkerInstance): FaceState => {
  const result = landmarker.detectForVideo(video, performance.now());
  const faces = result.faceLandmarks.length;

  if (faces === 0) return { violation: "NO_FACE", faces };
  if (faces > 1) return { violation: "MULTIPLE_FACES", faces };

  const p = result.faceLandmarks[0];
  const yaw = (p[NOSE].x - p[CHEEK_L].x) / (p[CHEEK_R].x - p[CHEEK_L].x);
  const pitch = (p[NOSE].y - p[TOP].y) / (p[CHIN].y - p[TOP].y);
  if (debugOn()) console.log("rasio wajah", yaw.toFixed(3), pitch.toFixed(3));

  const [yawMin, yawMax] = config.yawRange;
  const [pitchMin, pitchMax] = config.pitchRange;
  const away = yaw < yawMin || yaw > yawMax || pitch < pitchMin || pitch > pitchMax;
  return { violation: away ? "LOOK_AWAY" : null, faces };
};

export const startFaceWatch = (video: HTMLVideoElement, onState: (state: FaceState) => void) => {
  let landmarker: FaceLandmarkerInstance | null = null;
  let timer: number | undefined;
  let stopped = false;

  // Kondisi harus bertahan graceMs sebelum dihitung, dan langsung clear saat normal.
  let pending: ViolationType | null = null;
  let since = 0;

  const tick = () => {
    if (!landmarker || video.readyState < 2) return;
    const found = read(video, landmarker);

    if (found.violation !== pending) {
      pending = found.violation;
      since = Date.now();
    }
    if (!pending || Date.now() - since >= config.graceMs) onState(found);
  };

  const init = async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
    if (stopped) return;
    landmarker = await createWithFallback(vision, fileset);
    if (stopped) return;
    timer = window.setInterval(tick, config.faceIntervalMs);
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
export const watchSingleFace = (video: HTMLVideoElement, onReady: (ready: boolean) => void) => {
  let since = 0;
  let ready = false;

  const stop = startFaceWatch(video, ({ faces }) => {
    if (faces !== 1) {
      ready = false;
      onReady(false);
      return;
    }
    if (!ready) {
      ready = true;
      since = Date.now();
    }
    onReady(Date.now() - since >= config.faceStableMs);
  });

  return stop;
};
