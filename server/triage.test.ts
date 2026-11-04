import { describe, expect, it } from "vitest";
import type { Asset } from "./types.ts";
import { exposureYears, marginYears, quantumExposure, rankAssets, summarize } from "./triage.ts";

const asOf = "2026-11-04";

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: "ast-0001",
    name: "api.payments.halden.example",
    kind: "tls-endpoint",
    service: "payments-gateway",
    algorithm: "X25519",
    keySize: 255,
    protocol: "TLS 1.3",
    purpose: "key-exchange",
    issued: "2026-01-10",
    expires: "2027-01-10",
    secrecyYears: 7,
    migrationMonths: 6,
    owner: "Léa Fontaine",
    ...overrides,
  };
}

describe("quantumExposure", () => {
  it.each([
    ["RSA-2048", "vulnerable"],
    ["ECDSA P-256", "vulnerable"],
    ["X25519", "vulnerable"],
    ["DH group 14", "vulnerable"],
    ["Ed25519", "vulnerable"],
    ["AES-128-CBC", "weakened"],
    ["AES-256-GCM", "safe"],
    ["ML-KEM-768", "safe"],
    ["ML-DSA-65", "safe"],
    ["X25519MLKEM768", "safe"],
  ] as const)("%s is %s", (algorithm, expected) => {
    expect(quantumExposure(algorithm)).toBe(expected);
  });
});

describe("exposureYears", () => {
  it("adds the secrecy horizon to the migration time in years", () => {
    expect(exposureYears(asset({ secrecyYears: 7, migrationMonths: 6 }))).toBe(7.5);
  });

  it("is only the migration time for a signature or authentication key", () => {
    expect(exposureYears(asset({ purpose: "signature", secrecyYears: 0, migrationMonths: 9 }))).toBe(0.75);
  });
});

describe("marginYears", () => {
  it("is the years left before the horizon once secrecy and migration are spent", () => {
    // 2026-11-04 to 2035-01-01 is 8.16 years; minus 7.5 of exposure leaves 0.66.
    expect(marginYears(asset({ secrecyYears: 7, migrationMonths: 6 }), 2035, asOf)).toBeCloseTo(0.66, 2);
  });

  it("goes negative for data that outlives the horizon", () => {
    expect(marginYears(asset({ secrecyYears: 25, migrationMonths: 12 }), 2035, asOf)).toBeCloseTo(-17.84, 2);
  });

  it("is null for an algorithm a quantum computer does not break", () => {
    expect(marginYears(asset({ algorithm: "X25519MLKEM768" }), 2035, asOf)).toBeNull();
  });
});

describe("rankAssets", () => {
  it("puts the asset with the least margin first and the safe ones last", () => {
    const ranked = rankAssets(
      [
        asset({ id: "safe", algorithm: "ML-KEM-768" }),
        asset({ id: "tight", secrecyYears: 7, migrationMonths: 6 }),
        asset({ id: "broken", secrecyYears: 25, migrationMonths: 12 }),
        asset({ id: "loose", secrecyYears: 1, migrationMonths: 3 }),
      ],
      2035,
      asOf,
    );
    expect(ranked.map((row) => row.id)).toEqual(["broken", "tight", "loose", "safe"]);
    expect(ranked[0]?.pastHorizon).toBe(true);
    expect(ranked[1]?.pastHorizon).toBe(false);
  });
});

describe("summarize", () => {
  it("counts assets by exposure so that the parts add up to the total", () => {
    const summary = summarize(
      [
        asset({ id: "a", algorithm: "RSA-2048", secrecyYears: 25 }),
        asset({ id: "b", algorithm: "RSA-2048", secrecyYears: 1 }),
        asset({ id: "c", algorithm: "AES-128-CBC", purpose: "encryption", secrecyYears: 2 }),
        asset({ id: "d", algorithm: "AES-256-GCM", purpose: "encryption" }),
        asset({ id: "e", algorithm: "X25519MLKEM768" }),
      ],
      2035,
      asOf,
    );
    expect(summary).toEqual({
      total: 5,
      vulnerable: 2,
      weakened: 1,
      safe: 2,
      pastHorizon: 1,
      horizon: 2035,
    });
    expect(summary.vulnerable + summary.weakened + summary.safe).toBe(summary.total);
  });
});
