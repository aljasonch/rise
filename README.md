# RISE

Asesmen kandidat dengan pemantauan kamera dan layar. Aplikasi ini berjalan
sepenuhnya di browser: sesi, jawaban, dan snapshot disimpan di perangkat yang
sama, tanpa backend.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Kamera dan berbagi layar membutuhkan secure
context, jadi gunakan `localhost` atau HTTPS. Untuk HTTPS lokal:

```bash
npm run dev:https
```

Model MediaPipe dan aset WASM sudah disalin ke `public/mediapipe` oleh
`postinstall`. Untuk mengunduh ulang model:

```bash
npm run models
```

## Alur

1. **Identitas** — nama, email, dan posisi diisi kandidat. Data ini yang muncul
   di panel admin.
2. **Persiapan** — pemeriksaan browser, layar tunggal, kamera fisik, wajah, dan
   berbagi seluruh layar. Kamera virtual seperti OBS, ManyCam, atau DroidCam
   ditolak. Tes tidak dapat dimulai tanpa kamera fisik.
3. **Tes** — empat subtes: Numerik (10 soal), Logika (8), Verbal (8), dan
   Kepribadian (12). Timer per subtes, palet soal, dan catatan pengawasan tampil
   selama pengerjaan.
4. **Selesai** — ringkasan durasi, jawaban, dan catatan pengawasan. Kandidat
   dapat memulai sesi baru tanpa menghapus sesi lama.

Panel admin di `/admin` hanya menampilkan sesi yang benar-benar dikerjakan.
Tidak ada data seed atau data demo. Sesi yang sudah selesai menampilkan kamera
dan layar dari arsip snapshot; sesi berjalan memakai snapshot langsung.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run check
npm run build
```

`npm run check` menjalankan pemeriksaan data soal, penyaring kamera virtual, dan
perhitungan sudut wajah tanpa browser.

## Penyimpanan

- Sesi dan identitas: `localStorage` dengan kunci `rise-sessions`.
- Snapshot kamera dan layar: IndexedDB (`keyval-store`), dibatasi
  `config.maxSnapshots` per sesi.
- Kunci lama `rise-demo` dihapus saat hidrasi supaya data demo tidak muncul lagi.

Menghapus data situs akan menghapus seluruh riwayat sesi dan snapshot.

## Struktur

```
src/app/test          alur kandidat
src/app/admin         daftar dan detail sesi
src/components/test   intro, persiapan, pengerjaan, overlay, watermark
src/components/admin  header, pratinjau snapshot, lightbox
src/data/test.ts      bank soal dan kunci jawaban
src/lib/cameras.ts    klasifikasi dan penyaringan kamera virtual
src/lib/media.ts      akses kamera/layar dan penanganan galat
src/lib/score.ts      skor kognitif per subtes
```
