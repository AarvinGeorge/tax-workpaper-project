# Taxmark: approach and key decisions

Draft for Aarvin's review, 17 Oct 2026. Live app: https://taxmark-workpaper.vercel.app

## The idea

A workpaper proves the return. So every number in Taxmark is a claim that carries its evidence: the source page and
field it came from, what was done to it, who checked it, and what is still open. You click a number and the right-hand
panel answers those four questions.

## Key decisions and their trade-offs

**1. The packet is read-only; everything people do is an event.** Adjustments, review notes, sign-offs, questions,
answers, reveals and clock moves are appended to a log (Postgres on Neon) and never edited or deleted. Each screen is a
projection of the packet plus the log, filtered and masked for the person viewing. An undo is a new event on top.
*Trade-off:* every page replays the workspace's events (24 ms for 300 events, measured); in return the audit trail is
complete by construction, and "who changed what, when and why" needs no extra code.

**2. Our own checks, written against the schema, never against this packet.** The engine's numbers and the extraction
confidence cannot catch a confident mistake: a wrong value read at 0.99 still reads at 0.99. So 27 deterministic checks
in 15 families re-derive what should agree (the return against the IRS and FTB account records, documents against each
other, this year against last, a field the engine ignored such as a payment's tax year). They found all 27 logged
mistakes. No check names a document id, a person or a line key; each is tested on an altered copy of the packet to
prove it can fire and can stay silent. The engine's own diagnostics are shown beside ours, labelled.
*Trade-off:* five of the fifteen families depend on wording in free text (repair or replacement, home office, health
coverage, the state wage split, the penalty method). They are generic in principle but would miss a document that phrases the fact differently. That tier is
where AI belongs (below).

**3. Roles are enforced on the server.** Ten people from the packet's firm and household, from preparer to IRS
examiner, each with their own view. Self-review is refused, a tax effect over 1,000 needs the partner, Marcus (no
sensitive-data clearance) sees last 4 digits and cannot reveal, clients see only their own items in plain words, and
every reveal is logged. Masking happens in the API, so a hidden number never reaches the browser.
*Trade-off:* a role switcher instead of logins, so a grader can see every view from one link.

**4. One story clock replays the season.** The packet's timeline (documents arriving, the e-file rejection,
acceptance, a letter years later) plays out as the clock moves. Each finding appears when its evidence arrives, the
return freezes at federal acceptance, and later changes become "amend on top". Notifications are derived from the same
events and the clock, never stored separately.
*Trade-off:* one clock per workspace, so two people cannot sit at different moments of the story at once.

**5. The finalized return is v3 plus our applied adjustments, not a recomputation.** We do not do tax law; each
change shows its tax effect estimated from the packet's own rates and is marked "not recomputed by the engine".
*Trade-off:* totals do not cascade; a real product would send the adjusted inputs back to the engine.

**6. Simulated source pages, built to be replaced.** Each document page is rendered from the packet's printed text,
with every extracted field boxed at its recorded position. A real PDF can replace the simulation behind the same
interface; the trace links already point to a document, page and position.

## Where AI fits

AI built this, and AI now reads the packet too, but never from the screen and never as the authority. An AI reader
(Claude Sonnet 5.5) runs at ingest, before the backend: it reads each document's free text with identifiers masked and
writes a fixed-schema payload of suggestions, each with a verbatim quote, its document and page, a 25-word reason and
an optional legal source from a vetted list. The backend treats that payload like any untrusted input: code checks
every quote is on its page, that it carries content, and that it does not rest only on a replaced document. What
passes appears on Checks with a small ✦ and "needs review"; it never blocks filing until a reviewer accepts it.

A harness scores the reader before it is trusted, blind (no known answer in any prompt, checked by searching every
request). Judged match by match by a second model, the reader found **13 of our 27 known mistakes (48%)**, half of the
wording-dependent ones, with every quote shown verified, at about $1.50 a run. It also made three confident mistakes
of its own, perfect quotes from a superseded 1099 with wrong conclusions, which a deterministic verifier rule now
holds back; and it found **one real mistake our own review had missed** (a 1,500 gift without the written
acknowledgment IRC 170(f)(8) requires). The automatic score said 17 of 27; the judged figure is the one we report.
Details and limits: `docs/handin/ai-scorecard.md`.

## How it was built

Spec first, then parallel build lanes against fixed contracts, test-driven (252 unit tests, 41 browser tests, run
against the live site too). Claude Opus 5.5 planned, coordinated and built; Claude Fable 5.1, a different model,
reviewed every round by running probes against the app rather than reading the diff. Every decision is logged with its
trade-off in `docs/decisions.md`, and every use of AI in `docs/ai-usage.md`.

## Designed, not built

Uploading a real file as evidence (notes are built), the examination response pack (the examiner already sees the
items under examination and the return as filed), the penalty and interest estimate, and sources on every tooltip
definition (the tax-law text in the app is reviewed, not yet cited line by line).
