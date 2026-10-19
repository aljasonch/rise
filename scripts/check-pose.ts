// Pemeriksaan untuk faceAngles: mengunci konvensi layout matrix yang tidak bisa
// ditebak dari kode saja. Jalankan dengan: node scripts/check-pose.ts
import assert from "node:assert/strict";
import { faceAngles } from "../src/lib/pose.ts";

const RAD = Math.PI / 180;

// Matrix rotasi murni dalam layout yang sama dengan keluaran FaceLandmarker.
const rotY = (deg: number) => {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
};
const rotX = (deg: number) => {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
};

const near = (got: number, want: number, tol = 0.2) =>
  assert.ok(Math.abs(got - want) <= tol, `mengharapkan ${want}, dapat ${got}`);

// 1. Hadap depan harus nol.
const front = faceAngles([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
near(front.yaw, 0);
near(front.pitch, 0);

// 2. Putaran yaw murni harus pulih persis.
for (const deg of [0, 15, 30, 45, 60, -45]) near(faceAngles(rotY(deg)).yaw, deg);

// 3. Putaran pitch murni. Aplikasi hanya memakai magnitudenya, jadi tanda
//    bergantung urutan rotasi dan tidak dikunci di sini.
for (const deg of [0, 15, 25, 40]) near(Math.abs(faceAngles(rotX(deg)).pitch), deg);

// 4. Data nyata dari face landmark yang diputar ±90° ke kanan
//    (github.com/google-ai-edge/mediapipe/issues/2809). THREE.js Euler ZYX
//    menghasilkan yaw -56.095° dan pitch -3.389° pada matrix yang sama.
const real = [
  0.5567780137062073, 0.034023914486169815, 0.8299639821052551, 0,
  -0.011918997392058372, 0.9993847608566284, -0.03297339752316475, 0,
  -0.8305754661560059, 0.008466490544378757, 0.5568410754203796, 0,
  -1.418548345565796, 6.790719509124756, -39.25355529785156, 1,
];
const pose = faceAngles(real);
near(pose.yaw, -56.095, 0.5);
near(pose.pitch, 0, 2);

// 5. Ekor homogen wajib (0, 0, 0, 1). Kalau tidak, indeks di atas sudah salah.
assert.deepEqual([real[3], real[7], real[11], real[15]], [0, 0, 0, 1]);

console.log("check-pose: 5 pemeriksaan lolos");
