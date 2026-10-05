import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col justify-center gap-3 px-8">
      <span className="text-sm font-semibold tracking-wide">RISE</span>
      <div className="flex gap-3">
        <Link
          href="/test"
          className="rounded-input border border-ink bg-ink px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-neutral-800"
        >
          Kandidat
        </Link>
        <Link
          href="/admin"
          className="rounded-input border border-line bg-surface px-3.5 py-2 text-sm font-medium transition-colors duration-150 hover:bg-bg"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}
