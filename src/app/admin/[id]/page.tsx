"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCamera,
  FiCameraOff,
  FiCheck,
  FiClock,
  FiCommand,
  FiCopy,
  FiExternalLink,
  FiEyeOff,
  FiMail,
  FiMinimize2,
  FiMonitor,
  FiRefreshCw,
  FiShield,
  FiUserX,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  ArchiveCard,
  CaptureFrame,
  CaptureLightbox,
  SnapshotThumb,
  captureTime,
  hasCapture,
} from "@/components/admin/Capture";
import { Badge, Button, Card, EmptyState, Metric, Modal, ProgressBar, Spinner } from "@/components/ui";
import { totalQuestions } from "@/data/test";
import { config } from "@/lib/config";
import { riskLevel, riskScore, riskTone } from "@/lib/risk";
import { scoreSession } from "@/lib/score";
import { readHist, readLive, readSnap, type Shot, type Snap } from "@/lib/snap";
import { statusLabel, useStore, type Session, type Status } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { violationLabel, violationWeight, type Violation, type ViolationType } from "@/lib/violations";

type LightboxState = { snap: Snap; title: string; timestamp?: number } | null;

const violationIcon: Record<ViolationType, IconType> = {
  NO_FACE: FiUserX,
  MULTIPLE_FACES: FiUsers,
  LOOK_AWAY: FiEyeOff,
  FULLSCREEN_EXIT: FiMinimize2,
  TAB_SWITCH: FiExternalLink,
  WINDOW_BLUR: FiAlertTriangle,
  COPY_PASTE: FiCopy,
  SHORTCUT: FiCommand,
  MULTIPLE_SCREENS: FiMonitor,
  CAMERA_OFF: FiCameraOff,
  CAMERA_FROZEN: FiCamera,
  SCREEN_SHARE_STOPPED: FiMonitor,
};

const statusTone = (status: Status) =>
  status === "berlangsung"
    ? ("accent" as const)
    : status === "selesai"
      ? ("ok" as const)
      : status === "waktu_habis"
        ? ("warn" as const)
        : ("danger" as const);

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`;
  return `${minutes} menit`;
};

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function LivePanel({
  id,
  running,
  onOpen,
}: {
  id: string;
  running: boolean;
  onOpen: (state: LightboxState) => void;
}) {
  const [snap, setSnap] = useState<Snap | undefined>(undefined);
  const [at, setAt] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        let next: Snap | undefined;
        let nextAt: number | undefined;

        if (running) {
          const live = await readLive(id);
          if (live && hasCapture(live)) {
            next = live;
            nextAt = live.at ?? Date.now();
          }
        }

        if (!next) {
          const history = await readHist(id);
          const last = history.at(-1);
          if (last) {
            next = last;
            nextAt = last.at;
          }
        }

        if (cancelled) return;
        setSnap(next);
        setAt(nextAt);
      } catch {
        if (!cancelled) {
          setSnap(undefined);
          setAt(undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void read();
    if (!running) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => void read(), config.livePollMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, running]);

  const live = running && hasCapture(snap);
  const emptyTitle = loading
    ? "Memuat tangkapan"
    : running
      ? "Menunggu tangkapan pertama"
      : "Tidak ada tangkapan";
  const emptyHint = loading
    ? "Membaca penyimpanan lokal."
    : running
      ? "Snapshot dikirim setiap 15 detik selama tes."
      : "Sesi ini selesai tanpa snapshot tersimpan.";
  const footer = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <FiClock aria-hidden size={12} />
        {at ? captureTime(at) : "—"}
      </span>
      <span>{running ? (at ? "Diperbarui" : "Menunggu") : "Terakhir"}</span>
    </>
  );
  const open = () => {
    if (snap && hasCapture(snap)) onOpen({ snap, title: "Kamera dan layar", timestamp: at });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <CaptureFrame
        className="lg:col-span-5"
        label="Kamera"
        icon={FiCamera}
        src={snap?.cam}
        aspect="camera"
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        footer={footer}
        live={live}
        onOpen={open}
      />
      <CaptureFrame
        className="lg:col-span-7"
        label="Layar"
        icon={FiMonitor}
        src={snap?.screen}
        aspect="screen"
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        footer={footer}
        onOpen={open}
      />
    </div>
  );
}

function ViolationRow({
  violation,
  onOpen,
}: {
  violation: Violation;
  onOpen: (state: LightboxState) => void;
}) {
  const [snap, setSnap] = useState<Snap | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(violation.snap));
  const Icon = violationIcon[violation.type];
  const points = violationWeight[violation.type];
  const tone = points >= 3 ? "danger" : points >= 2 ? "warn" : "neutral";
  const ended = violation.endedAt
    ? violation.endedAt === violation.at
      ? "Sesaat"
      : `Durasi ${clock(violation.endedAt - violation.at)}`
    : "Berlangsung";

  useEffect(() => {
    if (!violation.snap) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const read = async () => {
      attempts += 1;
      try {
        const data = await readSnap(violation.id);
        if (cancelled) return;
        if (data) {
          setSnap(data);
          setLoading(false);
          return;
        }
      } catch {
        // Snapshot tidak wajib ada.
      }
      if (cancelled) return;
      if (attempts < 3) {
        timer = window.setTimeout(() => void read(), 1200);
      } else {
        setLoading(false);
      }
    };

    void read();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [violation.id, violation.snap]);

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-input border ${
          tone === "danger"
            ? "border-danger/20 bg-surface-muted text-danger"
            : tone === "warn"
              ? "border-line bg-surface-muted text-ink"
              : "border-line bg-surface-muted text-muted"
        }`}
      >
        <Icon aria-hidden size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{violationLabel[violation.type]}</p>
          <Badge tone={tone}>{points} poin</Badge>
        </div>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {captureTime(violation.at)} · {ended}
        </p>
      </div>

      {loading ? (
        <span className="inline-flex items-center gap-1.5 self-start rounded-input border border-line px-2.5 py-1.5 text-[11px] text-muted">
          <Spinner size={11} />
          Memuat
        </span>
      ) : snap && hasCapture(snap) ? (
        <div className="flex shrink-0 gap-1.5 self-start">
          <SnapshotThumb
            src={snap.cam}
            label="Kamera"
            icon={FiCamera}
            onClick={() => onOpen({ snap, title: violationLabel[violation.type], timestamp: violation.at })}
          />
          <SnapshotThumb
            src={snap.screen}
            label="Layar"
            icon={FiMonitor}
            onClick={() => onOpen({ snap, title: violationLabel[violation.type], timestamp: violation.at })}
          />
        </div>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-input border border-dashed border-line px-2.5 py-1.5 text-[11px] text-muted">
          <FiCameraOff aria-hidden size={12} />
          Tanpa tangkapan
        </span>
      )}
    </li>
  );
}

