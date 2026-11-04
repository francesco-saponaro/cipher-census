// The API. In production this is the Node process behind /api; in the
// browser build it is called directly through app.request, so the UI
// talks to the same routes either way.

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { asOf, assets, services, teams } from "./data.ts";
import { replacementFor } from "./replacement.ts";
import { rankAssets, summarize, triage } from "./triage.ts";
import type { AssetKind, QuantumExposure, Service, TriagedAsset } from "./types.ts";

export const HORIZONS = [2030, 2033, 2035, 2040] as const;
export type Horizon = (typeof HORIZONS)[number];

const horizonSchema = z.coerce
  .number()
  .int()
  .refine((year): year is Horizon => (HORIZONS as readonly number[]).includes(year), {
    message: `horizon must be one of ${HORIZONS.join(", ")}`,
  });

const kinds = [
  "tls-endpoint",
  "certificate",
  "mtls-client-certificate",
  "ssh-host-key",
  "code-signing-key",
  "vpn-tunnel",
  "jwt-signing-key",
  "data-at-rest-key",
  "backup-encryption-key",
  "hsm-wrapping-key",
] as const satisfies readonly AssetKind[];

const listQuery = z.object({
  horizon: horizonSchema,
  team: z.string().max(80).optional(),
  kind: z.enum(kinds).optional(),
  exposure: z.enum(["vulnerable", "weakened", "safe"]).optional(),
  q: z.string().max(80).optional(),
});

export interface AssetRow extends TriagedAsset {
  team: string;
  serviceName: string;
}

export interface ServiceRow extends Service {
  assets: number;
  /** Longest exposure among the assets a quantum computer breaks, in years. */
  exposureYears: number;
  pastHorizon: number;
  tightestMargin: number | null;
}

const serviceBySlug = new Map(services.map((service) => [service.slug, service]));

function withService(row: TriagedAsset): AssetRow {
  const service = serviceBySlug.get(row.service);
  return { ...row, team: service?.team ?? "", serviceName: service?.name ?? row.service };
}

function matches(row: AssetRow, query: z.infer<typeof listQuery>): boolean {
  if (query.team && row.team !== query.team) return false;
  if (query.kind && row.kind !== query.kind) return false;
  if (query.exposure && row.exposure !== (query.exposure as QuantumExposure)) return false;
  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = `${row.name} ${row.algorithm} ${row.serviceName} ${row.owner}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export const app = new Hono()
  .get("/api/summary", zValidator("query", z.object({ horizon: horizonSchema })), (c) => {
    const { horizon } = c.req.valid("query");
    return c.json({ ...summarize(assets, horizon, asOf), asOf });
  })
  .get("/api/assets", zValidator("query", listQuery), (c) => {
    const query = c.req.valid("query");
    const rows = rankAssets(assets, query.horizon, asOf)
      .map(withService)
      .filter((row) => matches(row, query));
    return c.json({ rows, asOf, horizon: query.horizon });
  })
  .get("/api/assets/:id", zValidator("query", z.object({ horizon: horizonSchema })), (c) => {
    const { horizon } = c.req.valid("query");
    const found = assets.find((asset) => asset.id === c.req.param("id"));
    if (!found) return c.json({ error: "No asset with that id" }, 404);
    const asset = withService(triage(found, horizon, asOf));
    const service = serviceBySlug.get(found.service);
    if (!service) return c.json({ error: "The asset's service is missing" }, 500);
    const siblings = rankAssets(
      assets.filter((row) => row.service === found.service && row.id !== found.id),
      horizon,
      asOf,
    ).map(withService);
    return c.json({ asset, service, replacement: replacementFor(found), siblings, asOf, horizon });
  })
  .get("/api/services", zValidator("query", z.object({ horizon: horizonSchema })), (c) => {
    const { horizon } = c.req.valid("query");
    const ranked = rankAssets(assets, horizon, asOf);
    const rows: ServiceRow[] = services.map((service) => {
      const own = ranked.filter((row) => row.service === service.slug);
      const breakable = own.filter((row) => row.margin !== null);
      return {
        ...service,
        assets: own.length,
        exposureYears: breakable.reduce((max, row) => Math.max(max, row.exposureYears), 0),
        pastHorizon: own.filter((row) => row.pastHorizon).length,
        tightestMargin: breakable[0]?.margin ?? null,
      };
    });
    rows.sort((a, b) => b.exposureYears - a.exposureYears || a.name.localeCompare(b.name));
    return c.json({ rows, asOf, horizon });
  })
  .get("/api/teams", (c) => c.json({ rows: teams }));

export type AppType = typeof app;
