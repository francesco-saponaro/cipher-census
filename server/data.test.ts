import { describe, expect, it } from "vitest";
import { asOf, assets, services } from "./data.ts";

describe("the bundled inventory", () => {
  it("holds between 100 and 200 assets with unique ids", () => {
    expect(assets.length).toBeGreaterThanOrEqual(100);
    expect(assets.length).toBeLessThanOrEqual(200);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);
  });

  it("points every asset at a known service", () => {
    const slugs = new Set(services.map((service) => service.slug));
    for (const asset of assets) expect(slugs.has(asset.service), asset.id).toBe(true);
  });

  it("issues every asset before it expires and before today", () => {
    for (const asset of assets) {
      expect(asset.issued <= asOf, asset.id).toBe(true);
      if (asset.expires) expect(asset.expires > asset.issued, asset.id).toBe(true);
    }
  });

  it("gives a secrecy horizon only to keys that protect confidentiality", () => {
    for (const asset of assets) {
      if (asset.purpose === "signature" || asset.purpose === "authentication") {
        expect(asset.secrecyYears, asset.id).toBe(0);
      } else {
        expect(asset.secrecyYears, asset.id).toBeGreaterThan(0);
      }
    }
  });

  it("gives every service at least two assets", () => {
    for (const service of services) {
      expect(assets.filter((asset) => asset.service === service.slug).length, service.slug).toBeGreaterThanOrEqual(2);
    }
  });
});