function ScoreCard({ session }: { session: Session }) {
  const score = scoreSession(session);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Skor kognitif</h2>
          <p className="mt-0.5 text-xs text-muted">Jawaban benar dari kunci asesmen.</p>
        </div>
        <Badge tone="accent">{score.percent}%</Badge>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums">{score.correct}</span>
        <span className="text-base text-muted">/ {score.total}</span>
      </div>
      <ProgressBar className="mt-2" value={score.correct} max={score.total} label="Skor kognitif" />

      <div className="mt-4 space-y-3">
        {score.sections.map((section) => {
          const cognitive = section.kind === "kognitif";
          return (
            <div key={section.id}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">{section.name}</span>
                <span className="tabular-nums">
                  {cognitive ? `${section.correct}/${section.total}` : `${section.answered}/${section.total}`}
                </span>
              </div>
              <ProgressBar
                className="mt-1"
                value={cognitive ? section.correct : section.answered}
                max={section.total}
                tone={cognitive ? "accent" : "ok"}
                label={`Progres ${section.name}`}
              />
            </div>
          );
        })}
      </div>

      {score.personalityTotal > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Kepribadian: {score.personalityAnswered}/{score.personalityTotal} dijawab, tidak dinilai
          benar atau salah.
        </p>
      )}
    </Card>
  );
}

