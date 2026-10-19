"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { FiArrowLeft, FiArrowRight, FiCamera, FiCheck, FiClock, FiMonitor, FiShield } from "react-icons/fi";
import { Brand } from "@/components/Brand";
import { Stepper } from "@/components/Stepper";
import { Button, Card } from "@/components/ui";
import { sections, totalMinutes, totalQuestions } from "@/data/test";
import {
  normalizeIdentity,
  validateIdentity,
  type Identity,
  type IdentityErrors,
} from "@/lib/identity";

const inputClass = (invalid: boolean) =>
  `w-full rounded-input border bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors placeholder:text-faint focus:outline-none focus:ring-4 ${
    invalid
      ? "border-danger focus:border-danger focus:ring-danger/10"
      : "border-line hover:border-line-strong focus:border-accent focus:ring-accent/10"
  }`;

export default function Intro({
  initial,
  onContinue,
}: {
  initial: Identity;
  onContinue: (identity: Identity) => void;
}) {
  const [values, setValues] = useState<Identity>(initial);
  const [errors, setErrors] = useState<IdentityErrors>({});

  const update = (key: keyof Identity) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateIdentity(values);
    setErrors(nextErrors);

    const first = (Object.keys(nextErrors) as (keyof Identity)[])[0];
    if (first) {
      document.getElementById(`candidate-${first}`)?.focus();
      return;
    }

    onContinue(normalizeIdentity(values));
  };

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-input px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <FiArrowLeft aria-hidden size={15} />
          Beranda
        </Link>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-2 sm:px-8">
        <Stepper current={1} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-8">
          <Card className="p-6 sm:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Langkah 1 dari 3</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Identitas kandidat</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Data ini dipakai pengawas untuk mencocokkan sesi dengan kandidat. Pastikan
              penulisannya sama dengan dokumen resmi.
            </p>

            <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
              <div>
                <label htmlFor="candidate-name" className="mb-1.5 block text-sm font-medium">
                  Nama lengkap
                </label>
                <input
                  id="candidate-name"
                  name="name"
                  autoComplete="name"
                  value={values.name}
                  onChange={update("name")}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "candidate-name-error" : undefined}
                  placeholder="Nama sesuai dokumen"
                  className={inputClass(Boolean(errors.name))}
                />
                {errors.name && (
                  <p id="candidate-name-error" className="mt-1.5 text-xs text-danger">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="candidate-email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="candidate-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={update("email")}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "candidate-email-error" : undefined}
                  placeholder="nama@perusahaan.com"
                  className={inputClass(Boolean(errors.email))}
                />
                {errors.email && (
                  <p id="candidate-email-error" className="mt-1.5 text-xs text-danger">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="candidate-position" className="mb-1.5 block text-sm font-medium">
                  Posisi yang dilamar
                </label>
                <input
                  id="candidate-position"
                  name="position"
                  autoComplete="organization-title"
                  value={values.position}
                  onChange={update("position")}
                  aria-invalid={Boolean(errors.position)}
                  aria-describedby={errors.position ? "candidate-position-error" : undefined}
                  placeholder="Contoh: Product Designer"
                  className={inputClass(Boolean(errors.position))}
                />
                {errors.position && (
                  <p id="candidate-position-error" className="mt-1.5 text-xs text-danger">
                    {errors.position}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-muted">
                  Identitas tersimpan hanya di browser ini.
                </p>
                <Button type="submit" icon={<FiArrowRight aria-hidden size={16} />} className="sm:w-auto">
                  Lanjut ke persiapan
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Ringkasan asesmen</h2>
                <span className="text-xs text-muted">{totalMinutes} menit</span>
              </div>

              <ol className="mt-4 divide-y divide-line border-y border-line">
                {sections.map((section, index) => (
                  <li key={section.id} className="flex items-start gap-3 py-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-muted text-[11px] font-semibold text-muted">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{section.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{section.description}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p className="tabular-nums">{section.questions.length} soal</p>
                      <p className="mt-0.5 inline-flex items-center gap-1">
                        <FiClock aria-hidden size={11} />
                        {section.minutes} mnt
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted">Total</span>
                <span className="font-medium tabular-nums">{totalQuestions} soal</span>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold">Sebelum mulai</h2>
              <ul className="mt-3 space-y-3">
                {[
                  {
                    icon: FiMonitor,
                    title: "Komputer dengan Chrome atau Edge",
                    text: "Tes berjalan layar penuh dan membutuhkan API layar tambahan.",
                  },
                  {
                    icon: FiCamera,
                    title: "Kamera fisik yang aktif",
                    text: "Kamera virtual seperti OBS atau ManyCam tidak diterima.",
                  },
                  {
                    icon: FiShield,
                    title: "Izin layar dan kamera",
                    text: "Anda akan memilih seluruh layar dan memberi izin kamera.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input border border-line bg-surface-muted text-muted">
                      <Icon aria-hidden size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                <FiCheck aria-hidden size={14} className="mt-0.5 shrink-0 text-ink" />
                Anda dapat kembali ke langkah ini sebelum tes dimulai.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
