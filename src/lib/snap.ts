import { del, get, getMany, keys, set } from "idb-keyval";
import { config } from "./config";

export type Snap = { cam: string; screen: string; at?: number };
export type Shot = Snap & { at: number };

export const snapKey = (violationId: string) => `snap:${violationId}`;
export const liveKey = (sessionId: string) => `live:${sessionId}`;
// Satu kunci per frame: penulisan tidak menimpa dan tidak menulis ulang riwayat.
export const histKey = (sessionId: string, at: number) => `hist:${sessionId}:${at}`;

// IndexedDB bisa gagal penuh atau dinonaktifkan, penulisan snapshot tidak boleh
// menghentikan alur tes.
export const saveSnap = (violationId: string, snap: Snap) => set(snapKey(violationId), snap).catch(() => {});

export const saveLive = (sessionId: string, snap: Snap) => set(liveKey(sessionId), snap).catch(() => {});

export const readSnap = (violationId: string) => get<Snap>(snapKey(violationId)).catch(() => undefined);

export const readLive = (sessionId: string) => get<Snap>(liveKey(sessionId)).catch(() => undefined);

const pruneHist = async (sessionId: string) => {
  const prefix = `hist:${sessionId}:`;
  const mine = (await keys<string>()).filter((key) => key.startsWith(prefix)).sort();
  const overflow = mine.slice(0, Math.max(0, mine.length - config.maxSnapshots));
  if (overflow.length === 0) return;
  await Promise.all(overflow.map((key) => del(key)));
};

export const saveHist = async (sessionId: string, shot: Shot) => {
  try {
    await set(histKey(sessionId, shot.at), shot);
    await pruneHist(sessionId);
  } catch {
    // Penyimpanan penuh atau diblokir tidak boleh menghentikan tes.
  }
};

// Kunci disaring dulu, supaya frame sesi lain tidak ikut ditarik ke memori.
export const readHist = async (sessionId: string): Promise<Shot[]> => {
  const prefix = `hist:${sessionId}:`;
  const mine = (await keys<string>()).filter((key) => key.startsWith(prefix));
  const shots = (await getMany<Shot>(mine)).filter((shot): shot is Shot => shot !== undefined);
  // Urut dari nilai `at`, bukan dari urutan kunci, supaya aman bila lebar waktu berubah.
  return shots.sort((a, b) => a.at - b.at);
};
