export const config = {
  // Kondisi wajah harus bertahan selama ini sebelum dihitung sebagai pelanggaran.
  graceMs: 2000,
  // Jeda polling deteksi wajah.
  faceIntervalMs: 300,
  // Wajah harus stabil selama ini pada tahap persiapan.
  faceStableMs: 1500,
  // Interval penyimpanan snapshot langsung ke IndexedDB.
  snapshotEveryMs: 15000,
  // Jumlah maksimum snapshot riwayat yang disimpan per sesi.
  maxSnapshots: 40,
  // Ambang wajah dianggap tidak menghadap layar, dalam derajat dari sumbu kamera.
  lookAway: { yawDeg: 30, pitchDeg: 25 },
  risk: { medium: 5, high: 12 },

  // TAB_SWITCH dan WINDOW_BLUR dalam jendela ini dihitung sebagai satu kejadian.
  dedupeMs: 1000,
  // Periode tick timer.
  tickMs: 1000,
  // Timer kritis di bawah sisa detik ini.
  criticalMs: 60000,
  // Lama toast berada di layar.
  toastMs: 5000,
  // Interval pembacaan snapshot langsung di panel admin.
  livePollMs: 3000,
  // Interval pembaruan arsip snapshot saat sesi masih berjalan.
  historyPollMs: 15000,

  camera: { width: 640, height: 480 },
  // Lebar gambar snapshot. Cukup besar untuk pratinjau admin tanpa membebani IndexedDB.
  grabWidth: 720,
  // Opasitas watermark.
  watermarkOpacity: 0.06,
  // Faktor konversi durasi subtes dari menit ke milidetik.
  minuteMs: 60000,
};
