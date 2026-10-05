"use client";

import { Button, Card } from "@/components/ui";
import { candidate, sections } from "@/data/test";
import { config } from "@/lib/config";

export default function Intro({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-8">
      <Card className="w-full p-8" style={{ maxWidth: config.width.card }}>
        <span className="text-sm font-semibold tracking-wide">RISE</span>
        <h1 className="mt-6 text-2xl font-semibold">Psikotes</h1>
        <p className="mt-1 text-sm text-muted">
          {candidate.name} - {candidate.position}
        </p>

        <ul className="mt-7 divide-y divide-line border-y border-line">
          {sections.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3 text-sm">
              <span>{s.name}</span>
              <span className="text-muted">
                {s.questions.length} soal - {s.minutes} menit
              </span>
            </li>
          ))}
        </ul>

        <Button className="mt-7 w-full justify-center" onClick={onStart}>
          Mulai persiapan
        </Button>
      </Card>
    </main>
  );
}
