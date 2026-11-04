import { quantumExposure } from "./triage.ts";
import type { Asset } from "./types.ts";

/** What to replace the asset with, in one sentence the owning team can act on. */
export function replacementFor(asset: Asset): string {
  const exposure = quantumExposure(asset.algorithm);
  if (exposure === "safe") return "Nothing: the algorithm holds against a quantum computer.";
  if (exposure === "weakened") {
    return "AES-256-GCM: a 128-bit key keeps only 64 bits of strength against Grover search, so re-wrap the data under a 256-bit key.";
  }
  switch (asset.purpose) {
    case "key-exchange":
      return asset.kind === "vpn-tunnel"
        ? "ML-KEM-1024 in IKEv2 (RFC 9370 additional key exchange), hybrid with the current group until every peer upgrades."
        : "X25519MLKEM768 in TLS 1.3 now, then ML-KEM-768 alone once every client in the fleet negotiates it.";
    case "encryption":
      return "ML-KEM-1024 key wrapping, re-encrypting the stored data; keep the old key only until the last copy is re-wrapped.";
    case "signature":
      return asset.kind === "code-signing-key"
        ? "ML-DSA-65, with SLH-DSA-128s for artefacts that must verify for decades without a trusted update path."
        : "ML-DSA-65 for new tokens, with a short dual-signing window while verifiers roll over.";
    case "authentication":
      return asset.kind === "ssh-host-key"
        ? "An ML-DSA-65 host key as soon as the SSH clients in use accept one; the key exchange moves to mlkem768x25519 first."
        : "A certificate signed with ML-DSA-65 (composite with ECDSA P-256 while relying parties catch up).";
  }
}
