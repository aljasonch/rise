import { config } from "./config";
import { isVirtualCamera, listCameras, preferredCamera, type CameraInfo } from "./cameras";

export const streams: { cam?: MediaStream; screen?: MediaStream } = {};
export const players: { cam?: HTMLVideoElement; screen?: HTMLVideoElement } = {};

export type MediaTarget = "camera" | "screen";

export type MediaErrorCode =
  | "unsupported"
  | "permission-denied"
  | "not-found"
  | "in-use"
  | "constraint"
  | "cancelled"
  | "virtual-only"
  | "not-monitor"
  | "unknown";

export class MediaAccessError extends Error {
  readonly code: MediaErrorCode;
  readonly title: string;

  constructor(code: MediaErrorCode, title: string, message: string) {
    super(message);
    this.name = "MediaAccessError";
    this.code = code;
    this.title = title;
  }
}

const toMediaError = (error: unknown, target: MediaTarget): MediaAccessError => {
  if (error instanceof MediaAccessError) return error;

  const name = error instanceof DOMException ? error.name : "";
  const isCamera = target === "camera";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return new MediaAccessError(
      "permission-denied",
      isCamera ? "Izin kamera ditolak" : "Izin berbagi layar ditolak",
      isCamera
        ? "Izinkan akses kamera dari ikon di bilah alamat, lalu coba lagi."
        : "Pilih seluruh layar pada dialog berbagi, lalu coba lagi.",
    );
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new MediaAccessError(
      "not-found",
      isCamera ? "Kamera tidak ditemukan" : "Layar tidak ditemukan",
      isCamera
        ? "Sambungkan kamera fisik, lalu tekan coba lagi. Kamera virtual tidak diperbolehkan."
        : "Tidak ada layar yang bisa dibagikan.",
    );
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return new MediaAccessError(
      "in-use",
      isCamera ? "Kamera sedang dipakai" : "Layar tidak dapat dibaca",
      isCamera
        ? "Tutup aplikasi lain yang memakai kamera, lalu coba lagi."
        : "Tutup aplikasi yang sedang merekam layar, lalu coba lagi.",
    );
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return new MediaAccessError(
      "constraint",
      "Perangkat tidak tersedia",
      isCamera
        ? "Kamera yang dipilih tidak dapat dibuka. Pilih kamera lain atau sambungkan ulang."
        : "Layar yang dipilih tidak memenuhi syarat. Pilih seluruh layar.",
    );
  }

  if (name === "AbortError") {
    return new MediaAccessError(
      "cancelled",
      "Permintaan dibatalkan",
      isCamera ? "Izin kamera dibatalkan." : "Berbagi layar dibatalkan.",
    );
  }

  return new MediaAccessError(
    "unknown",
    isCamera ? "Kamera tidak dapat diakses" : "Layar tidak dapat dibagikan",
    isCamera
      ? "Periksa izin kamera di browser, lalu coba lagi."
      : "Coba bagikan layar lagi dan pilih seluruh layar.",
  );
};

export const mediaIssue = (error: unknown, target: MediaTarget) => {
  const mapped = toMediaError(error, target);
  return { title: mapped.title, message: mapped.message, code: mapped.code };
};

// Stream sebelumnya dihentikan dulu, supaya kamera tidak menyala dua kali
// saat kamera dipulihkan dari overlay.
const replace = (key: "cam" | "screen", stream: MediaStream) => {
  streams[key]?.getTracks().forEach((track) => track.stop());
  delete players[key];
  streams[key] = stream;
  return stream;
};

const openCamera = (deviceId?: string) =>
  navigator.mediaDevices.getUserMedia({
    video: deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: config.camera.width },
          height: { ideal: config.camera.height },
        }
      : {
          width: { ideal: config.camera.width },
          height: { ideal: config.camera.height },
        },
  });

