import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ServiceRow } from "@server/app.ts";
import { HorizonStrip } from "./HorizonStrip.tsx";

const rows: ServiceRow[] = [
  { slug: "backup-archive", name: "Backup archive", team: "Data platform", criticality: "critical", assets: 9, exposureYears: 30, pastHorizon: 6, tightestMargin: -21.8 },
  { slug: "public-web", name: "Public website", team: "Corporate IT", criticality: "standard", assets: 4, exposureYears: 1, pastHorizon: 0, tightestMargin: 7.2 },
];

describe("HorizonStrip", () => {
  it("draws one bar per service and marks the ones that cross the horizon", () => {
    render(<HorizonStrip rows={rows} horizon={2035} asOf="2026-11-04" />);
    expect(screen.getByText("Backup archive")).toBeInTheDocument();
    expect(screen.getByText("Public website")).toBeInTheDocument();
    expect(screen.getByTestId("bar-backup-archive")).toHaveAttribute("data-past", "true");
    expect(screen.getByTestId("bar-public-web")).toHaveAttribute("data-past", "false");
  });

  it("labels the horizon line with its year", () => {
    render(<HorizonStrip rows={rows} horizon={2035} asOf="2026-11-04" />);
    expect(screen.getByText("2035")).toBeInTheDocument();
  });
});
