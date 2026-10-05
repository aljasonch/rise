import { config } from "./config";

export const streams: { cam?: MediaStream; screen?: MediaStream } = {};
export const players: { cam?: HTMLVideoElement; screen?: HTMLVideoElement } = {};

// Stream sebelumnya dihentikan dulu, supaya kamera tidak menyala dua kali
// saat kamera dipulihkan dari overlay.
const replace = (key: "cam" | "screen", stream: MediaStream) => {
  streams[key]?.getTracks().forEach((t) => t.stop());
  delete players[key];
  streams[key] = stream;
  return stream;
};

export const getCamera = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: config.camera.width, height: config.camera.height },
  });
  return replace("cam", stream);
};

export const getScreen = async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "monitor" },
    audio: false,
  });
  // getDisplayMedia masih bisa mengembalikan jendela atau tab, jadi periksa lagi.
  if (stream.getVideoTracks()[0]?.getSettings().displaySurface !== "monitor") {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("Bukan seluruh layar");
  }
  return replace("screen", stream);
};

// Elemen video tanpa tampilan, dipakai deteksi wajah dan snapshot.
export const attach = (key: "cam" | "screen") => {
  const stream = streams[key];
  if (!stream) return undefined;
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  players[key] = video;
  video.play().catch(() => {});
  return video;
};

export const grab = (video: HTMLVideoElement, width = config.grabWidth) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((video.videoHeight * width) / video.videoWidth) || 1;
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
};

export const stopStreams = () => {
  for (const key of ["cam", "screen"] as const) {
    streams[key]?.getTracks().forEach((t) => t.stop());
    delete streams[key];
    delete players[key];
  }
};
