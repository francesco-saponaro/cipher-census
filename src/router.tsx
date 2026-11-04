import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, type RouterHistory } from "@tanstack/react-router";
import { HORIZONS, type Horizon } from "@/api/client.ts";
import { Shell } from "@/components/Shell.tsx";
import { Census, type CensusSearch } from "@/routes/Census.tsx";
import { asOf } from "@server/data.ts";
import type { AssetKind, QuantumExposure } from "@server/types.ts";
import { kindLabels } from "@/format.ts";

const DEFAULT_HORIZON: Horizon = 2035;

function parseHorizon(value: unknown): Horizon {
  const year = Number(value);
  return (HORIZONS as readonly number[]).includes(year) ? (year as Horizon) : DEFAULT_HORIZON;
}

function parseText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.slice(0, 80) : undefined;
}

const rootRoute = createRootRoute({
  component: function Root() {
    return <Outlet />;
  },
});

function WithShell({ horizon, children }: { horizon: Horizon; children: React.ReactNode }) {
  return (
    <Shell horizon={horizon} asOf={asOf}>
      {children}
    </Shell>
  );
}

const censusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (raw: Record<string, unknown>): CensusSearch => {
    const kind = typeof raw.kind === "string" && raw.kind in kindLabels ? (raw.kind as AssetKind) : undefined;
    const exposure = raw.exposure === "vulnerable" || raw.exposure === "weakened" || raw.exposure === "safe" ? (raw.exposure as QuantumExposure) : undefined;
    return {
      horizon: parseHorizon(raw.horizon),
      ...(parseText(raw.team) ? { team: parseText(raw.team) } : {}),
      ...(kind ? { kind } : {}),
      ...(exposure ? { exposure } : {}),
      ...(parseText(raw.q) ? { q: parseText(raw.q) } : {}),
    };
  },
  component: function CensusPage() {
    const search = censusRoute.useSearch();
    return (
      <WithShell horizon={search.horizon}>
        <Census search={search} />
      </WithShell>
    );
  },
});

const routeTree = rootRoute.addChildren([censusRoute]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history: history ?? (typeof window === "undefined" ? createMemoryHistory() : undefined),
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
