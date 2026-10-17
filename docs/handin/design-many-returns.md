# Taxmark: many returns, secure ingest (part built, part designed)

Draft, 17 Oct 2026. The submission runs one return. This is how it becomes a product for any client's return, and
what already exists toward it.

## What already works for any packet

- **Validation.** Every packet is checked against the README's schema on load; unknown fields are kept, broken ones
  are reported.
- **Fingerprint.** Each packet's SHA-256 is its identity. The AI payload is tied to that hash, so suggestions for one
  return can never appear on another.
- **Checks.** Written against the schema, never against document ids or names, and tested on a second, altered packet
  (people renamed, a form removed, a staff member added) to prove each can fire and stay silent.
- **AI reader.** Runs on any packet (`--packet`); it has been run on both the real and the altered packet.
- **Workspaces.** Each has its own append-only event log.

## Built on 17 Oct: one return, by pointer, encrypted

The submission's one return now follows the design's storage half:

- **A pointer, not a file in the deploy.** Production holds `RETURN_ID` (the packet's SHA-256), not the packet. The
  server fetches `returns/<sha>/packet.json.enc` from a private Vercel Blob store (`taxmark-client-data`) with its own
  token, decrypts it (AES-256-GCM, key in `DATA_ENCRYPTION_KEY`, the blob path bound into the authentication tag),
  and refuses to serve it if the decrypted bytes do not hash to `RETURN_ID` (`src/server/data.ts`, `src/server/vault.ts`).
- **Out of the server functions.** Neither the packet nor the AI payload ships with any function; the build's file
  traces list 0 of either across all 21 functions (13 did before).
- **Ingest at deploy.** `scripts/ingest.ts` encrypts the SHA-checked packet and the measured eval payload into the
  store if absent, and reads each back to compare hashes before the build continues.
- **The AI reader in the cloud.** `/api/internal/ai-reader` (daily Vercel Cron, bearer secret) runs the same reader
  core over the vault packet, stores the payload encrypted, and returns counts only. Idempotent per packet hash and
  prompt version. Pages pick up a new payload within 5 minutes, without a redeploy.
- **The harness in CI.** `.github/workflows/ci.yml` runs the unit tests, the typecheck, the SSN scan and an eval
  gate that fails if a produced suggestion is ungrounded, the verifier holds back more than the baseline (1), recall
  falls below the measured baseline (16 of 27 as shown), or the prompt changed without a new eval payload.

The deploy carries no client data, but the private GitHub repo still does: the delivered packet stays there as the
case study's ground truth, and the eval payloads quote client documents verbatim; in production, client data would
never be in the repo.

Still one return: the registry, sign-in, the return picker, per-firm keys and the audit trail below are designed,
not built.

## The design

```
 Header:  Taxmark   Okafor and Lindqvist, 2025 ▾        (only returns this signed-in user may open)
                      Next client, 2025
                      + Add a return  ──► asks the firm's secure store, never the browser

 Server:  returns registry  (id, label, source, packet hash, firm)
            source = a private storage location the server reaches with its own secret
          ingest job, once per new packet:
            1 fetch from the source        4 run our checks
            2 validate against the schema   5 queue the AI reader (key on the server only)
            3 fingerprint, store encrypted  6 publish to the registry; workspaces bind to (return, hash)
```

- **A pointer, not an upload.** The browser only picks a return by id; the server alone knows where its packet lives.
- **Nothing runs on page load.** Checks and the AI reader run once at ingest; pages read the stored results.
- **A new packet version is a new hash.** Old workspaces stay bound to the packet they reviewed; nothing changes under
  a reviewer's sign-off.

## What it needs first

1. **Sign-in and firm scoping.** Today's role switcher is a demo convenience. Without real identity, any ingest
   endpoint is open to anyone with the link.
2. **Encrypted storage per firm, with an audit of who added and opened each return** (IRS Publication 4557 and the FTC
   Safeguards Rule apply to tax preparers).
3. **Limits** on packet size and AI spend per ingest, and a background job for the reader.
4. **Retention rules** for client data and workpapers.

## The one refactor

The app loads one packet through a single shared loader, now warmed from the vault by `ensureReturnData()`. Making it
per-return (the loader keyed by return id instead of one `RETURN_ID`, workspaces bound to a return) is the main code
change left; the blob paths are already keyed by the return's hash, and everything downstream already takes the
packet as an input.
