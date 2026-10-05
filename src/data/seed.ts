import type { Session } from "@/lib/store";
import { sections } from "@/data/test";
import type { ViolationType } from "@/lib/violations";
// Angka pseudo-random tetap agar file seed singkat dan hasilnya selalu sama.
const rng = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const people = [
  { name: "Bagus Pratama", position: "Backend Engineer", email: "bagus.pratama@contoh.id" },
  { name: "Citra Lestari", position: "Data Analyst", email: "citra.lestari@contoh.id" },
  { name: "Dimas Anggara", position: "Account Manager", email: "dimas.anggara@contoh.id" },
  { name: "Elsa Maharani", position: "HR Specialist", email: "elsa.maharani@contoh.id" },
  { name: "Fajar Nugroho", position: "QA Engineer", email: "fajar.nugroho@contoh.id" },
  { name: "Gita Rahmawati", position: "Marketing Analyst", email: "gita.rahmawati@contoh.id" },
];

// Profil pelanggaran per sesi, sengaja bervariasi agar tiap baris beda karakter.
const profiles: ViolationType[][] = [
  ["NO_FACE", "LOOK_AWAY"],
  ["TAB_SWITCH", "WINDOW_BLUR", "COPY_PASTE"],
  ["FULLSCREEN_EXIT", "TAB_SWITCH"],
  ["MULTIPLE_FACES", "MULTIPLE_FACES", "NO_FACE", "MULTIPLE_SCREENS", "TAB_SWITCH"],
  ["SHORTCUT", "SHORTCUT", "COPY_PASTE", "TAB_SWITCH", "RELOAD"],
  ["MULTIPLE_SCREENS", "NO_FACE", "LOOK_AWAY", "LOOK_AWAY", "WINDOW_BLUR"],
];

const build = (index: number): Session => {
  const next = rng(index + 7);
  const startedAt = Date.UTC(2026, 8, 21, 1 + index, 5 + index * 7, 0);
  const duration = 11 * 60000 + Math.floor(next() * 8 * 60000);
  const endedAt = startedAt + duration;
  const types = profiles[index];
  const step = Math.floor(duration / (types.length + 1));

  const violations = types.map((type, i) => {
    const at = startedAt + step * (i + 1);
    return {
      id: `seed-${index}-${i}`,
      type,
      at,
      endedAt: at + 1500 + Math.floor(next() * 6000),
    };
  });

  // Sesi dengan risiko tinggi sengaja dibiarkan belum ditinjau.
  const stopped = types.length >= 5;
  const flagged = types.length >= 4;
  const answered = stopped ? 14 : 24;

  return {
    id: `seed-${index + 1}`,
    candidate: people[index],
    status: stopped ? "dihentikan" : "selesai",
    startedAt,
    endedAt,
    section: 2,
    deadline: endedAt,
    answers: Object.fromEntries(
      sections.slice(0, 3).flatMap((sec) => sec.questions).slice(0, answered).map((q, i) => [q.id, i % 5]),
    ),
    violations,
    reviewed: !flagged,
    forceStop: false,
  };
};

export const seedSessions = (): Record<string, Session> => {
  const entries = people.map((_, i) => {
    const session = build(i);
    return [session.id, session] as const;
  });
  return Object.fromEntries(entries);
};
