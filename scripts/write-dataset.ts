// Writes server/data/assets.json and server/data/services.json: a made-up but
// consistent cryptographic inventory for one organisation. Deterministic, so
// re-running it changes nothing unless the recipe below changes.
//
//   node --experimental-strip-types scripts/write-dataset.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Algorithm, Asset, AssetKind, Purpose, Service } from "../server/types.ts";

const AS_OF = "2026-11-04";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261104);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const services: Service[] = [
  { slug: "payments-gateway", name: "Payments gateway", team: "Payments", criticality: "critical" },
  { slug: "card-vault", name: "Card vault", team: "Payments", criticality: "critical" },
  { slug: "settlement-engine", name: "Settlement engine", team: "Payments", criticality: "high" },
  { slug: "trading-api", name: "Trading API", team: "Trading", criticality: "critical" },
  { slug: "market-data-feed", name: "Market data feed", team: "Trading", criticality: "standard" },
  { slug: "customer-identity", name: "Customer identity", team: "Identity", criticality: "critical" },
  { slug: "sso-portal", name: "Staff SSO portal", team: "Identity", criticality: "high" },
  { slug: "vpn-edge", name: "VPN edge", team: "Infrastructure", criticality: "high" },
  { slug: "build-pipeline", name: "Build pipeline", team: "Infrastructure", criticality: "high" },
  { slug: "kubernetes-control", name: "Kubernetes control plane", team: "Infrastructure", criticality: "critical" },
  { slug: "data-lake", name: "Data lake", team: "Data platform", criticality: "high" },
  { slug: "backup-archive", name: "Backup archive", team: "Data platform", criticality: "critical" },
  { slug: "mail-relay", name: "Mail relay", team: "Corporate IT", criticality: "standard" },
  { slug: "public-web", name: "Public website", team: "Corporate IT", criticality: "standard" },
];

const owners: Record<string, string[]> = {
  Payments: ["Léa Fontaine", "Marco Benedetti", "Inès Rahmani"],
  Trading: ["Tomasz Wieczorek", "Camille Roux"],
  Identity: ["Sofia Lindqvist", "Yann Le Goff"],
  Infrastructure: ["Priya Natarajan", "Olivier Mercier", "Dario Conti"],
  "Data platform": ["Hanna Weber", "Rémi Aubert"],
  "Corporate IT": ["Aisha Diallo", "Karl Jensen"],
};

// How long the data each service handles must stay secret, in years.
const secrecyByService: Record<string, [number, number]> = {
  "payments-gateway": [7, 10],
  "card-vault": [10, 15],
  "settlement-engine": [7, 10],
  "trading-api": [5, 7],
  "market-data-feed": [0.5, 1],
  "customer-identity": [10, 12],
  "sso-portal": [1, 3],
  "vpn-edge": [5, 10],
  "build-pipeline": [1, 2],
  "kubernetes-control": [2, 5],
  "data-lake": [8, 12],
  "backup-archive": [25, 30],
  "mail-relay": [3, 5],
  "public-web": [0.5, 0.5],
};

interface Recipe {
  kind: AssetKind;
  purpose: Purpose;
  protocol: string;
  algorithms: readonly [Algorithm, number][];
  lifetimeMonths: [number, number] | null;
  migrationMonths: [number, number];
  name: (service: Service, n: number) => string;
}

const host = (service: Service) => `${service.slug.replace(/-/g, "")}.halden.example`;

