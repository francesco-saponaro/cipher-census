import { queryOptions } from "@tanstack/react-query";
import { api, type Horizon } from "./api/client.ts";
import type { AssetKind, QuantumExposure } from "@server/types.ts";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface CensusFilters {
  team?: string;
  kind?: AssetKind;
  exposure?: QuantumExposure;
  q?: string;
}

const horizonQuery = (horizon: Horizon) => ({ horizon: String(horizon) });

export const summaryQuery = (horizon: Horizon) =>
  queryOptions({
    queryKey: ["summary", horizon],
    queryFn: () => api.api.summary.$get({ query: horizonQuery(horizon) }).then((res) => unwrap<SummaryResponse>(res)),
  });

export const assetsQuery = (horizon: Horizon, filters: CensusFilters) =>
  queryOptions({
    queryKey: ["assets", horizon, filters],
    queryFn: () =>
      api.api.assets
        .$get({
          query: {
            ...horizonQuery(horizon),
            ...(filters.team ? { team: filters.team } : {}),
            ...(filters.kind ? { kind: filters.kind } : {}),
            ...(filters.exposure ? { exposure: filters.exposure } : {}),
            ...(filters.q ? { q: filters.q } : {}),
          },
        })
        .then((res) => unwrap<AssetsResponse>(res)),
  });

export const assetQuery = (id: string, horizon: Horizon) =>
  queryOptions({
    queryKey: ["asset", id, horizon],
    queryFn: () =>
      api.api.assets[":id"].$get({ param: { id }, query: horizonQuery(horizon) }).then((res) => unwrap<AssetResponse>(res)),
  });

export const servicesQuery = (horizon: Horizon) =>
  queryOptions({
    queryKey: ["services", horizon],
    queryFn: () => api.api.services.$get({ query: horizonQuery(horizon) }).then((res) => unwrap<ServicesResponse>(res)),
  });

export const teamsQuery = queryOptions({
  queryKey: ["teams"],
  queryFn: () => api.api.teams.$get().then((res) => unwrap<{ rows: string[] }>(res)),
});

type Json<T extends (...args: never[]) => Promise<Response>> = Awaited<ReturnType<Awaited<ReturnType<T>>["json"]>>;
export type SummaryResponse = Extract<Json<typeof api.api.summary.$get>, { total: number }>;
export type AssetsResponse = Extract<Json<typeof api.api.assets.$get>, { rows: unknown[] }>;
export type AssetResponse = Extract<Json<(typeof api.api.assets)[":id"]["$get"]>, { asset: unknown }>;
export type ServicesResponse = Extract<Json<typeof api.api.services.$get>, { rows: unknown[] }>;
