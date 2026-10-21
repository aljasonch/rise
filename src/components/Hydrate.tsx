"use client";

import { useEffect } from "react";
import { Brand, Spinner } from "@/components/ui";
import { hydrate, useStore } from "@/lib/store";

// Rehydrate manual karena skipHydration aktif, lalu dengarkan event storage
// supaya perubahan dari jendela lain langsung terlihat.
export default function Hydrate({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((state) => state.hydrated);

  useEffect(() => {
    void hydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "rise-sessions") void useStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div role="status" className="flex flex-col items-center gap-4 text-center">
          <Brand />
          <span className="inline-flex items-center gap-2 text-sm text-chalk-2">
            <Spinner size={15} />
            Menyiapkan data sesi
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
