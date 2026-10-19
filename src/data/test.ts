export type SectionKind = "kognitif" | "kepribadian";

export type Question = {
  id: string;
  text: string;
  options: string[];
  /** Indeks jawaban benar. Hanya ada pada soal kognitif. */
  answer?: number;
};

export type Section = {
  id: string;
  name: string;
  minutes: number;
  kind: SectionKind;
  description: string;
  questions: Question[];
};

export const likertLabels = [
  "Sangat tidak setuju",
  "Tidak setuju",
  "Ragu-ragu",
  "Setuju",
  "Sangat setuju",
];

// Deret angka disusun dengan pola yang dapat diperiksa ulang, bukan pilihan
// A-E tanpa isi. Setiap pengecoh berjarak satu langkah dari pola supaya soal
// tetap menuntut perhitungan.
const numeric: Question[] = [
  {
    id: "n1",
    text: "2, 6, 12, 20, 30, ...",
    options: ["36", "40", "42", "44", "48"],
    answer: 2,
  },
  {
    id: "n2",
    text: "3, 7, 15, 31, 63, ...",
    options: ["95", "111", "123", "127", "129"],
    answer: 3,
  },
  {
    id: "n3",
    text: "1, 4, 9, 16, 25, ...",
    options: ["30", "32", "36", "42", "49"],
    answer: 2,
  },
  {
    id: "n4",
    text: "5, 11, 23, 47, 95, ...",
    options: ["187", "189", "191", "193", "199"],
    answer: 2,
  },
  {
    id: "n5",
    text: "4, 9, 19, 39, 79, ...",
    options: ["149", "155", "157", "159", "161"],
    answer: 3,
  },
  {
    id: "n6",
    text: "2, 6, 18, 54, 162, ...",
    options: ["324", "432", "468", "486", "512"],
    answer: 3,
  },
  {
    id: "n7",
    text: "1, 8, 27, 64, 125, ...",
    options: ["196", "206", "216", "226", "236"],
    answer: 2,
  },
  {
    id: "n8",
    text: "7, 10, 16, 28, 52, ...",
    options: ["96", "100", "104", "108", "112"],
    answer: 1,
  },
  {
    id: "n9",
    text: "2, 3, 5, 9, 17, ...",
    options: ["29", "31", "33", "35", "37"],
    answer: 2,
  },
  {
    id: "n10",
    text: "100, 92, 85, 79, 74, ...",
    options: ["68", "69", "70", "71", "72"],
    answer: 2,
  },
];

const logic: Question[] = [
  {
    id: "l1",
    text: "Semua pegawai di kantor X memiliki kartu akses. Semua pemilik kartu akses dapat masuk gedung. Kesimpulan yang tepat adalah ...",
    options: [
      "Semua pegawai kantor X dapat masuk gedung",
      "Sebagian pegawai kantor X tidak dapat masuk gedung",
      "Semua orang yang dapat masuk gedung adalah pegawai kantor X",
      "Tidak ada pegawai kantor X yang memiliki kartu akses",
      "Tidak dapat disimpulkan",
    ],
    answer: 0,
  },
  {
    id: "l2",
    text: "Semua bunga di taman berwarna merah. Sebagian tanaman di taman adalah bunga. Kesimpulan yang tepat adalah ...",
    options: [
      "Semua tanaman di taman berwarna merah",
      "Sebagian tanaman di taman berwarna merah",
      "Tidak ada tanaman di taman yang berwarna merah",
      "Semua yang berwarna merah adalah bunga",
      "Tidak dapat disimpulkan",
    ],
    answer: 1,
  },
  {
    id: "l3",
    text: "Tidak semua siswa mengikuti kegiatan ekstrakurikuler. Pernyataan yang pasti benar adalah ...",
    options: [
      "Semua siswa tidak mengikuti ekstrakurikuler",
      "Ada siswa yang tidak mengikuti ekstrakurikuler",
      "Ada siswa yang mengikuti ekstrakurikuler",
      "Tidak ada siswa yang mengikuti ekstrakurikuler",
      "Semua siswa mengikuti ekstrakurikuler",
    ],
    answer: 1,
  },
  {
    id: "l4",
    text: "Semua A adalah B. Tidak ada B yang C. Kesimpulan yang tepat adalah ...",
    options: [
      "Semua A adalah C",
      "Sebagian A adalah C",
      "Tidak ada A yang C",
      "Semua C adalah A",
      "Tidak dapat disimpulkan",
    ],
    answer: 2,
  },
  {
    id: "l5",
    text: "Jika hujan, maka jalan ditutup. Hari ini jalan tidak ditutup. Kesimpulan yang tepat adalah ...",
    options: [
      "Hari ini hujan",
      "Hari ini tidak hujan",
      "Jalan ditutup karena hujan",
      "Hari ini cerah",
      "Tidak dapat disimpulkan",
    ],
    answer: 1,
  },
  {
    id: "l6",
    text: "Jika Rina lulus ujian, ia mendapat beasiswa. Rina tidak mendapat beasiswa. Kesimpulan yang tepat adalah ...",
    options: [
      "Rina lulus ujian",
      "Rina tidak lulus ujian",
      "Rina mendapat beasiswa lain",
      "Rina belum mengikuti ujian",
      "Tidak dapat disimpulkan",
    ],
    answer: 1,
  },
  {
    id: "l7",
    text: "Budi lebih tua daripada Candra. Candra lebih tua daripada Dimas. Eka lebih muda daripada Dimas. Siapa yang paling tua?",
    options: ["Budi", "Candra", "Dimas", "Eka", "Tidak dapat ditentukan"],
    answer: 0,
  },
  {
    id: "l8",
    text: "Novel berada di sebelah kiri kamus. Kamus berada di sebelah kiri atlas. Buku resep berada di sebelah kanan atlas. Buku apa yang paling kiri?",
    options: ["Novel", "Kamus", "Atlas", "Buku resep", "Tidak dapat ditentukan"],
    answer: 0,
  },
];

