export const config = {
  // Batas pelanggaran sebelum tes dihentikan otomatis.
  maxViolations: 5,
  autoStop: true,
  // Kondisi wajah harus bertahan selama ini sebelum dihitung sebagai pelanggaran.
  graceMs: 2000,
  // Jeda polling deteksi wajah.
  faceIntervalMs: 300,
  // Wajah harus stabil selama ini pada tahap persiapan.
  faceStableMs: 1500,
  // Interval penyimpanan snapshot langsung ke IndexedDB.
  snapshotEveryMs: 15000,
  maxSnapshots: 40,
  // Rasiolandmark dinormalisasi 0..1. Dikalibrasi lewat `?debug`.
  yawRange: [0.3, 0.7],
  pitchRange: [0.4, 0.75],
  risk: { medium: 5, high: 12 },
  faceEngine: "mediapipe" as "mediapipe" | "sdk",

  // TAB_SWITCH dan WINDOW_BLUR dalam jendela ini dihitung sebagai satu kejadian.
  dedupeMs: 1000,
  // Periode tick timer.
  tickMs: 1000,
  // Timer kritis di bawah sisa detik ini.
  criticalMs: 60000,
  // Lama toast berada di layar.
  toastMs: 4000,
  // Interval pembacaan snapshot langsung di panel admin.
  livePollMs: 3000,

  camera: { width: 640, height: 480 },
  // Lebar gambar snapshot.
  grabWidth: 480,
  // Ukuran pratinjau kamera pada tahap persiapan.
  preview: { w: 160, h: 120 },
  // Ukuran thumbnail kamera pada header.
  thumb: { w: 96, h: 72 },
  // Opasitas watermark.
  watermarkOpacity: 0.06,
  // Lebar maksimum konten.
  width: { card: 560, question: 720, admin: 1120 },
  // Faktor konversi durasi subtes dari menit ke milidetik.
  minuteMs: 60000,
  // Durasi transisi respons aksi. Ditulis literal di globals.css dan sebagai
  // kelas duration-150 Tailwind, karena CSS tidak bisa membaca file ini.
  motionMs: 150,
};
