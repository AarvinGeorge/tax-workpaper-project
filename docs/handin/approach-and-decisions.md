# Approach and key decisions

Live app: https://taxmark-workpaper.vercel.app (no sign-in; a role switcher, top right, shows every person's view).

## The approach

A workpaper exists to prove the return. So in Taxmark every number is a claim that carries its proof. Click any
number and the right-hand panel answers four questions: where it came from (the source page and field, highlighted),
what was done to it (the rule that built it, and any change with who, why and the tax effect), who checked it
(sign-offs bound to the value they signed), and what is still open (findings, review notes, questions).

I worked in this order: hunt the packet's confident mistakes first, let them shape the data model, build a thin
end-to-end slice and deploy it early, then widen it in rounds, redeploying and re-testing after each.

## Key decisions and their trade-offs

**1. The packet is read-only; everything people do is an event.** Adjustments, notes, sign-offs, questions, answers,
reveals and clock moves are appended to a log in Postgres and never edited or deleted. An undo or a reset is a new
event on top. Each screen is computed from the packet plus the log, for one person at one point in the story.
*Trade-off:* every page replays the workspace's events (16 to 29 ms for 300 events, measured across roles and screens). In return the audit trail
is complete by construction.

**2. Our own checks, written against the packet's format, not against this client.** Extraction confidence cannot
catch a confident mistake: a wrong value read at 0.99 still reads at 0.99. So 15 families of deterministic checks
re-derive what should agree: the return against the IRS and California account records, documents against each
other, this year against last, and fields the engine ignored, such as a payment's tax year. No check names a document
id, a person or a line key, and each family was run on an altered copy of the packet to prove it fires and stays
quiet when it should. The engine's own diagnostics are shown beside ours under their own label.
*Trade-off:* five families depend on how free text is worded (repair or improvement, home office, health coverage,
state wages, the penalty method). A document that phrases the fact differently would be missed. That tier is where
AI helps (below).

**3. Roles are enforced on the server.** Ten people from the packet's firm and household, from preparer to IRS
examiner. Self-review is refused; a tax effect over 1,000 needs the partner; Marcus, without sensitive-data
clearance, sees the last 4 digits of an SSN and cannot reveal more; clients see only their own items, in plain words.
Masking happens in the API, so a hidden number never reaches the browser, and every reveal is logged.
*Trade-off:* a role switcher instead of sign-in, so a reviewer can see every view from one link.

**4. Every sign-off says what was checked.** A sign-off is bound to the value it signed and goes stale if the value
changes. The server refuses a sign-off on any item without a note on what was checked. On Checks, a reviewer ticks
rows (or a whole severity group) in the one table and signs off the selection; if a ticked row has no note, nothing
is signed and the screen opens that row. One undo reverses the batch.
*Trade-off:* signing many items takes a note per item. That is the point: one note pasted on ten items is not a
review.

**5. One story clock replays the season, and the past is view-only.** The packet's timeline (documents arriving, the
e-file rejection, acceptance, a letter from the IRS years later) plays out as the clock moves. A finding appears
when its evidence arrives, and the return freezes at federal acceptance; later changes are amended on top. You can
move the clock back to look, but you can only act at the latest point the story has reached, so the filed return
cannot be rewritten through the past.
*Trade-off:* one clock per workspace, so two people cannot sit at different moments of the story at once.

**6. The finalized return is v3 plus our applied adjustments, not a recomputation.** Each change shows its tax effect
estimated from the packet's own rates, marked as an estimate. *Trade-off:* totals do not cascade; a real product would
send the adjusted inputs back to the engine.

**7. Simulated source pages, built to be replaced.** Each page is rendered from the packet's printed text with every
extracted field highlighted at its recorded position. Every trace already points to a document, page and position,
so a real PDF can take the simulated page's place without changing anything upstream.

**8. Client data stays out of the code.** The packet and the AI's suggestions are stored encrypted (AES-256-GCM) in
private cloud storage. The app opens the packet by its fingerprint (SHA-256) and refuses it if one byte has changed;
the keys exist only on the server. *Trade-off:* one more moving part at deploy time, checked by reading the data back
before every build goes live.

**9. One place per action, one word per meaning.** A late review of the whole app removed repeated screens and
actions: the separate sign-off list became a checkbox column in the Checks table, Home stopped repeating the bell,
each row has one link per destination, and the right panel names what its actions act on. The note that can block
approval is a "review note"; the note on a sign-off is "what you checked".

## Designed, not built

Uploading a real file as evidence (notes are built), the examination response pack (the examiner already sees the
items under examination and the return as filed), the penalty and interest estimate, many returns behind sign-in
(the storage is already keyed by each packet's fingerprint), and a cited source on every tax definition.

## How it was tested

515 unit tests run in continuous integration on every push, with a typecheck, a scan for full SSNs and the AI
scorecard gate; 79 browser tests run before every push; and a 36-step walk through the brief's requirements runs
against the live site after each deploy (36 of 36 at the last deploy). Each known mistake has a test that fails if the
app stops flagging it.
