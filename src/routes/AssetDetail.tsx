import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { AssetRow, Horizon } from "@/api/client.ts";
import { ExposureBadge } from "@/components/ExposureBadge.tsx";
import { HorizonControl } from "@/components/HorizonControl.tsx";
import { ErrorBlock, Skeleton, SkeletonRows } from "@/components/states.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { keySize, kindLabels, longDate, months, purposeLabels, signedYears, years } from "@/format.ts";
import { assetQuery } from "@/queries.ts";
import { yearsUntil } from "@server/triage.ts";

interface Props {
  id: string;
  horizon: Horizon;
}

export function AssetDetail({ id, horizon }: Props) {
  const navigate = useNavigate();
  const query = useQuery(assetQuery(id, horizon));
  const setHorizon = (next: Horizon) => navigate({ to: "/assets/$id", params: { id }, search: { horizon: next } });

  if (query.isPending) {
    return (
      <>
        <div className="panel mb-3">
          <Skeleton width={280} height={22} />
          <div className="mt-2">
            <Skeleton width={200} height={16} />
          </div>
        </div>
        <div className="panel">
          <SkeletonRows count={6} />
        </div>
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        <h1 className="mb-4 text-2xl leading-tight font-semibold tracking-[-0.01em]">Asset {id}</h1>
        <ErrorBlock message={`${query.error.message}.`} onRetry={() => void query.refetch()} />
        <p className="mt-4">
          <Link to="/" search={{ horizon }} className="font-medium underline-offset-4 hover:underline">
            Back to the census
          </Link>
        </p>
      </>
    );
  }

  const { asset, service, replacement, siblings, asOf } = query.data;
  const confidentiality = asset.purpose === "key-exchange" || asset.purpose === "encryption";
  const untilHorizon = yearsUntil(horizon, asOf);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" search={{ horizon, team: service.team }} className="text-muted underline-offset-4 hover:underline">
          Census · {service.team}
        </Link>
        <HorizonControl value={horizon} onChange={setHorizon} />
      </div>

      <div className="panel mb-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg leading-tight font-semibold">{asset.name}</h1>
            <ExposureBadge exposure={asset.exposure} pastHorizon={asset.pastHorizon} />
          </div>
          <p className="mt-1.5 text-muted">
            {kindLabels[asset.kind]} · {service.name} · {asset.algorithm} · owned by {asset.owner}
          </p>
        </div>
        <Button asChild>
          <Link to="/" search={{ horizon, q: service.name }}>
            Open the service's assets
          </Link>
        </Button>
      </div>

      <div className="grid6">
        <section className="panel col-span-6" aria-labelledby="margin-heading">
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
            <div>
              <h2 id="margin-heading">Margin before the {horizon} horizon</h2>
              <p className="num mt-2 text-[30px] leading-[1.15] font-medium tracking-[-0.01em]">
                {asset.margin === null ? "No deadline" : `${signedYears(asset.margin)} years`}
              </p>
              <p className="mt-1 text-muted">
                {asset.margin === null
                  ? `${asset.algorithm} holds against a quantum computer; nothing here needs to move.`
                  : confidentiality
                    ? `The data behind this key must stay secret for ${years(asset.secrecyYears)} years and replacing the key takes about ${months(asset.migrationMonths)}, against ${years(untilHorizon)} years until ${horizon}. ${
                        asset.pastHorizon
                          ? "Anything recorded today can be decrypted once the horizon arrives, so this goes early in the order."
                          : "Start before the margin is spent and the data stays safe."
                      }`
                    : `This key only ${asset.purpose === "signature" ? "signs" : "authenticates"}, so old traffic cannot be forged after the fact; it needs replacing before ${horizon}, with about ${months(asset.migrationMonths)} of work, and ${years(untilHorizon)} years remain.`}
              </p>
            </div>
            <div>
              <h3 className="font-medium lg:text-base">What replaces it</h3>
              <p className="mt-2">{replacement}</p>
            </div>
          </div>
          <SingleStrip asset={asset} horizon={horizon} untilHorizon={untilHorizon} />
        </section>

        <section className="panel col-span-6" aria-labelledby="facts-heading">
          <h2 id="facts-heading">The asset</h2>
          <dl className="num mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Algorithm" value={asset.algorithm} />
            <Fact label="Key size" value={keySize(asset.algorithm, asset.keySize)} />
            <Fact label="Protocol" value={asset.protocol} />
            <Fact label="Purpose" value={purposeLabels[asset.purpose]} />
            <Fact label="Issued" value={longDate(asset.issued)} />
            <Fact label="Expires" value={asset.expires ? longDate(asset.expires) : "Does not expire"} />
            <Fact label="Secrecy horizon" value={confidentiality ? `${years(asset.secrecyYears)} years` : "None: integrity only"} />
            <Fact label="Migration estimate" value={months(asset.migrationMonths)} />
            <Fact label="Owner" value={asset.owner} />
          </dl>
        </section>

        <section className="panel col-span-6" aria-labelledby="siblings-heading">
          <h2 id="siblings-heading">
            Other assets in {service.name}
            <span className="num ml-2 font-normal text-muted">{siblings.length}</span>
          </h2>
          <div className="mt-3">
            {siblings.length === 0 ? (
              <p className="rounded-control border border-dashed border-control px-4 py-5 text-center text-muted">This is the service's only asset.</p>
            ) : (
              <SiblingTable rows={siblings} horizon={horizon} />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-10 items-baseline justify-between gap-4 border-t border-rule">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}

/** The asset's own exposure against the horizon: secrecy in grey, migration in ink, the horizon line in the one hue. */
function SingleStrip({ asset, horizon, untilHorizon }: { asset: AssetRow; horizon: Horizon; untilHorizon: number }) {
  if (asset.margin === null) return null;
  const span = Math.max(untilHorizon, asset.exposureYears) * 1.15;
  const pct = (value: number) => `${(value / span) * 100}%`;
  const secrecy = asset.purpose === "key-exchange" || asset.purpose === "encryption" ? asset.secrecyYears : 0;
  const migration = asset.migrationMonths / 12;
  return (
    <div className="num mt-8">
      <div className="relative h-7">
        <div className="absolute top-1 h-5 rounded-l-[4px]" style={{ left: 0, width: pct(secrecy), background: "var(--chart-muted)" }} title={`Secrecy ${years(secrecy)} years`} />
        <div className="absolute top-1 h-5 rounded-r-[4px]" style={{ left: pct(secrecy), width: pct(migration), background: "var(--text)" }} title={`Migration ${months(asset.migrationMonths)}`} />
        <div className="absolute -top-1 bottom-0 w-px" style={{ left: pct(untilHorizon), background: "var(--hue)" }} />
        <span className="absolute top-0 -translate-x-1/2 text-xs font-medium" style={{ left: pct(untilHorizon), top: "-18px", color: "var(--hue)" }}>
          {horizon}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-[2px]" style={{ background: "var(--chart-muted)" }} />
          Secrecy {years(secrecy)} y
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-[2px]" style={{ background: "var(--text)" }} />
          Migration {months(asset.migrationMonths)}
        </span>
      </div>
    </div>
  );
}

function SiblingTable({ rows, horizon }: { rows: AssetRow[]; horizon: Horizon }) {
  const navigate = useNavigate();
  const open = (id: string) => navigate({ to: "/assets/$id", params: { id }, search: { horizon } });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead className="max-md:hidden">Algorithm</TableHead>
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
              <span className="block max-w-[40ch] truncate font-medium">{row.name}</span>
              <span className="block text-[13px] text-muted">{kindLabels[row.kind]}</span>
            </TableCell>
            <TableCell className="max-md:hidden">{row.algorithm}</TableCell>
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
