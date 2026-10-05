"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import Check from "@/components/test/Check";
import End from "@/components/test/End";
import Intro from "@/components/test/Intro";
import Run from "@/components/test/Run";
import { config } from "@/lib/config";
import { getCamera, getScreen } from "@/lib/media";
import { useStore } from "@/lib/store";

type Phase = "intro" | "check" | "run" | "end" | "resume";

export default function Page() {
  const session = useStore((s) => s.sessions[s.activeId]);
  const addViolation = useStore((s) => s.addViolation);
  const [phase, setPhase] = useState<Phase>("intro");
  const [seen, setSeen] = useState({ id: session?.id, status: session?.status });

  // Tahap awal mengikuti store, jadi reload di tengah tes offer sesi berjalan.
  if (session?.id !== seen.id || session?.status !== seen.status) {
    setSeen({ id: session?.id, status: session?.status });
    if (!session) setPhase("intro");
    else if (session.status !== "berlangsung") setPhase("end");
    else setPhase((p) => (p === "intro" ? "resume" : p));
  }

  // Lanjutkan: pulihkan kamera, berbagi layar, dan fullscreen dalam satu alur.
  const resume = async () => {
    await getCamera();
    await getScreen();
    await document.documentElement.requestFullscreen();
    await navigator.keyboard?.lock?.(["Escape"]);
    addViolation("RELOAD");
    setPhase("run");
  };

  if (phase === "check") return <Check onBegin={() => setPhase("run")} />;
  if (phase === "run") return <Run />;
  if (phase === "end") return <End />;

  if (phase === "resume") {
    return (
      <main className="flex min-h-screen items-center justify-center px-8">
        <Card className="w-full p-8 text-center" style={{ maxWidth: config.width.card }}>
          <h1 className="text-lg font-semibold">Sesi sedang berjalan</h1>
          <Button className="mt-6 w-full justify-center" onClick={resume}>
            Lanjutkan
          </Button>
        </Card>
      </main>
    );
  }

  return <Intro onStart={() => setPhase("check")} />;
}
