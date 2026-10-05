export type Question = { id: string; text: string; options: string[] };
export type Section = { id: string; name: string; minutes: number; questions: Question[] };

export const candidate = {
  name: "Ayu Prameswari",
  position: "Product Designer",
  email: "ayu.prameswari@contoh.id",
};

const letters = (n: number) => "ABCDE".slice(0, n).split("");

const numericSeries = [
  "2, 6, 12, 20, 30, ...",
  "3, 7, 15, 31, 63, ...",
  "1, 4, 9, 16, 25, ...",
  "5, 11, 23, 47, 95, ...",
  "2, 5, 11, 23, 47, ...",
  "4, 9, 19, 39, 79, ...",
  "8, 12, 18, 27, 39, ...",
  "1, 8, 27, 64, 125, ...",
];

const numeric: Question[] = numericSeries.map((text, i) => ({
  id: `n${i + 1}`,
  text,
  options: letters(5),
}));

const logicRows: [string, string[]][] = [
  [
    "Semua A adalah B, tetapi tidak semua B adalah A. Kesimpulan yang tepat adalah",
    ["Sebagian A bukan B", "Semua B adalah A", "Tidak ada A yang B", "Sebagian B adalah A", "Semua A bukan B"],
  ],
  [
    "Rani lebih tinggi daripada Bayu. Dita lebih pendek daripada Bayu. Siapa yang paling pendek?",
    ["Rani", "Bayu", "Dita", "Bayu dan Dita", "Tidak dapat ditentukan"],
  ],
  [
    "Jika hujan, maka jalan ditutup. Hari ini jalan tidak ditutup. Kesimpulannya",
    ["Hari ini tidak hujan", "Hari ini hujan", "Hari ini cerah", "Tidak dapat ditentukan", "Hujan terjadi setiap sore"],
  ],
  [
    "Budi, Candra, Dimas, dan Eka berurutan. Candra bukan pertama maupun terakhir. Budi ada sebelum Dimas. Siapa yang terakhir?",
    ["Budi", "Candra", "Dimas", "Eka", "Tidak dapat ditentukan"],
  ],
  [
    "Semua A adalah C dan semua C adalah D. Soal semua B, apa yang benar?",
    ["Semua B adalah A", "Semua A adalah B", "Tidak ada hubungan", "Semua C adalah B", "Semua D adalah B"],
  ],
  [
    "Deret 1, 2, 3, 5, 8, 13, ... disebut",
    ["Fibonacci", "Bilangan prima", "Bilangan genap", "Kuadrat", "Pangkat"],
  ],
];

const logic: Question[] = logicRows.map(([text, options], i) => ({
  id: `l${i + 1}`,
  text,
  options,
}));

const personalityStatements = [
  "Saya bekerja lebih baik bila tugas diberi konteks yang jelas",
  "Saya cenderung menolak permintaan yang berubah-ubah",
  "Saya lebih nyaman mengambil peran memimpin dalam kelompok",
  "Saya biasanya mengabaikan detail kecil dalam pekerjaan",
  "Saya senang bekerja dengan orang yang baru dikenal",
  "Saya stres ketika pekerjaan berantakan",
  "Saya cepat belajar dari kesalahan orang lain",
  "Saya lebih suka keputusan yang sudah teruji daripada yang baru",
  "Saya mudah tersinggung saat dikritik",
  "Saya percaya hasil yang baik lebih penting daripada proses",
];

const personality: Question[] = personalityStatements.map((text, i) => ({
  id: `p${i + 1}`,
  text,
  options: letters(5),
}));

export const likertLabels = [
  "Sangat tidak setuju",
  "Tidak setuju",
  "Ragu-ragu",
  "Setuju",
  "Sangat setuju",
];

export const sections: Section[] = [
  { id: "numeric", name: "Numerik", minutes: 4, questions: numeric },
  { id: "logic", name: "Logika", minutes: 4, questions: logic },
  { id: "personality", name: "Kepribadian", minutes: 3, questions: personality },
];
