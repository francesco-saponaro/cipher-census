import { describe, expect, it } from "vitest";
import { replacementFor } from "./replacement.ts";
import type { Asset } from "./types.ts";

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: "ast-0001",
    name: "api.paymentsgateway.halden.example",
    kind: "tls-endpoint",
    service: "payments-gateway",
    algorithm: "X25519",
    keySize: 255,
    protocol: "TLS 1.3",
    purpose: "key-exchange",
    issued: "2026-01-10",
    expires: null,
    secrecyYears: 7,
    migrationMonths: 6,
    owner: "Léa Fontaine",
    ...overrides,
  };
}

describe("replacementFor", () => {
  it("sends a classical key exchange to the hybrid group first", () => {
    expect(replacementFor(asset({}))).toMatch(/X25519MLKEM768/);
  });

  it("sends a signing key to ML-DSA", () => {
    expect(replacementFor(asset({ purpose: "signature", algorithm: "RSA-3072", kind: "code-signing-key" }))).toMatch(/ML-DSA-65/);
  });

  it("asks for a longer symmetric key when the key is only weakened", () => {
    expect(replacementFor(asset({ purpose: "encryption", algorithm: "AES-128-CBC", kind: "data-at-rest-key" }))).toMatch(/AES-256-GCM/);
  });

  it("says nothing is needed for an algorithm that already holds", () => {
    expect(replacementFor(asset({ algorithm: "X25519MLKEM768" }))).toMatch(/^Nothing/);
  });
});