const recipes: Recipe[] = [
  {
    kind: "tls-endpoint",
    purpose: "key-exchange",
    protocol: "TLS 1.3",
    algorithms: [
      ["X25519", 255],
      ["ECDHE P-256", 256],
      ["X25519MLKEM768", 1216],
    ],
    lifetimeMonths: null,
    migrationMonths: [2, 6],
    name: (s, n) => `${n === 0 ? "api" : n === 1 ? "internal" : `edge-${n}`}.${host(s)}`,
  },
  {
    kind: "certificate",
    purpose: "authentication",
    protocol: "X.509",
    algorithms: [
      ["RSA-2048", 2048],
      ["ECDSA P-256", 256],
      ["ECDSA P-384", 384],
    ],
    lifetimeMonths: [12, 13],
    migrationMonths: [3, 9],
    name: (s, n) => `${n === 0 ? "api" : `edge-${n}`}.${host(s)} certificate`,
  },
  {
    kind: "mtls-client-certificate",
    purpose: "authentication",
    protocol: "TLS 1.2 mTLS",
    algorithms: [
      ["RSA-2048", 2048],
      ["ECDSA P-256", 256],
    ],
    lifetimeMonths: [24, 36],
    migrationMonths: [6, 12],
    name: (s, n) => `${s.name} client ${["A", "B", "C"][n] ?? n}`,
  },
  {
    kind: "ssh-host-key",
    purpose: "authentication",
    protocol: "SSH-2",
    algorithms: [
      ["Ed25519", 255],
      ["RSA-2048", 2048],
    ],
    lifetimeMonths: null,
    migrationMonths: [1, 3],
    name: (s, n) => `${s.slug}-${n + 1} host key`,
  },
  {
    kind: "code-signing-key",
    purpose: "signature",
    protocol: "Sigstore",
    algorithms: [
      ["RSA-3072", 3072],
      ["ECDSA P-384", 384],
      ["ML-DSA-65", 1952],
    ],
    lifetimeMonths: [36, 60],
    migrationMonths: [6, 18],
    name: (s, n) => `${s.name} release signing ${n + 1}`,
  },
  {
    kind: "vpn-tunnel",
    purpose: "key-exchange",
    protocol: "IKEv2",
    algorithms: [
      ["DH group 14", 2048],
      ["ECDHE P-256", 256],
      ["ML-KEM-1024", 1568],
    ],
    lifetimeMonths: null,
    migrationMonths: [3, 9],
    name: (s, n) => `${s.name} tunnel ${["Paris", "Frankfurt", "Dublin", "Milan"][n] ?? n}`,
  },
  {
    kind: "jwt-signing-key",
    purpose: "signature",
    protocol: "JWS",
    algorithms: [
      ["RSA-2048", 2048],
      ["ECDSA P-256", 256],
      ["Ed25519", 255],
    ],
    lifetimeMonths: [6, 12],
    migrationMonths: [2, 6],
    name: (s, n) => `${s.name} token key ${n + 1}`,
  },
  {
    kind: "data-at-rest-key",
    purpose: "encryption",
    protocol: "KMS envelope",
    algorithms: [
      ["AES-256-GCM", 256],
      ["AES-128-CBC", 128],
    ],
    lifetimeMonths: null,
    migrationMonths: [4, 12],
    name: (s, n) => `${s.name} ${["primary", "replica", "analytics"][n] ?? n} store key`,
  },
  {
    kind: "backup-encryption-key",
    purpose: "encryption",
    protocol: "PKCS#7 wrapped",
    algorithms: [
      ["RSA-2048", 2048],
      ["RSA-4096", 4096],
      ["AES-256-GCM", 256],
    ],
    lifetimeMonths: null,
    migrationMonths: [6, 18],
    name: (s, n) => `${s.name} backup set ${n + 1}`,
  },
  {
    kind: "hsm-wrapping-key",
    purpose: "encryption",
    protocol: "PKCS#11",
    algorithms: [
      ["RSA-4096", 4096],
      ["RSA-3072", 3072],
    ],
    lifetimeMonths: [60, 120],
    migrationMonths: [9, 18],
    name: (s, n) => `${s.name} HSM wrapping key ${n + 1}`,
  },
];

