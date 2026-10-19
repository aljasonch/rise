// Memeriksa penyaring kamera virtual tanpa membutuhkan browser.
// Jalankan dengan: node scripts/check-cameras.ts
import assert from "node:assert/strict";
import {
  classifyCamera,
  isVirtualCamera,
  physicalCameras,
  preferredCamera,
  sortCameras,
  type CameraInfo,
} from "../src/lib/cameras.ts";

const virtualLabels = [
  "OBS Virtual Camera",
  "OBS-Camera",
  "ManyCam Virtual Webcam",
  "XSplit VCam",
  "Snap Camera",
  "DroidCam Source 3",
  "EpocCam",
  "Iriun Webcam",
  "Camo Studio",
  "Reincubate Camo",
  "mmhmm Camera",
  "NDI Webcam Video",
  "vMix Virtual Camera",
  "YouCam",
  "SplitCam Video Capture",
  "e2eSoft iVCam",
  "Logi Capture",
  "Unity Capture",
  "NVIDIA Broadcast",
  "Screen Capture Recorder",
];

const integratedLabels = [
  "Integrated Camera",
  "Integrated Webcam",
  "HD User Facing",
  "FaceTime HD Camera",
  "Built-in Camera",
  "Internal Webcam",
];

const physicalLabels = [
  "Logitech BRIO",
  "USB Video Device",
  "Sony IMX415",
  "Razer Kiyo",
  "OBSBOT Tiny 2",
];

for (const label of virtualLabels) {
  assert.equal(isVirtualCamera(label), true, `harus dianggap virtual: ${label}`);
  assert.equal(classifyCamera(label), "virtual", `klasifikasi virtual salah: ${label}`);
}

for (const label of integratedLabels) {
  assert.equal(isVirtualCamera(label), false, `tidak boleh virtual: ${label}`);
  assert.equal(classifyCamera(label), "integrated", `klasifikasi terintegrasi salah: ${label}`);
}

for (const label of physicalLabels) {
  assert.equal(isVirtualCamera(label), false, `tidak boleh virtual: ${label}`);
  assert.equal(classifyCamera(label), "external", `klasifikasi eksternal salah: ${label}`);
}

assert.equal(classifyCamera(""), "external", "label kosong tidak boleh ditebak sebagai virtual");

const cameras: CameraInfo[] = [
  ...virtualLabels.map((label, index) => ({ deviceId: `v${index}`, label, kind: classifyCamera(label) })),
  ...physicalLabels.map((label, index) => ({ deviceId: `p${index}`, label, kind: classifyCamera(label) })),
  ...integratedLabels.map((label, index) => ({ deviceId: `i${index}`, label, kind: classifyCamera(label) })),
].sort(sortCameras);

const physical = physicalCameras(cameras);
assert.equal(physical.length, integratedLabels.length + physicalLabels.length, "jumlah kamera fisik salah");
assert.equal(
  physical.some((camera) => camera.kind === "virtual"),
  false,
  "kamera virtual tidak boleh lolos",
);
assert.equal(physical[0]?.kind, "integrated", "kamera terintegrasi harus diurutkan lebih dulu");
assert.equal(preferredCamera(cameras)?.kind, "integrated", "preferensi harus memilih kamera terintegrasi");

console.log(
  `check-cameras: ${virtualLabels.length} label virtual, ${physical.length} kamera fisik — lolos`,
);
