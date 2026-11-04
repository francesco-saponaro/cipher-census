import { describe, expect, it } from "vitest";
import { app } from "./app.ts";
import { assets } from "./data.ts";

async function get(path: string) {
  const res = await app.request(path);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/summary", () => {
  it("counts the whole inventory under the requested horizon", async () => {
    const { status, body } = await get("/api/summary?horizon=2035");
    expect(status).toBe(200);
    expect(body.total).toBe(assets.length);
    expect(body.horizon).toBe(2035);
    expect(body.vulnerable + body.weakened + body.safe).toBe(body.total);
  });

  it("rejects a horizon outside the range the screen offers", async () => {
    const { status } = await get("/api/summary?horizon=2099");
    expect(status).toBe(400);
  });
});

describe("GET /api/assets", () => {
  it("returns the ranked inventory, least margin first", async () => {
    const { body } = await get("/api/assets?horizon=2035");
    const margins = body.rows.map((row: { margin: number | null }) => row.margin).filter((m: number | null) => m !== null);
    expect(body.rows).toHaveLength(assets.length);
    expect(margins).toEqual([...margins].sort((a, b) => a - b));
  });

  it("filters by team, kind and text", async () => {
    const { body } = await get("/api/assets?horizon=2035&team=Payments&kind=certificate&q=edge");
    expect(body.rows.length).toBeGreaterThan(0);
    for (const row of body.rows) {
      expect(row.kind).toBe("certificate");
      expect(row.team).toBe("Payments");
      expect(row.name).toMatch(/edge/);
    }
  });
});

describe("GET /api/assets/:id", () => {
  it("returns the asset with its service, a replacement and its siblings", async () => {
    const first = assets[0]!;
    const { status, body } = await get(`/api/assets/${first.id}?horizon=2035`);
    expect(status).toBe(200);
    expect(body.asset.id).toBe(first.id);
    expect(body.service.slug).toBe(first.service);
    expect(typeof body.replacement).toBe("string");
    expect(body.siblings.every((row: { service: string; id: string }) => row.service === first.service && row.id !== first.id)).toBe(true);
  });

  it("answers 404 for an id that is not in the inventory", async () => {
    const { status } = await get("/api/assets/ast-9999?horizon=2035");
    expect(status).toBe(404);
  });
});

describe("GET /api/services", () => {
  it("gives every service its longest exposure and how many assets are past the horizon", async () => {
    const { body } = await get("/api/services?horizon=2035");
    expect(body.rows).toHaveLength(14);
    const archive = body.rows.find((row: { slug: string }) => row.slug === "backup-archive");
    expect(archive.exposureYears).toBeGreaterThan(20);
    expect(archive.pastHorizon).toBeGreaterThan(0);
    expect(archive.assets).toBe(assets.filter((asset) => asset.service === "backup-archive").length);
  });
});
