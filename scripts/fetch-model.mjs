// Unduh model MediaPipe Face Landmarker ke public/mediapipe.
// Dipakai lewat `npm run models` karena curl bawaan Windows PowerShell 5.1
// adalah alias Invoke-WebRequest yang tidak mendukung flag curl.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const url =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const dest = resolve("public/mediapipe/face_landmarker.task");

mkdirSync(dirname(dest), { recursive: true });

const res = await fetch(url);
if (!res.ok) {
  console.error(`Gagal mengunduh model: ${res.status} ${res.statusText}`);
  process.exit(1);
}

writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
console.log(`Model tersimpan di ${dest} (${statSync(dest).size} byte)`);
