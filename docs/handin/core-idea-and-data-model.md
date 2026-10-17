# Taxmark: the core idea and the data model

Deliverable 2, one page. Draft for Aarvin's review, 17 Oct 2026.

## The core idea

**Every number is a claim that carries its proof.** A workpaper exists to prove the return, so Taxmark makes each
number answer four questions in one click: where it came from (the source page and field), what was done to it (the
rule, and any change with who, why and the tax effect), who checked it (sign-offs bound to the value they signed), and
what is still open (findings, review notes, questions). Nothing is a cell to be ticked; everything is evidence that can
be followed, challenged and signed.

## The data model

Three inputs, one log, and views computed per person.

```
 PACKET (read-only)            AI PAYLOAD (read-only, untrusted)          EVENT LOG (append-only)
 documents, pages, values      suggestions with verbatim quotes,          adjustment, review_note, signoff,
 3 computed versions           tied to the packet's hash                  question, answer, verification,
 prior years, agency records         │                                    decision, reveal, clock_moved,
 firm staff and standards            ▼ verified by code                   suggestion_accepted, undo, reset ...
          │                    (quote on the page, vetted source,               │
          │                     not only from a replaced document)              │
          └───────────────┬─────────────┴──────────────────────┬────────────────┘
                          ▼                                    ▼
                CHECKS (deterministic)               PROJECTION for one role at one story time
                re-derive what should agree    ──►   claims, findings, blockers, sign-offs (fresh or stale),
                                                     finalized return, notifications, masking
                                                                       │
                                                                       ▼
                                                     SCREENS: Home, Return, Documents, Checks, Review,
                                                     Changes, Filing, Firm, Areas, Findings
```

- **Claim:** anything that can carry evidence and actions: a return line (`line:F540NR.72`), a document
  (`doc:D68`), a finding (`finding:…`) or the return as a whole.
- **Event:** who did what to which claim, when (wall time and story time), with a payload (new value and reason,
  note text, signed value, method of verification). Never edited or deleted; an undo or a reset is a new event.
- **Finding:** produced by a check (or a verified AI suggestion) with its evidence references, severity, tax effect
  and the time it becomes visible in the story.
- **Role:** from the packet's firm staff and client users, with clearance and the screens it may open; the server
  enforces every action and masks identifiers before anything reaches the browser.
- **Story clock:** one per workspace; everything after it is hidden, and the return freezes at federal acceptance.

## Why this model

- **The audit trail is the data, not a feature.** Because state is the packet plus the log, "who changed what and why"
  and "what did the return look like on 13 July" are queries, not extra code.
- **Real documents can replace simulated ones.** Every trace points to a document, page and position; a PDF behind
  the same address changes nothing upstream.
- **Untrusted inputs are treated alike.** The engine's numbers, the extraction's confidence and the AI's suggestions
  all have to prove themselves against the packet before a reviewer relies on them.
