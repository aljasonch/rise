export type ViolationType =
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LOOK_AWAY"
  | "FULLSCREEN_EXIT"
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "COPY_PASTE"
  | "SHORTCUT"
  | "MULTIPLE_SCREENS"
  | "CAMERA_OFF"
  | "CAMERA_FROZEN"
  | "SCREEN_SHARE_STOPPED";

export type Violation = {
  id: string;
  type: ViolationType;
  at: number;
  endedAt?: number;
  snap?: boolean;
};

export const violationLabel: Record<ViolationType, string> = {
  NO_FACE: "Wajah tidak terdeteksi",
  MULTIPLE_FACES: "Lebih dari satu wajah",
  LOOK_AWAY: "Wajah tidak menghadap layar",
  FULLSCREEN_EXIT: "Keluar dari layar penuh",
  TAB_SWITCH: "Berpindah tab",
  WINDOW_BLUR: "Jendela kehilangan fokus",
  COPY_PASTE: "Aksi salin atau tempel",
  SHORTCUT: "Pintasan terlarang",
  MULTIPLE_SCREENS: "Layar tambahan terdeteksi",
  CAMERA_OFF: "Kamera terputus",
  CAMERA_FROZEN: "Gambar kamera membeku (indikasi kamera virtual)",
  SCREEN_SHARE_STOPPED: "Berbagi layar dihentikan",
};

// Kriteria skor: total poin = Σ (bobot tipe × jumlah kejadian).
// 3 = orang lain di frame, meninggalkan konteks tes, atau mematikan pengawasan.
// 2 = keluar dari wadah tes yang dikunci.
// 1 = gangguan pendeteksian atau percobaan yang masih di dalam halaman.
// Durasi episode, urutan subtes, dan waktu kejadian tidak memengaruhi poin.
export const violationWeight: Record<ViolationType, number> = {
  NO_FACE: 1,
  MULTIPLE_FACES: 3,
  LOOK_AWAY: 1,
  FULLSCREEN_EXIT: 2,
  TAB_SWITCH: 3,
  WINDOW_BLUR: 1,
  COPY_PASTE: 1,
  SHORTCUT: 1,
  MULTIPLE_SCREENS: 3,
  CAMERA_OFF: 3,
  CAMERA_FROZEN: 3,
  SCREEN_SHARE_STOPPED: 3,
};

// Kejadian sesaat tidak punya episode, jadi langsung ditutup saat dicatat.
const instant: ViolationType[] = ["COPY_PASTE", "SHORTCUT", "WINDOW_BLUR"];

export const isInstant = (type: ViolationType) => instant.includes(type);
