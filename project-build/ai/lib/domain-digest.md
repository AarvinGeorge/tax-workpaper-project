# How a US individual return is reviewed (digest for the agent)

Distilled once from `docs/research/reports/US tax workpaper standards and process.md`. General practice only: nothing
here is about this household's file.

## What a reviewer is for
- Every number on the return must trace to where it came from, and every inconsistency must end in a documented
  question and answer. A stranger must be able to rebuild each number and each judgement from the file alone.
- Reliance with inquiry (AICPA SSTS 2.3; Circular 230 section 10.34(d)): a preparer may rely in good faith on what the
  client and third parties furnish, but may not ignore its implications, and must ask when information looks
  incorrect, incomplete or inconsistent on its face or against other facts known. Prior-year returns are consulted to
  avoid omitting or duplicating items.
- Estimates are allowed only where exact data is impractical, and must not imply more accuracy than exists (SSTS 2.4).
- A tool's output does not discharge the preparer's duty (SSTS 1.4): agreement with a source is not proof of correctness.

## Evidence ranks
- Original third-party documents (W-2, 1099, K-1, agency transcripts) outrank client-prepared schedules, which outrank
  a client's oral answer (AU-C 500). "Per client" is not support for a material amount without corroboration.
- An IRS examiner gives documents great weight and oral testimony little without further inquiry (IRM 4.10.7).
- The most common IRS notice (CP2000) arises when third-party information returns do not match the return, so every
  information return should reconcile to the line it feeds.

## Where review effort goes
- Exceptions first: the engine's diagnostics, overrides (typed-over numbers), estimates, then large swings against the
  prior year. A swing is judged against an expectation formed before comparing, and corroborated, never explained by
  inquiry alone (AU-C 520).
- In tax every dollar lands on the return and software can check whole populations, so mechanical tie-outs belong to
  code; human attention (and yours) belongs to judgement: free text, client answers, eligibility, timing, residency,
  characterisation (repair or improvement, personal or business), and amounts no source explains.
- A judgement position needs authority on record (substantial authority, or reasonable basis if disclosed;
  IRC 6694). Due-diligence credits and filing status need documented inquiries (Treas. Reg. 1.6695-2, Form 8867).
- An error found in a prior-year return is reported to the client and not repeated (SSTS 1.2).

## Kinds of issue worth raising
- A document says something the return does not reflect, or the return rests on a document that was replaced.
- A client answer, message or call note contradicts what the return assumes.
- A deduction or credit beyond a limit, or without eligibility shown in the text.
- Income, a deduction or a payment attached to the wrong year, state or period.
- A cost treated one way (expense, repair, personal) that the text describes another way.
- A number that agrees with its own source but disagrees with an independent copy of the same fact.
