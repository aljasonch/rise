import { sections } from "../data/test.ts";
import type { Session } from "./store";

export type SectionScore = {
  id: string;
  name: string;
  kind: "kognitif" | "kepribadian";
  correct: number;
  answered: number;
  total: number;
  percent: number;
};

export type SessionScore = {
  sections: SectionScore[];
  correct: number;
  answered: number;
  total: number;
  percent: number;
  personalityAnswered: number;
  personalityTotal: number;
};

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export const scoreSession = (session: Session): SessionScore => {
  const scored = sections.map((section) => {
    const answered = section.questions.filter((question) => question.id in session.answers).length;
    const correct =
      section.kind === "kognitif"
        ? section.questions.filter((question) => session.answers[question.id] === question.answer).length
        : 0;

    return {
      id: section.id,
      name: section.name,
      kind: section.kind,
      correct,
      answered,
      total: section.questions.length,
      percent:
        section.kind === "kognitif"
          ? percent(correct, section.questions.length)
          : percent(answered, section.questions.length),
    };
  });

  const cognitive = scored.filter((section) => section.kind === "kognitif");
  const personality = scored.find((section) => section.kind === "kepribadian");
  const total = cognitive.reduce((sum, section) => sum + section.total, 0);
  const correct = cognitive.reduce((sum, section) => sum + section.correct, 0);
  const answered = cognitive.reduce((sum, section) => sum + section.answered, 0);

  return {
    sections: scored,
    correct,
    answered,
    total,
    percent: percent(correct, total),
    personalityAnswered: personality?.answered ?? 0,
    personalityTotal: personality?.total ?? 0,
  };
};
