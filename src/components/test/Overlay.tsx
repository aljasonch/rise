"use client";

import { FiCamera, FiMaximize2, FiMonitor } from "react-icons/fi";
import { Button } from "@/components/ui";
import type { Blocked } from "@/lib/useProctor";

const copy = {
  fullscreen: { title: "Kembali ke layar penuh", action: "Kembali ke layar penuh", icon: FiMaximize2 },
  camera: { title: "Kamera terputus", action: "Aktifkan kamera", icon: FiCamera },
  screen: { title: "Berbagi layar berhenti", action: "Bagikan layar", icon: FiMonitor },
} as const;

// Menutup seluruh area tes, bukan hanya blur, timer tetap berjalan di belakang.
export default function Overlay({
  blocked,
  onRestore,
}: {
  blocked: Exclude<Blocked, null>;
  onRestore: () => void;
}) {
  const { title, action, icon: Icon } = copy[blocked];
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface">
      <Icon size={24} className="text-danger" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <Button onClick={onRestore}>{action}</Button>
    </div>
  );
}
