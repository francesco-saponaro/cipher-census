import type { Horizon, ServiceRow } from "@/api/client.ts";
import { years } from "@/format.ts";
import { cn } from "@/lib/utils.ts";

interface Props {
  rows: ServiceRow[];
  horizon: Horizon;
  asOf: string;
  /** Called with the service's team when its name is pressed; the census then narrows to that team. */
  onPickTeam?: (team: string) => void;
}

const LAST_YEAR = 2062;

/** Where a date lands on the strip, as a share of its width. */
function fraction(year: number, start: number): number {
  return Math.min(1, Math.max(0, (year - start) / (LAST_YEAR - start)));
}

function decimalYear(iso: string): number {
  const date = new Date(`${iso}T00:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const end = Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  return date.getUTCFullYear() + (date.getTime() - start) / (end - start);
}

/**
 * One row per service: a bar from today for as long as its most exposed asset must keep its data
 * secret plus the time to replace it. The horizon line is the year a cryptographically relevant
 * quantum computer is assumed to exist; a bar that crosses it protects data that outlives it.
 */
export function HorizonStrip({ rows, horizon, asOf, onPickTeam }: Props) {
  const today = decimalYear(asOf);
  const start = Math.floor(today);
  const horizonX = fraction(horizon, start);
  const ticks: number[] = [];
  // The horizon label takes the place of any tick within two years of it.
  for (let year = Math.ceil(start / 5) * 5; year <= LAST_YEAR; year += 5) if (Math.abs(year - horizon) > 2) ticks.push(year);

  return (
    <div className="num grid grid-cols-[112px_minmax(0,1fr)] md:grid-cols-[196px_minmax(0,1fr)]">
      <div aria-hidden="true" />
      <div className="relative h-6">
        {ticks.map((year) => (
          <span
            key={year}
            aria-hidden="true"
            className={cn("absolute top-0 -translate-x-1/2 text-xs text-muted", year % 10 !== 0 && "max-sm:hidden")}
            style={{ left: `${fraction(year, start) * 100}%` }}
          >
            {year}
          </span>
        ))}
      </div>
      {rows.map((row) => {
        const past = row.pastHorizon > 0;
        const end = fraction(today + row.exposureYears, start);
        const width = end - fraction(today, start);
        // A label that would run off the strip sits inside the bar instead.
        const inside = end > 0.78;
        return (
          <div key={row.slug} className="contents">
            <button
              type="button"
              onClick={() => onPickTeam?.(row.team)}
              className="flex h-7 w-full min-w-0 cursor-pointer items-center pr-3 text-left text-ink hover:underline"
              title={`${row.name}: ${row.assets} assets, ${row.pastHorizon} past the horizon`}
            >
              <span className="truncate">{row.name}</span>
            </button>
            <div className="relative h-7">
              <div
                data-testid={`bar-${row.slug}`}
                data-past={past ? "true" : "false"}
                className="absolute top-1 h-5 rounded-[4px]"
                style={{
                  left: `${fraction(today, start) * 100}%`,
                  width: `${Math.max(width * 100, 0.4)}%`,
                  background: past ? "var(--hue)" : "var(--chart-muted)",
                }}
              />
              <span
                className={cn(
                  "absolute top-1 h-5 text-xs leading-5 whitespace-nowrap",
                  inside ? "-translate-x-full pr-2 text-white" : "z-[1] bg-surface pl-2 text-muted",
                )}
                style={{ left: `${end * 100}%` }}
              >
                {row.exposureYears === 0 ? "nothing to migrate" : `${years(row.exposureYears)} y`}
              </span>
            </div>
          </div>
        );
      })}
      <div aria-hidden="true" />
      <div className="relative h-0 overflow-visible">
        <div
          className="absolute bottom-0 w-px"
          style={{ left: `${horizonX * 100}%`, height: `${rows.length * 28 + 24}px`, background: "var(--hue)" }}
        />
        <span
          className="absolute -translate-x-1/2 text-xs font-medium whitespace-nowrap"
          style={{ left: `${horizonX * 100}%`, top: `-${rows.length * 28 + 44}px`, color: "var(--hue)" }}
        >
          {horizon}
        </span>
      </div>
    </div>
  );
}
