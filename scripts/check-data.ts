// Memeriksa bank soal: identitas, opsi, kunci jawaban, dan perhitungan skor.
// Jalankan dengan: node scripts/check-data.ts
import assert from "node:assert/strict";
import { sections, totalQuestions } from "../src/data/test.ts";
import { scoreSession } from "../src/lib/score.ts";
import type { Session } from "../src/lib/store.ts";

const ids = new Set<string>();
let cognitive = 0;
let personality = 0;

assert.equal(new Set(sections.map((section) => section.id)).size, sections.length, "id subtes harus unik");
assert.ok(totalQuestions >= 30, "bank soal terlalu kecil");

for (const section of sections) {
  assert.ok(section.name.trim().length > 0, `nama subtes kosong: ${section.id}`);
  assert.ok(section.description.trim().length > 0, `deskripsi subtes kosong: ${section.id}`);
  assert.ok(section.minutes > 0 && section.minutes <= 30, `durasi tidak wajar: ${section.id}`);
  assert.ok(section.questions.length >= 5, `subtes terlalu pendek: ${section.id}`);

  for (const question of section.questions) {
    assert.ok(!ids.has(question.id), `id soal duplikat: ${question.id}`);
    ids.add(question.id);
    assert.ok(question.text.trim().length >= 10, `soal terlalu pendek: ${question.id}`);
    assert.ok(question.options.length >= 4, `opsi kurang dari 4: ${question.id}`);
    assert.equal(
      new Set(question.options).size,
      question.options.length,
      `opsi duplikat: ${question.id}`,
    );
    assert.ok(
      question.options.every((option) => option.trim().length > 0),
      `opsi kosong: ${question.id}`,
    );
    assert.ok(
      !question.options.every((option) => /^[A-E]$/.test(option)),
      `opsi masih placeholder: ${question.id}`,
    );

    if (section.kind === "kognitif") {
      cognitive += 1;
      assert.ok(Number.isInteger(question.answer), `kunci jawaban hilang: ${question.id}`);
      assert.ok(
        (question.answer as number) >= 0 && (question.answer as number) < question.options.length,
        `kunci jawaban di luar rentang: ${question.id}`,
      );
    } else {
      personality += 1;
      assert.equal(question.answer, undefined, `soal kepribadian tidak boleh punya kunci: ${question.id}`);
    }
  }
}

assert.equal(cognitive, 26, "jumlah soal kognitif harus 26");
assert.equal(personality, 12, "jumlah soal kepribadian harus 12");
assert.equal(totalQuestions, 38, "total soal harus 38");

const base: Session = {
  id: "check-data",
  candidate: {
    name: "Pemeriksaan Data",
    email: "data@contoh.id",
    position: "QA",
    verificationCode: "ABC123",
  },
  status: "selesai",
  startedAt: 0,
  endedAt: 1,
  section: sections.length - 1,
  deadline: 1,
  answers: {},
  reviewed: false,
  forceStop: false,
};

const allAnswers = Object.fromEntries(
  sections.flatMap((section) =>
    section.questions.map((question) => [question.id, section.kind === "kognitif" ? question.answer! : 0]),
  ),
);

const perfect = scoreSession({ ...base, answers: allAnswers });
assert.equal(perfect.correct, 26, "semua jawaban benar harus menghasilkan 26");
assert.equal(perfect.percent, 100, "persentase sempurna harus 100");
assert.equal(perfect.personalityAnswered, 12, "semua soal kepribadian harus terhitung");

const empty = scoreSession(base);
assert.equal(empty.correct, 0, "tanpa jawaban skor harus 0");
assert.equal(empty.answered, 0, "tanpa jawaban tidak ada yang terjawab");

const half = Object.fromEntries(
  sections
    .filter((section) => section.kind === "kognitif")
    .flatMap((section) =>
      section.questions.slice(0, 5).map((question) => [question.id, question.answer!]),
    ),
);
const partial = scoreSession({ ...base, answers: half });
assert.equal(partial.correct, 15, "lima jawaban benar per subtes kognitif harus 15");

console.log(
  `check-data: ${sections.length} subtes, ${cognitive} kognitif, ${personality} kepribadian, ${totalQuestions} soal — lolos`,
);
