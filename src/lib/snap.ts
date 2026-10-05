import { get, set } from "idb-keyval";

export type Snap = { cam: string; screen: string };

export const snapKey = (violationId: string) => `snap:${violationId}`;
export const liveKey = (sessionId: string) => `live:${sessionId}`;

// IndexedDB bisa gagal penuh atau dinonaktifkan, penulisan snapshot tidak boleh
// menghentikan alur tes.
export const saveSnap = (violationId: string, snap: Snap) =>
  set(snapKey(violationId), snap).catch(() => {});

export const saveLive = (sessionId: string, snap: Snap) =>
  set(liveKey(sessionId), snap).catch(() => {});

export const readSnap = (violationId: string) => get<Snap>(snapKey(violationId)).catch(() => undefined);

export const readLive = (sessionId: string) => get<Snap>(liveKey(sessionId)).catch(() => undefined);
