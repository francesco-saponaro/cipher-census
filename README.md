# Cipher Census

A triage desk for a cryptographic inventory: which keys, certificates and endpoints break under a quantum computer, and the order to migrate them.

Live: https://cipher-census.netlify.app

## Why

Once an organisation has an inventory of its cryptography (every TLS endpoint, certificate, SSH key, VPN tunnel, signing key and wrapping key, with the algorithm behind each), the question the migration lead gets asked every week is "what do we do first?". Not every RSA key is the same problem. A key that protects records that must stay secret for twenty-five years is already a problem today, because traffic recorded now can be decrypted the day a large enough quantum computer exists. A six-month certificate on a marketing site is not. Mosca's rule puts a number on it: if the years the data must stay secret plus the years the migration takes exceed the years until that computer arrives, the margin is negative and the asset outlives the horizon.

Cipher Census takes an inventory of 110 assets across 14 services, applies that rule under a horizon you choose (2030, 2033, 2035 or 2040) and ranks everything by margin. The pure signing and authentication keys get no secrecy horizon, since nobody can forge last year's signature retroactively; they only need replacing before the horizon.

## What it does

- **Census.** Four counts, a strip with one bar per service showing how long it must keep its secrets against the horizon line, and the full ranking with filters by team, kind of asset, exposure and free text. Move the horizon and everything re-ranks.
- **Services.** The same inventory folded by service: assets, longest exposure, tightest margin, how many outlive the horizon.
- **One asset.** Its margin and the sentence behind it, a strip of its own secrecy and migration time against the horizon, the replacement its owning team should move to, its facts, and the rest of the service.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 38 tests
npm run build      # dist/
npm run dataset    # regenerate server/data/*.json from scripts/write-dataset.ts
```

## Stack

TypeScript in strict mode on both sides of one repo. The API is a Hono app in `server/`: typed routes with zod-validated queries, and the UI calls it through Hono's `hc` RPC client, so the route types and the response types are the same objects at both ends. React 19, Vite, TanStack Router for the routes and the typed search params (the horizon and the filters live in the URL), TanStack Query for loading, Tailwind v4 with a small token stylesheet, and the UI primitives laid out the shadcn/ui way (`components/ui`, `cn`, variants with cva, Radix underneath the select). Tests with Vitest and Testing Library.

## How it ranks

`server/triage.ts` classifies each algorithm as vulnerable (RSA, ECDSA, ECDH, X25519, Ed25519, finite-field DH), weakened (AES-128, whose strength halves under Grover search) or safe (AES-256, ML-KEM, ML-DSA, the X25519MLKEM768 hybrid). The exposure of an asset is its secrecy horizon in years, if it protects confidentiality, plus its migration estimate; the margin is the years until the first of January of the horizon year minus that exposure. The census sorts by margin ascending, with the assets that need nothing at the end. `server/replacement.ts` names the replacement by purpose and kind: hybrid key exchange for TLS, ML-KEM-1024 for IKEv2 and key wrapping, ML-DSA-65 for signatures and certificates, AES-256-GCM for the weakened keys.

## What is mocked

The inventory is generated once by `scripts/write-dataset.ts` with a fixed seed and committed as JSON, for a made-up group with payments, trading, identity, infrastructure, data and corporate IT teams. The Hono app runs in the browser: the RPC client's `fetch` is `app.request`, so no request leaves the page. Against a real deployment the same app would sit on Node behind `/api`, read the inventory from PostgreSQL (the `assets` and `services` arrays map one to one onto two tables) and the client would change one line, the base URL. The migration estimates are the kind of number each team would maintain by hand; a real tool would also take the secrecy horizon from a data classification rather than from the service.
