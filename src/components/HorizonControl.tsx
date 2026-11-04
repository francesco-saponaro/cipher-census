import { HORIZONS, type Horizon } from "@/api/client.ts";
import { cn } from "@/lib/utils.ts";

interface Props {
  value: Horizon;
  onChange: (horizon: Horizon) => void;
}

/** The year a cryptographically relevant quantum computer is assumed to exist. Everything on the screen re-ranks from it. */
export function HorizonControl({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Quantum horizon" className="inline-flex w-max max-w-full rounded-[8px] bg-raised p-0.5">
      {HORIZONS.map((year) => (
        <button
          key={year}
          type="button"
          aria-pressed={value === year}
          onClick={() => onChange(year)}
          className={cn(
            "num h-8 cursor-pointer rounded-control px-3 text-sm text-muted transition-colors duration-150",
            value === year && "bg-surface font-medium text-ink",
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