/**
 * Membuka kamera fisik. Kamera virtual selalu ditolak, termasuk saat browser
 * memilih kamera virtual sebagai perangkat default. Aturan ini berada di sini,
 * bukan hanya di UI, supaya pemulihan sesi tidak bisa melewatinya.
 */
export const getCamera = async (deviceId?: string) => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new MediaAccessError(
      "unsupported",
      "Kamera tidak didukung",
      "Gunakan Chrome atau Edge terbaru di komputer.",
    );
  }

  let stream: MediaStream;
  try {
    stream = await openCamera(deviceId);
  } catch (error) {
    throw toMediaError(error, "camera");
  }

  let track = stream.getVideoTracks()[0];
  if (!track) {
    stream.getTracks().forEach((item) => item.stop());
    throw new MediaAccessError("not-found", "Kamera tidak ditemukan", "Perangkat kamera tidak tersedia.");
  }

  if (isVirtualCamera(track.label)) {
    const virtualLabel = track.label;
    stream.getTracks().forEach((item) => item.stop());

    if (deviceId) {
      throw new MediaAccessError(
        "virtual-only",
        "Kamera virtual tidak diizinkan",
        `Kamera "${virtualLabel}" adalah kamera virtual. Pilih kamera fisik untuk melanjutkan.`,
      );
    }

    const cameras: CameraInfo[] = await listCameras();
    const physical = preferredCamera(cameras);

    if (!physical) {
      throw new MediaAccessError(
        "virtual-only",
        "Kamera fisik tidak ditemukan",
        `Kamera default adalah "${virtualLabel}" dan tidak ada kamera fisik lain. Sambungkan kamera fisik, lalu coba lagi.`,
      );
    }

    try {
      stream = await openCamera(physical.deviceId);
    } catch (error) {
      throw toMediaError(error, "camera");
    }

    track = stream.getVideoTracks()[0];
    if (!track || isVirtualCamera(track.label)) {
      stream.getTracks().forEach((item) => item.stop());
      throw new MediaAccessError(
        "virtual-only",
        "Kamera fisik tidak dapat dibuka",
        "Kamera fisik terdeteksi tetapi tidak dapat digunakan. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.",
      );
    }
  }

  return replace("cam", stream);
};

export const getScreen = async () => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    throw new MediaAccessError(
      "unsupported",
      "Berbagi layar tidak didukung",
      "Gunakan Chrome atau Edge terbaru di komputer.",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "monitor" },
      audio: false,
    });
  } catch (error) {
    throw toMediaError(error, "screen");
  }

  const track = stream.getVideoTracks()[0];
  // getDisplayMedia masih bisa mengembalikan jendela atau tab, jadi periksa lagi.
  if (!track || track.getSettings().displaySurface !== "monitor") {
    stream.getTracks().forEach((item) => item.stop());
    throw new MediaAccessError(
      "not-monitor",
      "Pilih seluruh layar",
      "Berbagi jendela atau tab tidak diterima. Ulangi dan pilih opsi Seluruh layar.",
    );
  }

  return replace("screen", stream);
};

// Elemen video tanpa tampilan, dipakai deteksi wajah dan snapshot.
export const attach = (key: "cam" | "screen") => {
  const stream = streams[key];
  if (!stream) return undefined;

  const existing = players[key];
  if (existing && existing.srcObject === stream) return existing;
  existing?.pause();

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  players[key] = video;
  video.play().catch(() => {});
  return video;
};

export const grab = (video: HTMLVideoElement, width = config.grabWidth) => {
  if (video.videoWidth === 0 || video.videoHeight === 0) return "";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.max(1, Math.round((video.videoHeight * width) / video.videoWidth));
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.68);
};

export const currentCameraLabel = () => streams.cam?.getVideoTracks()[0]?.label ?? "";

export const stopStreams = () => {
  for (const key of ["cam", "screen"] as const) {
    streams[key]?.getTracks().forEach((track) => track.stop());
    players[key]?.pause();
    delete streams[key];
    delete players[key];
  }
};
