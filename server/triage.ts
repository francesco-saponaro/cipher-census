import type { Algorithm, Asset, QuantumExposure, Summary, TriagedAsset } from "./types.ts";

const DAYS_PER_YEAR = 365.25;

const exposureByAlgorithm: Record<Algorithm, QuantumExposure> = {
  "RSA-2048": "vulnerable",
  "RSA-3072": "vulnerable",
  "RSA-4096": "vulnerable",
  "ECDSA P-256": "vulnerable",
  "ECDSA P-384": "vulnerable",
  "ECDHE P-256": "vulnerable",
  Ed25519: "vulnerable",
  X25519: "vulnerable",
  "DH group 14": "vulnerable",
  "AES-128-CBC": "weakened",
  "AES-256-GCM": "safe",
  "ML-KEM-768": "safe",
  "ML-KEM-1024": "safe",
  "ML-DSA-65": "safe",
  X25519MLKEM768: "safe",
};

/** Whether a large quantum computer breaks the algorithm outright, only halves its strength, or leaves it alone. */
export function quantumExposure(algorithm: Algorithm): QuantumExposure {
  return exposureByAlgorithm[algorithm];
}

/** Years of protection the asset still has to provide: the data's secrecy horizon plus the time to replace the asset. */
export function exposureYears(asset: Asset): number {
  const secrecy = asset.purpose === "key-exchange" || asset.purpose === "encryption" ? asset.secrecyYears : 0;
  return secrecy + asset.migrationMonths / 12;
}

/** Years between a date and the first day of the horizon year. */
export function yearsUntil(horizonYear: number, asOf: string): number {
  const start = Date.UTC(horizonYear, 0, 1);
  const now = Date.parse(`${asOf}T00:00:00Z`);
  return (start - now) / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000);
}

/** Years to spare before the horizon, or null when the asset does not need migrating. */
export function marginYears(asset: Asset, horizonYear: number, asOf: string): number | null {
  if (quantumExposure(asset.algorithm) === "safe") return null;
  return yearsUntil(horizonYear, asOf) - exposureYears(asset);
}

export function triage(asset: Asset, horizonYear: number, asOf: string): TriagedAsset {
  const margin = marginYears(asset, horizonYear, asOf);
  return {
    ...asset,
    exposure: quantumExposure(asset.algorithm),
    exposureYears: exposureYears(asset),
    margin,
    pastHorizon: margin !== null && margin < 0,
  };
}

/** Least margin first; assets that need nothing come last, in their original order. */
export function rankAssets(assets: readonly Asset[], horizonYear: number, asOf: string): TriagedAsset[] {
  return assets
    .map((asset, index) => ({ row: triage(asset, horizonYear, asOf), index }))
    .sort((a, b) => {
      if (a.row.margin === null && b.row.margin === null) return a.index - b.index;
      if (a.row.margin === null) return 1;
      if (b.row.margin === null) return -1;
      return a.row.margin - b.row.margin || a.index - b.index;
    })
    .map(({ row }) => row);
}

export function summarize(assets: readonly Asset[], horizonYear: number, asOf: string): Summary {
  const rows = assets.map((asset) => triage(asset, horizonYear, asOf));
  return {
    total: rows.length,
    vulnerable: rows.filter((row) => row.exposure === "vulnerable").length,
    weakened: rows.filter((row) => row.exposure === "weakened").length,
    safe: rows.filter((row) => row.exposure === "safe").length,
    pastHorizon: rows.filter((row) => row.pastHorizon).length,
    horizon: horizonYear,
  };
}
