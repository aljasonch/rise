import { create } from "zustand";
import { persist } from "zustand/middleware";
import { candidate, sections } from "@/data/test";
import { seedSessions } from "@/data/seed";
import { config } from "./config";
import { isInstant, type Violation, type ViolationType } from "./violations";

export type Status = "berlangsung" | "selesai" | "waktu_habis" | "dihentikan";

export type Session = {
  id: string;
  candidate: { name: string; position: string; email: string };
  status: Status;
  startedAt: number;
  endedAt?: number;
  section: number;
  deadline: number;
  answers: Record<string, number>;
  violations: Violation[];
  reviewed: boolean;
  forceStop: boolean;
};

type State = {
  sessions: Record<string, Session>;
  activeId: string;
  hydrated: boolean;
  // Toast sekali pakai, tidak ikut dipersist.
  notice: string;
  setNotice: (text: string) => void;
  start: () => void;
  answer: (questionId: string, value: number) => void;
  nextSection: () => void;
  addViolation: (type: ViolationType) => string | null;
  closeViolation: (type: ViolationType) => void;
  finish: (status: Status) => void;
  markReviewed: (sessionId: string) => void;
  stop: (sessionId: string) => void;
};

const now = () => Date.now();
const uid = () => crypto.randomUUID();

const withSession = (
  sessions: Record<string, Session>,
  id: string,
  fn: (s: Session) => Session,
) => {
  const current = sessions[id];
  if (!current) return sessions;
  return { ...sessions, [id]: fn(current) };
};

const newSession = (): Session => ({
  id: uid(),
  candidate,
  status: "berlangsung",
  startedAt: now(),
  section: 0,
  deadline: now() + sections[0].minutes * config.minuteMs,
  answers: {},
  violations: [],
  reviewed: false,
  forceStop: false,
});

export const useStore = create<State>()(
  persist(
    (set, get) => {
      // Semua aksi kandidat bekerja pada sesi aktif.
      const editActive = (fn: (s: Session) => Session) => {
        const id = get().activeId;
        set((s) => ({ sessions: withSession(s.sessions, id, fn) }));
      };

      return {
        sessions: {},
        activeId: "",
        hydrated: false,
        notice: "",

        setNotice: (text) => set({ notice: text }),

        start: () => {
          const session = newSession();
          set((s) => ({
            sessions: { ...s.sessions, [session.id]: session },
            activeId: session.id,
          }));
        },

        answer: (questionId, value) =>
          editActive((s) => ({ ...s, answers: { ...s.answers, [questionId]: value } })),

        nextSection: () =>
          editActive((s) => {
            const section = s.section + 1;
            return { ...s, section, deadline: now() + sections[section].minutes * config.minuteMs };
          }),

        // Satu episode dihitung satu kali: diabaikan bila episode yang sama masih terbuka.
        // Mengembalikan id pelanggaran baru, atau null bila tidak ada yang dicatat.
        addViolation: (type) => {
          const id = get().activeId;
          const session = get().sessions[id];
          if (!session) return null;
          const at = now();

          if (session.violations.some((v) => v.type === type && !v.endedAt)) return null;

          // Berpindah tab dan kehilangan fokus sering datang bersamaan, dihitung satu kali.
          if (type === "TAB_SWITCH" || type === "WINDOW_BLUR") {
            const pair = type === "TAB_SWITCH" ? "WINDOW_BLUR" : "TAB_SWITCH";
            if (session.violations.some((v) => v.type === pair && at - v.at < config.dedupeMs)) {
              return null;
            }
          }

          const violation: Violation = {
            id: uid(),
            type,
            at,
            endedAt: isInstant(type) ? at : undefined,
            snap: true,
          };
          set((s) => ({
            sessions: withSession(s.sessions, id, (cur) => ({
              ...cur,
              violations: [...cur.violations, violation],
            })),
          }));
          return violation.id;
        },

        // Dipanggil tiap frame deteksi wajah, jadi no-op harus benar-benar free.
        closeViolation: (type) => {
          const id = get().activeId;
          const open = get().sessions[id]?.violations.some((v) => v.type === type && !v.endedAt);
          if (!open) return;
          editActive((s) => ({
            ...s,
            violations: s.violations.map((v) =>
              v.type === type && !v.endedAt ? { ...v, endedAt: now() } : v,
            ),
          }));
        },

        finish: (status) => editActive((s) => ({ ...s, status, endedAt: now() })),

        markReviewed: (sessionId) =>
          set((s) => ({
            sessions: withSession(s.sessions, sessionId, (cur) => ({ ...cur, reviewed: true })),
          })),

        stop: (sessionId) =>
          set((s) => ({
            sessions: withSession(s.sessions, sessionId, (cur) => ({ ...cur, forceStop: true })),
          })),
      };
    },
    {
      name: "rise-demo",
      skipHydration: true,
      partialize: (s) => ({ sessions: s.sessions, activeId: s.activeId }),
    },
  ),
);

// Dipanggil sekali saat halaman pertama dimuat.
export const hydrate = async () => {
  await useStore.persist.rehydrate();
  if (Object.keys(useStore.getState().sessions).length === 0) {
    useStore.setState({ sessions: seedSessions() });
  }
  useStore.setState({ hydrated: true });
};