const verbal: Question[] = [
  {
    id: "v1",
    text: "Sinonim dari kata \"amanah\" adalah ...",
    options: ["Tanggung jawab", "Kejujuran", "Kekayaan", "Kewibawaan", "Kesopanan"],
    answer: 0,
  },
  {
    id: "v2",
    text: "Antonim dari kata \"abstrak\" adalah ...",
    options: ["Nyata", "Konkret", "Jelas", "Umum", "Rumit"],
    answer: 1,
  },
  {
    id: "v3",
    text: "Dokter : rumah sakit = guru : ...",
    options: ["Murid", "Sekolah", "Buku", "Kelas", "Papan tulis"],
    answer: 1,
  },
  {
    id: "v4",
    text: "Pena : menulis = pisau : ...",
    options: ["Tajam", "Memotong", "Besi", "Dapur", "Mengasah"],
    answer: 1,
  },
  {
    id: "v5",
    text: "Sinonim dari kata \"kontribusi\" adalah ...",
    options: ["Sumbangan", "Keuntungan", "Kesepakatan", "Kewajiban", "Persaingan"],
    answer: 0,
  },
  {
    id: "v6",
    text: "Antonim dari kata \"optimis\" adalah ...",
    options: ["Ragu", "Pesimis", "Cemas", "Takut", "Lemah"],
    answer: 1,
  },
  {
    id: "v7",
    text: "Air : haus = makanan : ...",
    options: ["Kenyang", "Lapar", "Sehat", "Energi", "Gizi"],
    answer: 1,
  },
  {
    id: "v8",
    text: "Pilih kata yang tidak termasuk kelompok.",
    options: ["Meter", "Liter", "Kilogram", "Jam", "Panjang"],
    answer: 4,
  },
];

// Skala sikap, bukan soal benar-salah. Dua belas pernyataan mencampur arah
// positif dan negatif agar jawaban tidak bisa diisi dengan satu pola.
const personalityStatements = [
  "Saya menyelesaikan pekerjaan tepat waktu meskipun tidak diawasi.",
  "Saya mudah kehilangan fokus saat tugas terasa monoton.",
  "Saya terbuka menerima masukan yang berbeda dari pendapat saya.",
  "Saya menunda pekerjaan sulit sampai mendekati tenggat.",
  "Saya nyaman bekerja dalam tim dengan pembagian tugas yang jelas.",
  "Saya tetap tenang ketika menghadapi perubahan rencana mendadak.",
  "Saya lebih suka bekerja sendiri daripada berdiskusi dengan tim.",
  "Saya memeriksa kembali hasil kerja sebelum menyerahkannya.",
  "Saya cepat tersinggung ketika pekerjaan saya dikritik.",
  "Saya berani mengambil keputusan setelah mempertimbangkan risikonya.",
  "Saya kesulitan menyampaikan pendapat di depan orang baru.",
  "Saya berusaha memahami kebutuhan orang lain sebelum menilai.",
];

const personality: Question[] = personalityStatements.map((text, i) => ({
  id: `p${i + 1}`,
  text,
  options: likertLabels,
}));

export const sections: Section[] = [
  {
    id: "numeric",
    name: "Numerik",
    minutes: 8,
    kind: "kognitif",
    description: "Pilih angka yang melanjutkan pola deret.",
    questions: numeric,
  },
  {
    id: "logic",
    name: "Logika",
    minutes: 8,
    kind: "kognitif",
    description: "Baca premis dengan teliti, lalu pilih kesimpulan yang tepat.",
    questions: logic,
  },
  {
    id: "verbal",
    name: "Verbal",
    minutes: 6,
    kind: "kognitif",
    description: "Pilih kata atau pasangan kata yang paling sesuai.",
    questions: verbal,
  },
  {
    id: "personality",
    name: "Kepribadian",
    minutes: 6,
    kind: "kepribadian",
    description: "Tidak ada jawaban benar atau salah. Jawab sesuai kondisi Anda.",
    questions: personality,
  },
];

export const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);

export const totalMinutes = sections.reduce((sum, section) => sum + section.minutes, 0);
