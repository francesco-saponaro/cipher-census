import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { AssetRow, Horizon } from "@/api/client.ts";
import { ExposureBadge } from "@/components/ExposureBadge.tsx";
import { HorizonControl } from "@/components/HorizonControl.tsx";
import { HorizonStrip } from "@/components/HorizonStrip.tsx";
import { ErrorBlock, Skeleton, SkeletonRows } from "@/components/states.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { kindLabels, months, signedYears, years } from "@/format.ts";
import { assetsQuery, servicesQuery, summaryQuery, teamsQuery, type CensusFilters } from "@/queries.ts";
import type { AssetKind, QuantumExposure } from "@server/types.ts";

export interface CensusSearch extends CensusFilters {
  horizon: Horizon;
}

interface Props {
  search: CensusSearch;
}

const ALL = "all";
const FIRST_ROWS = 30;
const kindOptions = Object.entries(kindLabels) as [AssetKind, string][];
const exposureOptions: [QuantumExposure, string][] = [
  ["vulnerable", "Breaks under a quantum computer"],
  ["weakened", "Weakened"],
  ["safe", "Holds"],
];

function finding(rows: AssetRow[], horizon: Horizon): string {
  const past = rows.filter((row) => row.pastHorizon);
  if (past.length === 0) {
    const tightest = rows.find((row) => row.margin !== null);
    return tightest
      ? `Nothing outlives the ${horizon} horizon; the tightest margin is ${years(tightest.margin ?? 0)} years on ${tightest.name}.`
      : `Nothing outlives the ${horizon} horizon.`;
  }
  const byTeam = new Map<string, number>();
  for (const row of past) byTeam.set(row.team, (byTeam.get(row.team) ?? 0) + 1);
  const [team, count] = [...byTeam.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  return `${past.length} assets protect data that outlives the ${horizon} horizon; ${count} of them belong to ${team}.`;
}

export function Census({ search }: Props) {
  const navigate = useNavigate();
  const { horizon, ...filters } = search;
  const [text, setText] = useState(filters.q ?? "");
  const [showAll, setShowAll] = useState(false);

  const summary = useQuery(summaryQuery(horizon));
  const everything = useQuery(assetsQuery(horizon, {}));
  const assets = useQuery(assetsQuery(horizon, filters));
  const services = useQuery(servicesQuery(horizon));
  const teams = useQuery(teamsQuery);

  const update = (patch: Partial<CensusSearch>) => {
    const next: CensusSearch = { ...search, ...patch };
    for (const key of Object.keys(next) as (keyof CensusSearch)[]) {
      if (key !== "horizon" && (next[key] === undefined || next[key] === "")) delete next[key];
    }
    return navigate({ to: "/", search: next });
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((filters.q ?? "") !== text) void update({ q: text || undefined });
    }, 200);
    return () => clearTimeout(handle);
  }, [text]);

  const filtered = Boolean(filters.team || filters.kind || filters.exposure || filters.q);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-[720px]">
          <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em]">Census</h1>
          <p className="mt-1 text-muted">
            {everything.data ? finding(everything.data.rows, horizon) : everything.isError ? "The inventory could not be read." : "Reading the inventory."}
          </p>
        </div>
        <HorizonControl value={horizon} onChange={(next) => update({ horizon: next })} />
      </div>

      <div className="kpis num mb-3">
        <Kpi label="Assets" value={summary.data?.total} loading={summary.isPending} />
        <Kpi label="Quantum-breakable" value={summary.data?.vulnerable} loading={summary.isPending} />
        <Kpi label={`Outlive the ${horizon} horizon`} value={summary.data?.pastHorizon} loading={summary.isPending} lead />
        <Kpi label="Hold today" value={summary.data?.safe} loading={summary.isPending} note={summary.data ? `${summary.data.weakened} weakened` : undefined} />
      </div>

      <section className="panel mb-3" aria-labelledby="strip-heading">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="strip-heading">How long each service must keep its secrets</h2>
          <span className="text-xs text-muted">Secrecy horizon plus migration time, from today; bars in blue cross the {horizon} line</span>
        </div>
        {services.isPending ? (
          <SkeletonRows count={14} height={28} />
        ) : services.isError ? (
          <ErrorBlock message={`Couldn't load the services. ${services.error.message}`} onRetry={() => void services.refetch()} />
        ) : (
          <HorizonStrip rows={services.data.rows} horizon={horizon} asOf={services.data.asOf} onPickTeam={(team) => update({ team })} />
        )}
      </section>

      <section className="panel" aria-labelledby="table-heading">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 id="table-heading" className="mr-auto">
            Migrate in this order
            {assets.data ? <span className="num ml-2 font-normal text-muted">{assets.data.rows.length}</span> : null}
          </h2>
          <Select value={filters.team ?? ALL} onValueChange={(value) => update({ team: value === ALL ? undefined : value })}>
            <SelectTrigger aria-label="Team">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Every team</SelectItem>
              {(teams.data?.rows ?? []).map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.kind ?? ALL} onValueChange={(value) => update({ kind: value === ALL ? undefined : (value as AssetKind) })}>
            <SelectTrigger aria-label="Kind of asset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Every kind</SelectItem>
              {kindOptions.map(([kind, label]) => (
                <SelectItem key={kind} value={kind}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.exposure ?? ALL} onValueChange={(value) => update({ exposure: value === ALL ? undefined : (value as QuantumExposure) })}>
            <SelectTrigger aria-label="Exposure">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any exposure</SelectItem>
              {exposureOptions.map(([exposure, label]) => (
                <SelectItem key={exposure} value={exposure}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="search"
            aria-label="Search the inventory"
            placeholder="Name, algorithm, owner"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="w-56"
          />
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setText("");
                void update({ team: undefined, kind: undefined, exposure: undefined, q: undefined });
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {assets.isPending ? (
          <SkeletonRows count={10} />
        ) : assets.isError ? (
          <ErrorBlock message={`Couldn't load the inventory. ${assets.error.message}`} onRetry={() => void assets.refetch()} />
        ) : assets.data.rows.length === 0 ? (
          <p className="rounded-control border border-dashed border-control px-4 py-5 text-center text-muted">No asset matches these filters.</p>
        ) : (
          <>
            <CensusTable rows={showAll ? assets.data.rows : assets.data.rows.slice(0, FIRST_ROWS)} horizon={horizon} />
            {assets.data.rows.length > FIRST_ROWS ? (
              <div className="mt-4 flex items-center justify-between gap-4 text-muted">
                <span className="num">
                  {showAll ? `All ${assets.data.rows.length}` : `1–${FIRST_ROWS} of ${assets.data.rows.length}`}
                </span>
                <Button variant="outline" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? "Show the first 30" : `Show all ${assets.data.rows.length}`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function Kpi({ label, value, loading, lead, note }: { label: string; value: number | undefined; loading: boolean; lead?: boolean; note?: string }) {
  return (
    <div className="kpi">
      <div className="text-muted">{label}</div>
      {loading ? (
        <div className="mt-1.5">
          <Skeleton width={56} height={lead ? 36 : 28} />
        </div>
      ) : (
        <div className={lead ? "mt-1 text-[30px] leading-[1.15] font-medium tracking-[-0.01em]" : "mt-1.5 text-2xl leading-[1.15] tracking-[-0.01em]"}>
          {value ?? "—"}
          {note ? <span className="ml-2 text-xs font-normal text-muted">{note}</span> : null}
        </div>
      )}
    </div>
  );
}

function CensusTable({ rows, horizon }: { rows: AssetRow[]; horizon: Horizon }) {
  const navigate = useNavigate();
  const open = (id: string) => navigate({ to: "/assets/$id", params: { id }, search: { horizon } });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead className="max-md:hidden">Service</TableHead>
          <TableHead className="max-lg:hidden">Algorithm</TableHead>
          <TableHead className="n max-md:hidden">Secret for</TableHead>
          <TableHead className="n max-lg:hidden">Migration</TableHead>
          <TableHead className="n">Margin, years</TableHead>
          <TableHead className="text-right">Exposure</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="link-row"
            onClick={() => void open(row.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void open(row.id);
            }}
            tabIndex={0}
            aria-label={`${row.name}, ${kindLabels[row.kind]}`}
          >
            <TableCell>
              <span className="block max-w-[44ch] truncate font-medium">{row.name}</span>
              <span className="block text-[13px] text-muted md:hidden">
                {row.serviceName} · {row.algorithm}
              </span>
              <span className="block text-[13px] text-muted max-md:hidden">{kindLabels[row.kind]}</span>
            </TableCell>
            <TableCell className="max-md:hidden">
              {row.serviceName}
              <span className="block text-[13px] text-muted">{row.team}</span>
            </TableCell>
            <TableCell className="max-lg:hidden">{row.algorithm}</TableCell>
            <TableCell className="n max-md:hidden">{row.purpose === "key-exchange" || row.purpose === "encryption" ? `${years(row.secrecyYears)} y` : "—"}</TableCell>
            <TableCell className="n max-lg:hidden">{months(row.migrationMonths)}</TableCell>
            <TableCell className={row.pastHorizon ? "n font-medium" : "n"}>{signedYears(row.margin)}</TableCell>
            <TableCell className="text-right">
              <ExposureBadge exposure={row.exposure} pastHorizon={row.pastHorizon} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
