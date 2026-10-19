export type CameraKind = "integrated" | "external" | "virtual";

export type CameraInfo = {
  deviceId: string;
  label: string;
  kind: CameraKind;
};

// Perangkat virtual meniru kamera fisik, tetapi tidak boleh dipakai untuk
// pengawasan. Daftar ini sengaja mencakup nama merek yang umum, bukan hanya
// kata "virtual", karena beberapa produk tidak mencantumkannya di label.
const virtualPatterns: RegExp[] = [
  /\bobs\b/i,
  /virtual/i,
  /\bvcam\b/i,
  /\bwebcam\b.*\bvirtual\b/i,
  /manycam/i,
  /xsplit/i,
  /snap camera/i,
  /droidcam/i,
  /epoccam/i,
  /iriun/i,
  /\bcamo\b/i,
  /reincubate/i,
  /mmhmm/i,
  /\bndi\b/i,
  /vmix/i,
  /youcam/i,
  /splitcam/i,
  /e2esoft/i,
  /webcam max/i,
  /cyberlink/i,
  /logi capture/i,
  /unity capture/i,
  /nvidia broadcast/i,
  /screen capture/i,
  /window capture/i,
  /dummy (video|webcam|camera)/i,
  /fake (video|webcam|camera)/i,
];

// Label kamera terintegrasi berbeda-beda antarprodusen. Ini hanya untuk
// pengurutan dan keterangan, bukan syarat kelayakan: kamera eksternal tetap
// diperbolehkan.
const integratedPatterns: RegExp[] = [
  /integrated/i,
  /built[- ]?in/i,
  /internal/i,
  /facetime/i,
  /user facing/i,
  /front camera/i,
  /\bir camera\b/i,
];

export const isVirtualCamera = (label = "") => virtualPatterns.some((pattern) => pattern.test(label));

// Sensor asli selalu menghasilkan noise, jadi dua frame berurutan tidak pernah
// identik. Gambar diam dari kamera virtual (OBS, ManyCam, dll.) memberi selisih
// ~0 meskipun labelnya sudah diganti. Ambang dalam rata-rata selisih per kanal
// (0-255); naikkan jika kamera dengan denoise agresif salah terdeteksi.
// ponytail: tidak menangkap video rekaman yang diputar ulang, perlu liveness challenge.
export const frozenDiff = 0.3;

export const frameDiff = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let sum = 0;
  let count = 0;
  // RGBA: lewati kanal alfa.
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    count += 3;
  }
  return count ? sum / count : 0;
};

export const isFrozenFrame = (a: ArrayLike<number>, b: ArrayLike<number>) => frameDiff(a, b) < frozenDiff;

export const classifyCamera = (label = ""): CameraKind => {
  if (isVirtualCamera(label)) return "virtual";
  if (integratedPatterns.some((pattern) => pattern.test(label))) return "integrated";
  return "external";
};

export const cameraKindLabel: Record<CameraKind, string> = {
  integrated: "Kamera terintegrasi",
  external: "Kamera eksternal",
  virtual: "Kamera virtual",
};

const rank: Record<CameraKind, number> = { integrated: 0, external: 1, virtual: 2 };

export const sortCameras = (a: CameraInfo, b: CameraInfo) =>
  rank[a.kind] - rank[b.kind] || a.label.localeCompare(b.label, "id");

export const physicalCameras = (cameras: CameraInfo[]) =>
  cameras.filter((camera) => camera.kind !== "virtual").sort(sortCameras);

export const preferredCamera = (cameras: CameraInfo[]) => physicalCameras(cameras)[0];

export const listCameras = async (): Promise<CameraInfo[]> => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput" && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      // Label kosong sebelum izin diberikan. Jangan menebak jenis perangkat
      // dari label kosong; UI menampilkan petunjuk izin.
      label: device.label.trim() || `Kamera ${index + 1}`,
      kind: classifyCamera(device.label),
    }));
};