// Which recipes each service holds, and how many of each.
const plan: Record<string, [AssetKind, number][]> = {
  "payments-gateway": [["tls-endpoint", 3], ["certificate", 3], ["mtls-client-certificate", 3], ["jwt-signing-key", 2], ["data-at-rest-key", 1]],
  "card-vault": [["tls-endpoint", 1], ["certificate", 1], ["hsm-wrapping-key", 2], ["data-at-rest-key", 2], ["backup-encryption-key", 1]],
  "settlement-engine": [["tls-endpoint", 1], ["certificate", 1], ["mtls-client-certificate", 2], ["data-at-rest-key", 2], ["ssh-host-key", 2]],
  "trading-api": [["tls-endpoint", 2], ["certificate", 2], ["mtls-client-certificate", 3], ["jwt-signing-key", 1], ["data-at-rest-key", 1]],
  "market-data-feed": [["tls-endpoint", 2], ["certificate", 1], ["ssh-host-key", 2]],
  "customer-identity": [["tls-endpoint", 2], ["certificate", 2], ["jwt-signing-key", 3], ["data-at-rest-key", 2], ["hsm-wrapping-key", 1]],
  "sso-portal": [["tls-endpoint", 1], ["certificate", 1], ["jwt-signing-key", 2], ["ssh-host-key", 1]],
  "vpn-edge": [["vpn-tunnel", 4], ["certificate", 2], ["ssh-host-key", 3]],
  "build-pipeline": [["code-signing-key", 4], ["tls-endpoint", 1], ["certificate", 1], ["ssh-host-key", 3]],
  "kubernetes-control": [["certificate", 3], ["mtls-client-certificate", 3], ["ssh-host-key", 4], ["data-at-rest-key", 1]],
  "data-lake": [["tls-endpoint", 1], ["certificate", 1], ["data-at-rest-key", 3], ["backup-encryption-key", 2]],
  "backup-archive": [["backup-encryption-key", 4], ["hsm-wrapping-key", 2], ["ssh-host-key", 2], ["data-at-rest-key", 1]],
  "mail-relay": [["tls-endpoint", 2], ["certificate", 2], ["data-at-rest-key", 1]],
  "public-web": [["tls-endpoint", 2], ["certificate", 2]],
};

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoDate(d.getTime());
}

const asOfMs = Date.parse(`${AS_OF}T00:00:00Z`);
const assets: Asset[] = [];
let counter = 0;

for (const service of services) {
  const [secrecyMin, secrecyMax] = secrecyByService[service.slug] ?? [1, 1];
  for (const [kind, count] of plan[service.slug] ?? []) {
    const recipe = recipes.find((r) => r.kind === kind);
    if (!recipe) throw new Error(`no recipe for ${kind}`);
    for (let n = 0; n < count; n++) {
      counter += 1;
      // Post-quantum options are rare and newer than the rest; weight the first classical option most.
      const roll = rand();
      const [algorithm, keySize] =
        recipe.algorithms.length === 3 && roll > 0.86
          ? recipe.algorithms[2]!
          : roll > 0.55
            ? recipe.algorithms[1]!
            : recipe.algorithms[0]!;
      const isPostQuantum = algorithm.startsWith("ML-") || algorithm === "X25519MLKEM768";
      const ageDays = isPostQuantum ? between(20, 200) : between(60, 900);
      const issued = isoDate(asOfMs - ageDays * 86_400_000);
      const expires = recipe.lifetimeMonths
        ? addMonths(issued, between(recipe.lifetimeMonths[0], recipe.lifetimeMonths[1]))
        : null;
      const secrecy =
        recipe.purpose === "key-exchange" || recipe.purpose === "encryption"
          ? Math.round((secrecyMin + rand() * (secrecyMax - secrecyMin)) * 2) / 2
          : 0;
      assets.push({
        id: `ast-${String(counter).padStart(4, "0")}`,
        name: recipe.name(service, n),
        kind,
        service: service.slug,
        algorithm,
        keySize,
        protocol: recipe.protocol,
        purpose: recipe.purpose,
        issued,
        expires,
        secrecyYears: secrecy,
        migrationMonths: between(recipe.migrationMonths[0], recipe.migrationMonths[1]),
        owner: pick(owners[service.team] ?? ["Unassigned"]),
      });
    }
  }
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "server", "data");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "services.json"), `${JSON.stringify(services, null, 2)}\n`);
writeFileSync(join(out, "assets.json"), `${JSON.stringify({ asOf: AS_OF, assets }, null, 2)}\n`);
console.log(`${assets.length} assets across ${services.length} services written to server/data`);
