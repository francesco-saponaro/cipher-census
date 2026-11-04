import type { AssetKind, Purpose, QuantumExposure } from "@server/types.ts";

export const kindLabels: Record<AssetKind, string> = {
  "tls-endpoint": "TLS endpoint",
  certificate: "Certificate",
  "mtls-client-certificate": "Client certificate",
  "ssh-host-key": "SSH host key",
  "code-signing-key": "Code-signing key",
  "vpn-tunnel": "VPN tunnel",
  "jwt-signing-key": "Token signing key",
  "data-at-rest-key": "Data-at-rest key",
  "backup-encryption-key": "Backup key",
  "hsm-wrapping-key": "HSM wrapping key",
};

export const purposeLabels: Record<Purpose, string> = {
  "key-exchange": "Key exchange",
  signature: "Signature",
  authentication: "Authentication",
  encryption: "Encryption",
};

export const exposureLabels: Record<QuantumExposure, string> = {
  vulnerable: "Breaks",
  weakened: "Weakened",
  safe: "Holds",
};

const yearsFormat = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const plainYears = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** A signed number of years with one decimal, or a dash when there is nothing to measure. */
export function signedYears(value: number | null): string {
  return value === null ? "—" : yearsFormat.format(value).replace("-", "−");
}

export function years(value: number): string {
  return plainYears.format(value);
}

export function months(value: number): string {
  return value === 1 ? "1 month" : `${value} months`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function longDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}

export function keySize(algorithm: string, bits: number): string {
  if (algorithm.startsWith("ML-") || algorithm === "X25519MLKEM768") return `${bits}-byte public key`;
  if (algorithm.startsWith("AES")) return `${bits}-bit key`;
  return `${bits}-bit ${algorithm.startsWith("RSA") || algorithm.startsWith("DH") ? "modulus" : "curve"}`;
}
