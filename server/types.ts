// Shared contract between the API in server/ and the UI in src/.

export type AssetKind =
  | "tls-endpoint"
  | "certificate"
  | "mtls-client-certificate"
  | "ssh-host-key"
  | "code-signing-key"
  | "vpn-tunnel"
  | "jwt-signing-key"
  | "data-at-rest-key"
  | "backup-encryption-key"
  | "hsm-wrapping-key";

export type Purpose = "key-exchange" | "signature" | "authentication" | "encryption";

export type Algorithm =
  | "RSA-2048"
  | "RSA-3072"
  | "RSA-4096"
  | "ECDSA P-256"
  | "ECDSA P-384"
  | "ECDHE P-256"
  | "Ed25519"
  | "X25519"
  | "DH group 14"
  | "AES-128-CBC"
  | "AES-256-GCM"
  | "ML-KEM-768"
  | "ML-KEM-1024"
  | "ML-DSA-65"
  | "X25519MLKEM768";

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  service: string;
  algorithm: Algorithm;
  keySize: number;
  protocol: string;
  purpose: Purpose;
  issued: string;
  expires: string | null;
  /** How many years the data this asset protects must stay secret. 0 for keys that only sign or authenticate. */
  secrecyYears: number;
  /** The team's own estimate of how long replacing this asset takes. */
  migrationMonths: number;
  owner: string;
}

export interface Service {
  slug: string;
  name: string;
  team: string;
  criticality: "critical" | "high" | "standard";
}

export type QuantumExposure = "vulnerable" | "weakened" | "safe";

export interface TriagedAsset extends Asset {
  exposure: QuantumExposure;
  /** Years of protection needed beyond today: secrecy plus migration. */
  exposureYears: number;
  /** Years to spare before the horizon, negative when the data outlives it. Null when nothing needs migrating. */
  margin: number | null;
  pastHorizon: boolean;
}

export interface Summary {
  total: number;
  vulnerable: number;
  weakened: number;
  safe: number;
  pastHorizon: number;
  horizon: number;
}