function RiskCard({ session }: { session: Session }) {
  const points = riskScore(session.violations);
  const level = riskLevel(points);
  const counts = session.violations.reduce<Partial<Record<ViolationType, number>>>(
    (accumulator, violation) => ({
      ...accumulator,
      [violation.type]: (accumulator[violation.type] ?? 0) + 1,
    }),
    {},
  );
  const entries = Object.entries(counts) as [ViolationType, number][];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Risiko pengawasan</h2>
          <p className="mt-0.5 text-xs text-muted">Berdasarkan bobot setiap pelanggaran.</p>
        </div>
        <Badge tone={riskTone[level]}>{level}</Badge>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums">{points}</span>
        <span className="text-base text-muted">poin</span>
      </div>
      <ProgressBar
        className="mt-2"
        value={Math.min(points, config.risk.high)}
        max={config.risk.high}
        tone={riskTone[level] === "danger" ? "danger" : riskTone[level] === "warn" ? "warn" : "ok"}
        label="Skor risiko"
      />
      <p className="mt-2 text-[11px] text-muted">
        Rendah &lt; {config.risk.medium} · Sedang {config.risk.medium}–{config.risk.high - 1} · Tinggi ≥{" "}
        {config.risk.high}
      </p>

      {entries.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
          {entries.map(([type, count]) => (
            <li key={type} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-muted">{violationLabel[type]}</span>
              <span className="shrink-0 tabular-nums">
                {count}× · {count * violationWeight[type]} poin
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Tidak ada pelanggaran tercatat.
        </p>
      )}
    </Card>
  );
}

function IdentityCard({ session, now }: { session: Session; now: number }) {
  const endedAt = session.endedAt;
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold">Identitas dan sesi</h2>

      <dl className="mt-3 space-y-2.5 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">Email</dt>
          <dd className="min-w-0 text-right">
            <a
              href={`mailto:${session.candidate.email}`}
              className="inline-flex max-w-full items-center gap-1.5 truncate text-ink underline-offset-2 hover:underline"
            >
              <FiMail aria-hidden size={12} className="shrink-0 text-muted" />
              <span className="truncate">{session.candidate.email}</span>
            </a>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">Posisi</dt>
          <dd className="text-right font-medium">{session.candidate.position}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">Kode verifikasi</dt>
          <dd className="font-mono text-[11px] text-ink">
            {session.candidate.verificationCode || "—"}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">Mulai</dt>
          <dd className="text-right tabular-nums">{dateTime(session.startedAt)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">Selesai</dt>
          <dd className="text-right tabular-nums">{endedAt ? dateTime(endedAt) : "Masih berjalan"}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">Durasi</dt>
          <dd className="text-right tabular-nums">
            {duration((endedAt ?? now) - session.startedAt)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted">ID sesi</dt>
          <dd className="font-mono text-[11px] text-muted" title={session.id}>
            {session.id.slice(0, 8)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-input bg-surface-muted px-3 py-2">
        <span className="text-xs text-muted">Tinjauan</span>
        {session.reviewed ? (
          <Badge tone="ok" dot>
            Sudah ditinjau
          </Badge>
        ) : (
          <Badge tone="warn" dot>
            Belum ditinjau
          </Badge>
        )}
      </div>
    </Card>
  );
}

function Archive({
  id,
  running,
  onOpen,
}: {
  id: string;
  running: boolean;
  onOpen: (state: LightboxState) => void;
}) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const history = await readHist(id);
        setShots(history);
      } catch {
        setShots([]);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    let cancelled = false;

    readHist(id)
      .then((history) => {
        if (!cancelled) setShots(history);
      })
      .catch(() => {
        if (!cancelled) setShots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => void load(false), config.historyPollMs);
    return () => window.clearInterval(timer);
  }, [load, running]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Arsip snapshot</h2>
          <p className="mt-0.5 text-xs text-muted">
            {shots.length} tangkapan tersimpan · maksimal {config.maxSnapshots} per sesi
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          loading={loading}
          icon={<FiRefreshCw aria-hidden size={14} />}
          onClick={() => void load(true)}
        >
          Muat ulang
        </Button>
      </div>

      <div className="p-4">
        {loading && shots.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-xs text-muted">
            <Spinner size={14} />
            Memuat arsip snapshot.
          </div>
        ) : shots.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-muted text-muted">
              <FiCameraOff aria-hidden size={18} />
            </span>
            <p className="mt-3 text-sm font-medium">Belum ada snapshot</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
              Snapshot kamera dan layar disimpan setiap 15 detik selama tes berjalan.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...shots].reverse().map((shot) => (
              <ArchiveCard
                key={shot.at}
                shot={shot}
                onClick={() =>
                  onOpen({ snap: shot, title: "Arsip snapshot", timestamp: shot.at })
                }
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = useStore((state) => state.sessions[id]);
  const markReviewed = useStore((state) => state.markReviewed);
  const stop = useStore((state) => state.stop);
  const now = useNow(1000);

  const [confirmStop, setConfirmStop] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const openLightbox = useCallback((state: LightboxState) => setLightbox(state), []);

  if (!session) {
    return (
      <div className="min-h-screen">
        <AdminHeader />
        <main className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-input px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <FiArrowLeft aria-hidden size={15} />
            Semua sesi
          </Link>
          <div className="mt-6">
            <EmptyState
              icon={<FiUserX aria-hidden size={22} />}
              title="Sesi tidak ditemukan"
              description="Sesi ini tidak ada di penyimpanan browser. Mungkin data situs sudah dihapus atau tautannya tidak lagi valid."
              action={
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-input border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Kembali ke daftar sesi
                </Link>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  const running = session.status === "berlangsung";
  const answered = Object.keys(session.answers).length;
  const score = scoreSession(session);
  const points = riskScore(session.violations);
  const level = riskLevel(points);
  const latest = [...session.violations].sort((a, b) => b.at - a.at);
  const canReview = !running && !session.reviewed;

  return (
    <div className="min-h-screen">
      <AdminHeader />

      <main className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-input px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <FiArrowLeft aria-hidden size={15} />
          Semua sesi
        </Link>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{session.candidate.name}</h1>
              <Badge tone={statusTone(session.status)} dot>
                {statusLabel[session.status]}
              </Badge>
              <Badge tone={riskTone[level]}>Risiko {level}</Badge>
              {session.reviewed && (
                <Badge tone="ok" dot>
                  Sudah ditinjau
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {session.candidate.position} · {session.candidate.email}
            </p>
            <p className="mt-1 text-xs tabular-nums text-muted">
              Mulai {dateTime(session.startedAt)} · Durasi{" "}
              {duration((session.endedAt ?? now) - session.startedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<FiCheck aria-hidden size={16} />}
              disabled={!canReview}
              title={running ? "Tandai tinjauan setelah sesi selesai." : undefined}
              onClick={() => markReviewed(id)}
            >
              {session.reviewed ? "Sudah ditinjau" : "Tandai ditinjau"}
            </Button>
            {running && (
              <Button
                variant="danger"
                icon={<FiXCircle aria-hidden size={16} />}
                onClick={() => setConfirmStop(true)}
              >
                Hentikan sesi
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="Durasi"
            value={duration((session.endedAt ?? now) - session.startedAt)}
            icon={<FiClock aria-hidden size={16} />}
          />
          <Metric
            label="Jawaban"
            value={
              <span>
                {answered}
                <span className="text-base font-normal text-muted">/{totalQuestions}</span>
              </span>
            }
            icon={<FiCheck aria-hidden size={16} />}
          />
          <Metric
            label="Skor kognitif"
            value={
              <span>
                {score.correct}
                <span className="text-base font-normal text-muted">/{score.total}</span>
              </span>
            }
            hint={`${score.percent}% benar`}
            icon={<FiShield aria-hidden size={16} />}
          />
          <Metric
            label="Pelanggaran"
            value={session.violations.length}
            hint={`${points} poin pengawasan`}
            icon={<FiAlertTriangle aria-hidden size={16} />}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Pemantauan</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Pratinjau kamera dan seluruh layar peserta.
                  </p>
                </div>
                {running ? (
                  <Badge tone="ok" dot>
                    Sesi berjalan
                  </Badge>
                ) : (
                  <Badge tone="neutral">Arsip sesi</Badge>
                )}
              </div>
              <div className="p-4">
                <LivePanel id={id} running={running} onOpen={openLightbox} />
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Linimasa pelanggaran</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Kejadian terbaru beserta tangkapan saat kejadian.
                  </p>
                </div>
                <Badge tone={session.violations.length > 0 ? "warn" : "neutral"}>
                  {session.violations.length} kejadian
                </Badge>
              </div>

              {latest.length > 0 ? (
                <ol className="divide-y divide-line px-4">
                  {latest.map((violation) => (
                    <ViolationRow key={violation.id} violation={violation} onOpen={openLightbox} />
                  ))}
                </ol>
              ) : (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-muted text-muted">
                    <FiShield aria-hidden size={18} />
                  </span>
                  <p className="mt-3 text-sm font-medium">Belum ada pelanggaran</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
                    Pemeriksaan kamera, layar, dan fokus jendela berjalan tanpa catatan.
                  </p>
                </div>
              )}
            </Card>

            <Archive id={id} running={running} onOpen={openLightbox} />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <ScoreCard session={session} />
            <RiskCard session={session} />
            <IdentityCard session={session} now={now} />
          </aside>
        </div>
      </main>

      {lightbox && (
        <CaptureLightbox
          snap={lightbox.snap}
          title={lightbox.title}
          timestamp={lightbox.timestamp}
          onClose={closeLightbox}
        />
      )}

      {confirmStop && (
        <Modal
          title="Hentikan sesi ini?"
          description="peserta akan keluar dari tes dan sesi ditandai dihentikan. Jawaban dan tangkapan yang sudah tersimpan tetap dapat ditinjau."
          onClose={() => setConfirmStop(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirmStop(false)}>
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  stop(id);
                  setConfirmStop(false);
                }}
              >
                Hentikan sesi
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
