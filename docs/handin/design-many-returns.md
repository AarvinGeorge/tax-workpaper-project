# Taxmark: many returns, secure ingest (designed, not built)

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

The app loads one packet through a single shared loader. Making it per-return (loader keyed by return, workspaces
bound to a return) is the main code change; everything downstream already takes the packet as an input.
