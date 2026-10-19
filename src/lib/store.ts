import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sections } from "@/data/test";
import type { Identity } from "./identity";
import { config } from "./config";
import { isInstant, type Violation, type ViolationType } from "./violations";

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
  violations: Violation[];
  reviewed: boolean;
  forceStop: boolean;
};

export const statusLabel: Record<Status, string> = {
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  waktu_habis: "Waktu habis",
  dihentikan: "Dihentikan",
};

type State = {
  sessions: Record<string, Session>;
  activeId: string;
  hydrated: boolean;
  // Toast sekali pakai, tidak ikut dipersist.
  notice: string;
  setNotice: (text: string) => void;
  start: (candidate: Identity) => void;
  answer: (questionId: string, value: number) => void;
  nextSection: () => void;
  addViolation: (type: ViolationType) => string | null;
  closeViolation: (type: ViolationType) => void;
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
  violations: [],
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
    Array.isArray(session.violations) &&
    Boolean(session.answers)
  );
};

// Sesi demo lama tidak boleh muncul lagi di panel admin. Penyaringan dilakukan
// saat migrasi dan sekali lagi saat hidrasi untuk berjaga-jaga.
const sanitizeSession = (session: Session): Session => ({
  ...session,
  // RELOAD sudah tidak dipakai. Data lama yang masih menyimpannya dibersihkan
  // agar label dan skor tidak menghitung pelanggaran yang sudah dihapus.
  violations: session.violations.filter((violation) => (violation.type as string) !== "RELOAD"),
});

const sanitizeSessions = (value: unknown): Record<string, Session> => {
  if (!value || typeof value !== "object") return {};

  const sessions = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([id, session]) => !id.startsWith("seed-") && isSession(session),
    ),
  ) as Record<string, Session>;

  return Object.fromEntries(
    Object.entries(sessions).map(([id, session]) => [id, sanitizeSession(session)]),
  ) as Record<string, Session>;
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      // Semua aksi peserta bekerja pada sesi aktif.
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

        // Satu episode dihitung satu kali: diabaikan bila episode yang sama masih terbuka.
        // Mengembalikan id pelanggaran baru, atau null bila tidak ada yang dicatat.
        addViolation: (type) => {
          const id = get().activeId;
          const session = get().sessions[id];
          if (!session || session.status !== "berlangsung") return null;
          const at = now();

          if (session.violations.some((violation) => violation.type === type && !violation.endedAt)) {
            return null;
          }

          // Berpindah tab dan kehilangan fokus sering datang bersamaan, dihitung satu kali.
          if (type === "TAB_SWITCH" || type === "WINDOW_BLUR") {
            const pair = type === "TAB_SWITCH" ? "WINDOW_BLUR" : "TAB_SWITCH";
            if (session.violations.some((violation) => violation.type === pair && at - violation.at < config.dedupeMs)) {
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
          set((state) => ({
            sessions: withSession(state.sessions, id, (current) => ({
              ...current,
              violations: [...current.violations, violation],
            })),
          }));
          return violation.id;
        },

        // Dipanggil tiap frame deteksi wajah, jadi no-op harus benar-benar free.
        closeViolation: (type) => {
          const id = get().activeId;
          const session = get().sessions[id];
          if (!session || session.status !== "berlangsung") return;
          if (!session.violations.some((violation) => violation.type === type && !violation.endedAt)) return;
          editActive((current) => ({
            ...current,
            violations: current.violations.map((violation) =>
              violation.type === type && !violation.endedAt ? { ...violation, endedAt: now() } : violation,
            ),
          }));
        },

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

        // Hentikan langsung terlihat di admin tanpa menunggu tab peserta.
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
      version: 3,
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

// Dipanggil sekali saat halaman pertama dimuat.
export const hydrate = async () => {
  // Kunci lama berisi data demo. Hapus agar panel admin benar-benar bersih.
  try {
    localStorage.removeItem("rise-demo");
  } catch {
    // Penyimpanan bisa diblokir oleh mode privat; hidrasi tetap dilanjutkan.
  }

  await useStore.persist.rehydrate();

  const state = useStore.getState();
  const sessions = sanitizeSessions(state.sessions);
  const activeId = state.activeId && sessions[state.activeId] ? state.activeId : "";

  useStore.setState({ sessions, activeId, hydrated: true });
};
