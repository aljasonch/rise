import { FiCheck } from "react-icons/fi";

const steps = ["Identitas", "Persiapan", "Tes"] as const;

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs sm:gap-3">
      {steps.map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3;
        const done = number < current;
        const active = number === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            {index > 0 && (
              <span
                aria-hidden
                className={`h-px w-5 sm:w-8 ${done || active ? "bg-accent/40" : "bg-line"}`}
              />
            )}
            <span
              aria-current={active ? "step" : undefined}
              className={`grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                done
                  ? "border-accent bg-accent text-white"
                  : active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-muted"
              }`}
            >
              {done ? <FiCheck aria-hidden size={12} /> : number}
            </span>
            <span className={active ? "font-medium text-ink" : "text-muted"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
