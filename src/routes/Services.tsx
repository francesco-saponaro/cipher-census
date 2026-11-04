import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Horizon, ServiceRow } from "@/api/client.ts";
import { HorizonControl } from "@/components/HorizonControl.tsx";
import { ErrorBlock, SkeletonRows } from "@/components/states.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { signedYears, years } from "@/format.ts";
import { servicesQuery } from "@/queries.ts";

interface Props {
  horizon: Horizon;
}

export function Services({ horizon }: Props) {
  const navigate = useNavigate();
  const services = useQuery(servicesQuery(horizon));
  const openTeam = (row: ServiceRow) => navigate({ to: "/", search: { horizon, q: row.name } });

  const rows = services.data?.rows ?? [];
  const exposed = rows.filter((row) => row.pastHorizon > 0).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-[720px]">
          <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em]">Services</h1>
          <p className="mt-1 text-muted">
            {services.data
              ? exposed === 0
                ? `None of the ${rows.length} services holds data that outlives the ${horizon} horizon.`
                : `${exposed} of ${rows.length} services hold data that outlives ${horizon}; ${rows[0]?.name ?? ""} is exposed longest, ${years(rows[0]?.exposureYears ?? 0)} years.`
              : "Reading the inventory."}
          </p>
        </div>
        <HorizonControl value={horizon} onChange={(next) => navigate({ to: "/services", search: { horizon: next } })} />
      </div>

      <section className="panel" aria-labelledby="services-heading">
        <h2 id="services-heading" className="mb-4">
          Longest exposure first
        </h2>
        {services.isPending ? (
          <SkeletonRows count={14} />
        ) : services.isError ? (
          <ErrorBlock message={`Couldn't load the services. ${services.error.message}`} onRetry={() => void services.refetch()} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="max-md:hidden">Team</TableHead>
                <TableHead className="max-md:hidden">Criticality</TableHead>
                <TableHead className="n">Assets</TableHead>
                <TableHead className="n">Exposure, years</TableHead>
                <TableHead className="n">Tightest margin</TableHead>
                <TableHead className="n">Past {horizon}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.slug}
                  className="link-row"
                  onClick={() => void openTeam(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void openTeam(row);
                  }}
                  tabIndex={0}
                  aria-label={`${row.name}, ${row.team}`}
                >
                  <TableCell>
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-[13px] text-muted md:hidden">
                      {row.team} · {row.criticality}
                    </span>
                  </TableCell>
                  <TableCell className="max-md:hidden">{row.team}</TableCell>
                  <TableCell className="max-md:hidden capitalize">{row.criticality}</TableCell>
                  <TableCell className="n">{row.assets}</TableCell>
                  <TableCell className="n">{row.exposureYears === 0 ? "—" : years(row.exposureYears)}</TableCell>
                  <TableCell className="n">{signedYears(row.tightestMargin)}</TableCell>
                  <TableCell className={row.pastHorizon > 0 ? "n font-medium" : "n text-muted"}>{row.pastHorizon}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
