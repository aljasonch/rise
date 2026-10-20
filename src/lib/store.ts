import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sections } from "../data/test.ts";

// ==========================================
// 1. Konfigurasi
// ==========================================
export const config = {
  tickMs: 1000,
  criticalMs: 60000,
  toastMs: 5000,
  minuteMs: 60000,
};

// ==========================================
// 2. Identitas Peserta & SSO
// ==========================================
export type Identity = {
  name: string;
  email: string;
  position: string;
};

export const ssoProfiles: Identity[] = [
  {
    name: "Budi Santoso",
    email: "budi.santoso@perusahaan.com",
    position: "Software Engineer",
  },
  {
    name: "Siti Rahma",
    email: "siti.rahma@perusahaan.com",
    position: "Product Manager",
  },
  {
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@perusahaan.com",
    position: "Data Analyst",
  },
];

export const defaultSsoUser: Identity = ssoProfiles[0];

// ==========================================
// 3. Status & Tipe Sesi
// ==========================================
export type Status = "berlangsung" | "selesai" | "waktu_habis" | "dihentikan";

export type Session = {
  id: string;
  candidate: Identity;
  status: Status;
  startedAt: number;
  endedAt?: number;
  section: number;
  deadline: number;
  answers: Record<string, number>;
  reviewed: boolean;
  forceStop: boolean;
};

export const statusLabel: Record<Status, string> = {
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  waktu_habis: "Waktu habis",
  dihentikan: "Dihentikan",
};

// ==========================================
// 4. Hook Pembacaan Waktu
// ==========================================
export const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);

  return now;
};

// ==========================================
// 5. Penilaian / Skoring Asesmen
// ==========================================
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

// ==========================================
// 6. Zustand Store & Persistence
// ==========================================
type State = {
  sessions: Record<string, Session>;
  activeId: string;
  hydrated: boolean;
  notice: string;
  setNotice: (text: string) => void;
  start: (candidate: Identity) => void;
  answer: (questionId: string, value: number) => void;
  nextSection: () => void;
  finish: (status: Status) => void;
  markReviewed: (sessionId: string) => void;
  stop: (sessionId: string) => void;
  clearActive: () => void;
};

const now = () => Date.now();
const uid = () => crypto.randomUUID();

const withSession = (sessions: Record<string, Session>, id: string, fn: (session: Session) => Session) => {
  const current = sessions[id];
  if (!current) return sessions;
  return { ...sessions, [id]: fn(current) };
};

const newSession = (candidate: Identity): Session => ({
  id: uid(),
  candidate: { ...candidate },
  status: "berlangsung",
  startedAt: now(),
  section: 0,
  deadline: now() + sections[0].minutes * config.minuteMs,
  answers: {},
  reviewed: false,
  forceStop: false,
});

type PersistedState = Pick<State, "sessions" | "activeId">;

const isSession = (value: unknown): value is Session => {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<Session>;
  return (
    typeof session.id === "string" &&
    typeof session.startedAt === "number" &&
    typeof session.section === "number" &&
    typeof session.deadline === "number" &&
    Boolean(session.candidate) &&
    typeof session.candidate?.name === "string" &&
    Boolean(session.answers)
  );
};

const sanitizeSessions = (value: unknown): Record<string, Session> => {
  if (!value || typeof value !== "object") return {};

  const sessions = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([id, session]) => !id.startsWith("seed-") && isSession(session),
    ),
  ) as Record<string, Session>;

  return sessions;
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const editActive = (fn: (session: Session) => Session) => {
        const id = get().activeId;
        set((state) => ({ sessions: withSession(state.sessions, id, fn) }));
      };

      return {
        sessions: {},
        activeId: "",
        hydrated: false,
        notice: "",

        setNotice: (text) => set({ notice: text }),

        start: (candidate) => {
          const current = get().sessions[get().activeId];
          if (current?.status === "berlangsung") return;

          const session = newSession(candidate);
          set((state) => ({
            sessions: { ...state.sessions, [session.id]: session },
            activeId: session.id,
            notice: "",
          }));
        },

        answer: (questionId, value) =>
          editActive((session) =>
            session.status === "berlangsung"
              ? { ...session, answers: { ...session.answers, [questionId]: value } }
              : session,
          ),

        nextSection: () =>
          editActive((session) => {
            if (session.status !== "berlangsung") return session;
            const next = sections[session.section + 1];
            if (!next) return session;
            return {
              ...session,
              section: session.section + 1,
              deadline: now() + next.minutes * config.minuteMs,
            };
          }),

        finish: (status) =>
          editActive((session) =>
            session.status === "berlangsung"
              ? { ...session, status, endedAt: now(), forceStop: false }
              : session,
          ),

        markReviewed: (sessionId) =>
          set((state) => ({
            sessions: withSession(state.sessions, sessionId, (session) => ({ ...session, reviewed: true })),
          })),

        stop: (sessionId) =>
          set((state) => ({
            sessions: withSession(state.sessions, sessionId, (session) =>
              session.status === "berlangsung"
                ? { ...session, status: "dihentikan", endedAt: now(), forceStop: true }
                : session,
            ),
          })),

        clearActive: () => set({ activeId: "", notice: "" }),
      };
    },
    {
      name: "rise-sessions",
      version: 4,
      skipHydration: true,
      partialize: (state) => ({ sessions: state.sessions, activeId: state.activeId }),
      migrate: (persistedState) => {
        const value = (persistedState ?? {}) as Partial<PersistedState>;
        const sessions = sanitizeSessions(value.sessions);
        const activeId = value.activeId && sessions[value.activeId] ? value.activeId : "";
        return { sessions, activeId };
      },
    },
  ),
);

export const hydrate = async () => {
  try {
    localStorage.removeItem("rise-demo");
  } catch {
    // Mode privat
  }

  await useStore.persist.rehydrate();

  const state = useStore.getState();
  const sessions = sanitizeSessions(state.sessions);
  const activeId = state.activeId && sessions[state.activeId] ? state.activeId : "";

  useStore.setState({ sessions, activeId, hydrated: true });
};
