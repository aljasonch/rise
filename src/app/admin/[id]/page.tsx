/* eslint-disable @next/next/no-img-element -- snapshot IndexedDB berupa data URL, next/image tidak bisa mengoptimalkannya */
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { FiMonitor, FiUser } from "react-icons/fi";
import { Button } from "@/components/ui";
import { sections } from "@/data/test";
import { config } from "@/lib/config";
import { riskLevel, riskScore } from "@/lib/risk";
import { readLive, readSnap, type Snap } from "@/lib/snap";
import { useStore } from "@/lib/store";
import { violationLabel, violationWeight, type Violation, type ViolationType } from "@/lib/violations";

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const stamp = (ms: number) => new Date(ms).toLocaleTimeString("id-ID", { hour12: false });

const riskTone = (level: string) =>
  level === "Tinggi" ? "text-danger" : level === "Sedang" ? "text-warn" : "text-muted";

// Sesi seed tidak punya snapshot, jadi tampilkan blok abu-abu sebagai pengganti.
function Thumb({ src, icon: Icon }: { src?: string; icon: typeof FiUser }) {
  if (src) {
    return <img src={src} alt="" className="h-16 w-24 rounded-input border border-line object-cover" />;
  }
  return (
    <div className="flex h-16 w-24 items-center justify-center rounded-input border border-line bg-bg text-muted">
      <Icon size={18} />
    </div>
  );
}

function Zoom({ snap, onClose }: { snap: Snap; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6" onClick={onClose}>
      <div
        className="animate-fade flex max-w-[900px] gap-4 rounded-card border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <figure>
          <img src={snap.cam} alt="Kamera" className="w-[420px] rounded-input border border-line" />
          <figcaption className="mt-2 text-center text-xs text-muted">Kamera</figcaption>
        </figure>
        <figure>
          <img src={snap.screen} alt="Layar" className="w-[420px] rounded-input border border-line" />
          <figcaption className="mt-2 text-center text-xs text-muted">Layar</figcaption>
        </figure>
      </div>
    </div>
  );
}

function ViolationRow({ violation }: { violation: Violation }) {
  const [snap, setSnap] = useState<Snap | undefined>(undefined);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!violation.snap) return;
    void readSnap(violation.id).then((s) => s && setSnap(s));
  }, [violation.id, violation.snap]);

  const hasImage = Boolean(snap?.cam || snap?.screen);

  return (
    <li className="flex items-start gap-4 border-b border-line pb-3">
      <span className="w-20 shrink-0 text-sm tabular-nums text-muted">{stamp(violation.at)}</span>

      <div className="min-w-0 flex-1">
        <p className="text-sm">{violationLabel[violation.type]}</p>
        {violation.endedAt && (
          <p className="mt-0.5 text-xs text-muted">
            {violation.endedAt === violation.at
              ? "Sesaat"
              : `Durasi ${clock(violation.endedAt - violation.at)}`}
          </p>
        )}
      </div>

      {violation.snap && (
        <button onClick={() => setZoom(true)} disabled={!hasImage} className="flex gap-2">
          <Thumb src={snap?.cam} icon={FiUser} />
          <Thumb src={snap?.screen} icon={FiMonitor} />
        </button>
      )}

      {zoom && snap && <Zoom snap={snap} onClose={() => setZoom(false)} />}
    </li>
  );
}

function LivePanel({ id, running }: { id: string; running: boolean }) {
  const [snap, setSnap] = useState<Snap | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    const read = () => void readLive(id).then(setSnap);
    read();
    const timer = setInterval(read, config.livePollMs);
    return () => clearInterval(timer);
  }, [id, running]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <figure>
        <Thumb src={snap?.cam} icon={FiUser} />
        <figcaption className="mt-1.5 text-xs text-muted">Kamera</figcaption>
      </figure>
      <figure>
        <Thumb src={snap?.screen} icon={FiMonitor} />
        <figcaption className="mt-1.5 text-xs text-muted">Layar</figcaption>
      </figure>
    </div>
  );
}

function Summary({ violations }: { violations: Violation[] }) {
  const counts = violations.reduce<Partial<Record<ViolationType, number>>>(
    (acc, v) => ({ ...acc, [v.type]: (acc[v.type] ?? 0) + 1 }),
    {},
  );
  const types = Object.entries(counts) as [ViolationType, number][];
  const weight = violations.reduce((sum, v) => sum + violationWeight[v.type], 0) || 1;

  if (types.length === 0) return <p className="text-sm text-muted">Belum ada pelanggaran</p>;

  return (
    <ul className="space-y-2">
      {types.map(([type, n]) => (
        <li key={type}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="truncate text-muted">{violationLabel[type]}</span>
            <span className="tabular-nums">{n}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-bg">
            <div
              className="h-1.5 rounded-full bg-danger"
              style={{ width: `${Math.max(4, ((n * violationWeight[type]) / weight) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = useStore((s) => s.sessions[id]);
  const markReviewed = useStore((s) => s.markReviewed);
  const stop = useStore((s) => s.stop);

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1120px] px-8 py-10">
        <p className="text-sm text-muted">Sesi tidak ditemukan</p>
        <Link href="/admin" className="mt-2 inline-block text-sm underline">
          Kembali
        </Link>
      </main>
    );
  }

  const running = session.status === "berlangsung";
  const level = riskLevel(riskScore(session.violations));
  const total = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const latest = [...session.violations].reverse();

  return (
    <main className="mx-auto w-full max-w-[1120px] px-8 py-10">
      <Link href="/admin" className="text-sm text-muted">
        Kembali
      </Link>

      <header className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold">{session.candidate.name}</h1>
        <span className="text-sm text-muted">{session.candidate.position}</span>
        <span className="rounded-input border border-line px-2 py-0.5 text-xs">{session.status}</span>
        <span className={`text-sm ${riskTone(level)}`}>Risiko {level}</span>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => markReviewed(id)}>
            Tandai ditinjau
          </Button>
          {running && (
            <Button variant="danger" onClick={() => stop(id)}>
              Hentikan sesi
            </Button>
          )}
        </div>
      </header>

      <div className="mt-8 grid grid-cols-[1fr_380px] gap-8">
        <section>
          <h2 className="text-sm font-medium">Linimasa pelanggaran</h2>
          <ol className="mt-3">
            {latest.map((v) => (
              <ViolationRow key={v.id} violation={v} />
            ))}
            {latest.length === 0 && <li className="text-sm text-muted">Belum ada pelanggaran</li>}
          </ol>
        </section>

        <aside className="space-y-7">
          <div>
            <h2 className="text-sm font-medium">Kamera dan layar terbaru</h2>
            <div className="mt-3">
              <LivePanel id={id} running={running} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium">Ringkasan pelanggaran</h2>
            <div className="mt-3">
              <Summary violations={session.violations} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium">Progres per subtes</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {sections.map((s) => {
                const answered = s.questions.filter((q) => q.id in session.answers).length;
                return (
                  <li key={s.id} className="flex items-center justify-between">
                    <span className="text-muted">{s.name}</span>
                    <span className="tabular-nums">
                      {answered}/{s.questions.length}
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between border-t border-line pt-2">
                <span className="text-muted">Total</span>
                <span className="tabular-nums">
                  {Object.keys(session.answers).length}/{total}
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
