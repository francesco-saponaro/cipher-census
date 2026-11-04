import { hc } from "hono/client";
import { app, type AppType } from "@server/app.ts";

// The typed RPC client. The fetch here hands every request to the Hono app in
// the same bundle; against a real deployment it is the browser's fetch and the
// base URL is the API's origin. Nothing else in the UI changes.
export const api = hc<AppType>("http://census.local", {
  fetch: ((input: RequestInfo | URL, init?: RequestInit) => app.request(input, init)) as typeof fetch,
});

export type { AssetRow, Horizon, ServiceRow } from "@server/app.ts";
export { HORIZONS } from "@server/app.ts";
