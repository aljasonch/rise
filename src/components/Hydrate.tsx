"use client";

import { useEffect } from "react";
import { hydrate, useStore } from "@/lib/store";

// Rehydrate manual karena skipHydration aktif, lalu dengarkan event storage
// supaya perubahan dari jendela lain langsung terlihat.
export default function Hydrate({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rise-demo") void useStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!hydrated) return null;
  return <>{children}</>;
}
