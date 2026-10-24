# Recomputation and invariants: catching unanticipated errors in a rule-based tax computation

Research pass: 24 Oct 2026, about 20 search and fetch calls. Items marked "(prior knowledge, unverified this pass)" come from the researcher's background knowledge, not from a source fetched here. The report writer should either drop them or check them first.

## Q1. Open engines as an independent second computation: coverage, license, status, input, diffing, validation

### Takeaway
No open engine found here covers the whole case: federal 1040 with AMT plus California 540NR part-year with California AMT (Schedule P 540NR). OpenTaxSolver (2025 release, includes CA) and PolicyEngine-US (very active, AGPL, has household-level calculations) are the most plausible second computations. TAXSIM is dated for state law. Tax-Calculator is federal only. HabuTax is small and dormant. Direct File is archived. Whatever engine is used, the most valuable output is a line-by-line diff that names the lines it cannot compute; it does not have to agree on every value.

### Cited Findings
**OpenTaxSolver (OTS)**
- The 2025 tax-year release is version 23.06. It "includes updated State-Tax versions for OH, NC, NJ, NY, VA, PA, MA, AZ, CA, MI, OR" plus additional forms — [OTS download 2025](https://opentaxsolver.sourceforge.net/download2025.html); [OTS home](https://opentaxsolver.sourceforge.net/)
- Not confirmed: whether the CA module covers 540NR part-year returns or Schedule P (CA AMT) — same sources; the search results did not say.
- OTS has been used as the system under test in academic metamorphic testing, called through the TenForty Python package — [Tizpaz-Niari et al., arXiv 2205.04998](https://arxiv.org/abs/2205.04998v2)

**PolicyEngine-US**
- AGPL-3.0. It describes itself as "a microsimulation model of the US state and federal tax and benefit system". The repository has about 25,752 commits and 893 open issues. Direct `Microsimulation()` is deprecated in favour of policyengine.py, but this package "remains the home of the rules and household-level calculations". It supports Python 3.11–3.14, and install examples cite version 1.824.x — [policyengine-us GitHub](https://github.com/PolicyEngine/policyengine-us)
- It keeps a "source-conflict register", shared with the Axiom Foundation, that records how conflicts between statutes and agency materials were resolved — [policyengine-us GitHub](https://github.com/PolicyEngine/policyengine-us)
- Validation: a 2024 Manifold market on "will PolicyEngine pass TAXSIM35 validation" for state taxes under 2021 law resolved NO, with 16 states still in progress at one point. This is a prediction market, not a validation report, so treat it as weak evidence — [Manifold](https://manifold.markets/MaxGhenis/will-policyengine-pass-taxsim35-val)
- In Sep 2025, PolicyEngine and NBER signed an MOU to build an open-source TAXSIM emulator "fully compatible with Taxsim input and output files", with a planned validation dashboard — [PolicyEngine post](https://app.flashes.blue/profile/us.policyengine.org/post/3ly4fui4ouc27); [NBER TAXSIM](https://taxsim.nber.org/)
- Tax-Calculator's own repository now keeps its cross-model validation in a `pe_taxsim` folder, which suggests Tax-Calculator is validated against PolicyEngine's TAXSIM emulator — [Tax-Calculator taxsim35 README](https://github.com/PSLmodels/Tax-Calculator/blob/master/taxcalc/validation/taxsim35/README.md)

**NBER TAXSIM**
- Version 35 is still listed as active. Federal law is coded through 2023 and state law through 2018; state law for 2021–2023 is "an estimate based on inflated 2020 law". There is an open beta coded through 2024 law. PolicyEngine is building the successor "with my cooperation" — [NBER TAXSIM page](https://taxsim.nber.org/); [TAXSIM35](https://taxsim.nber.org/taxsim35)
- Implication for this return: TAXSIM cannot be an authoritative check of 2025 California law (its state law is dated) — same source.

**PSL Tax-Calculator**
- Validation method against TAXSIM-35: 100,000 random filing units per year, each run through both models. "Same" means federal income tax and payroll tax differ by no more than one cent. Known larger differences arise from SECA tax, the 2020 Recovery Rebate Credit and Economic Impact Payments, the 2021 Child Tax Credit, and itemized deductions. "Differences are generally small." This validation is no longer maintained (it is historical) — [Tax-Calculator taxsim35 README](https://github.com/PSLmodels/Tax-Calculator/blob/master/taxcalc/validation/taxsim35/README.md)
- The README is internally inconsistent: one parenthetical says 1,000 units and another says 100,000 — same source.

**HabuTax**
- A Python package for US personal income tax with an INI input file, run as `habutax solve` per year and form (examples cover the 1040 for 2021 and 2022). Its design rule is that unimplemented forms or calculations raise an error instead of producing a silently wrong return. The latest release seen is 0.2.0 — [HabuTax on PyPI](https://pypi.org/project/habutax/)
- The fail-loudly rule is exactly the generic defence against the CA AMT miss: an unimplemented computation is an error, never a zero — same source.

**IRS Direct File / Fact Graph**
- The direct-file repository is archived: "no longer maintained", "may contain unpatched or unknown vulnerabilities", "should not be used in production" — [IRS-Public/direct-file](https://github.com/IRS-Public/direct-file)
- The Fact Graph now lives in its own repository, IRS-Public/fact-graph, described as "a production-ready knowledge graph for modeling, among other things, the United States Internal Revenue Code". It is usable from JavaScript and any JVM language, the repo says it is "updated frequently", and it is at v3.1 with an ADR at docs/fact-graph-3.1-adr.md — [IRS-Public/fact-graph](https://github.com/IRS-Public/fact-graph)
- The Fact Graph had over 2,500 facts (this figure may be dated) — [Digital Government Hub FormFest recap](https://digitalgovernmenthub.org/publications/formfest-2024-recap-how-irs-direct-file-demystified-tax-forms-and-built-trust/)
- Code for America keeps a separate `fact_graph` repository — [codeforamerica/fact_graph](https://github.com/codeforamerica/fact_graph) (contents not examined)
- A Hacker News commenter says Direct File was cancelled in 2025. This is secondhand and unverified — [HN](https://news.ycombinator.com/item?id=45599567)

**Catala / Mlang (France)**
- Catala (Merigoux, Chataing, Protzenko; ICFP 2021) is a language for translating statutes into executable code using "general case plus exceptions". Its core compilation steps are proven correct in F*. The paper's case studies are US IRC §121 and French family benefits, and the work uncovered a bug in the official implementation of the French benefits — [arXiv 2103.03198](https://arxiv.org/abs/2103.03198v2); [ICFP 2021](https://icfp21.sigplan.org/details/icfp-2021-papers/16/Catala-A-Programming-Language-for-the-Law)
- Mlang is a reimplementation of the DGFiP's 1990-era M-language income-tax compiler. It is "thoroughly validated against the private DGFiP test suite", and the DGFiP is "officially transitioning to Mlang" for production — [MSR: A Modern Compiler for the French Tax Code](https://www.microsoft.com/en-us/research/?p=725464)
- Earlier formal work gave M a mechanized semantics and an OCaml interpreter, and prototyped encoding the computation in the Z3 SMT solver — [HAL 02320347](https://hal.archives-ouvertes.fr/hal-02320347)
- Not found: any Catala implementation of the US 1040 or California 540NR usable as a second engine.

### Inferences
- **Recommended second computation for this project:** PolicyEngine-US at household level for federal AGI, taxable income, regular tax and AMT, and the California lines it models. Use OTS as a second opinion on CA. Diff each engine output against the matching workpaper line key. Any workpaper line with no counterpart in the second engine goes into a "not independently checked" list, never into "agrees".
- **Mapping work:** each engine has its own vocabulary (PolicyEngine variables in situation JSON; OTS line-labelled text input; TAXSIM's numbered input fields). The adapter is a fact-to-variable map. Every unmapped input fact is itself a finding: "this input reaches no engine".
- (Prior knowledge, unverified this pass) Tax-Calculator is CC0, federal only, and includes AMT. OpenFisca is a France-originated, AGPL Python framework on which PolicyEngine was originally built. Neither covers CA 540NR.
- On a part-year CA return with an ISO exercise, the second engine will often be unable to model the item (CA AMT on Schedule P 540NR uses California-source adjustments). That outcome is still useful: "engine B cannot compute this line" is a deterministic flag that a human must look.

### Gaps
- Whether PolicyEngine-US models California AMT (Schedule P 540NR) and part-year residency: a search for `ca_amt` returned nothing. Check the repository's `parameters/gov/states/ca` and `variables/gov/states/ca` trees.
- Whether the OTS CA module handles 540NR and Schedule P.
- PolicyEngine's current TAXSIM match rates: no published dashboard was found.
- Licenses of Direct File and the Fact Graph: the pages link a LICENSE file without naming the type. (Prior knowledge, unverified: CC0 or public domain, as US-government work.)
- Validation of any engine against IRS ATS (Assurance Testing System) scenarios: no source found.

## Q2. How the Direct File Fact Graph represents incomplete or uncomputed facts, and how it ensures every value is derived or provided

### Takeaway
The Fact Graph is a DAG of two kinds of fact: Writable (user-entered) and Derived (computed). Every value is wrapped in a Result that is either complete or incomplete. An unanswered input yields an explicit "missing" or incomplete result, never a silent 0. A Placeholder default lets downstream math run, but everything that depends on it stays marked incomplete. The CA AMT miss (a line held at 0) is exactly what this design forbids: a line with no derivation and no provided value would surface as incomplete.

### Cited Findings
- "A Fact Graph is a declarative way of applying a complex set of rules, like tax law, to partial information entered by a user. A Fact Graph is a DAG, just like Excel." — [Fact Graph tutorial 01](https://github.com/IRS-Public/direct-file/blob/main/direct-file/fact-graph-scala/shared/src/main/scala/_tutorial/01_introduction.worksheet.sc)
- "Lines 12a and 12b are Writable Facts. Each of these Facts stores a user-entered value"; "Line 12c is a Derived Fact. It adds lines 12a and 12b." Values are wrapped in a Result marked "complete" — [tutorial 01](https://github.com/IRS-Public/direct-file/blob/main/direct-file/fact-graph-scala/shared/src/main/scala/_tutorial/01_introduction.worksheet.sc)
- When an input is unknown, the system "default[s] to reporting that the value of the result is missing" and the result is "marked as incomplete" — [tutorial 02 (completeness)](https://github.com/IRS-Public/direct-file/blob/main/direct-file/fact-graph-scala/shared/src/main/scala/_tutorial/02_completeness.worksheet.sc)
- With a Placeholder tag, "the conclusion is still incomplete", but a concrete value is returned. Other facts computed from it "would also be marked as incomplete if they rely on the placeholder value" — [tutorial 02](https://github.com/IRS-Public/direct-file/blob/main/direct-file/fact-graph-scala/shared/src/main/scala/_tutorial/02_completeness.worksheet.sc)
- Completeness can be settled without every input: if B is false, the All operation's result is complete even though C is missing. For credits it is "far better to assume the taxpayer is ineligible until we can conclusively prove their eligibility" — [tutorial 02](https://github.com/IRS-Public/direct-file/blob/main/direct-file/fact-graph-scala/shared/src/main/scala/_tutorial/02_completeness.worksheet.sc)
- A community fork issue documents the failure mode: a `<False/>` value can still be incomplete. `All` short-circuits to Complete(false) only on a complete-false operand, otherwise it is Incomplete. The issue argues that screener (knockout) facts should not default to Placeholder false, because that "silently passes" — [jz4396/direct-file issue #186](https://github.com/jz4396/direct-file/issues/186) (a fork, not the official repo)
- The graph's nodes and relationships tell Direct File what it still needs to know, so taxpayers are asked only relevant questions — [Digital Government Hub](https://digitalgovernmenthub.org/publications/formfest-2024-recap-how-irs-direct-file-demystified-tax-forms-and-built-trust/)

### Inferences
- How this maps to the workpaper: give each line a status of `complete | placeholder | incomplete | not_computed`, plus the value. A rule whose text says "the engine does not compute X" must emit `not_computed`, not `0`. Approval is then blocked whenever any line on the filed path is not `complete`. (The repo's latest commit, CHK-LINE-NOT-COMPUTED, implements a version of this.)
- "Every value is derived or provided" comes from the type system, not from a check. A fact is either Writable or Derived with a defined expression, and the DAG has no third kind. The workpaper's equivalent is a schema rule: every line has either `inputs+rule` or `source document field`; a line with neither is invalid at load time.
- The issue #186 lesson carries over: placeholder defaults (0 or false) are where silent passes hide. Track them as placeholders, not as values.

### Gaps
- The exact Scala types (e.g. `Result.Complete`, `Result.Placeholder`, `Result.Incomplete`) were not read from source. The Fact Graph 3.1 ADR was not fetched.
- Whether the Fact Graph statically detects writable facts that feed no derived output ("dead inputs"): not found.

## Q3. Documented dual computation and reconciliation in finance and government, and what fraction of errors it catches

### Takeaway
The IRS's own math-error program is the largest documented "recompute the taxpayer's arithmetic" check: millions of corrections a year under IRC §6213(b). No source found here gives a catch-rate fraction for dual computation. The strongest quantitative evidence is negative: independently written versions fail together far more often than independence predicts (Knight and Leveson 1986, replicated with AI coding agents in 2026). A second engine therefore cannot be assumed to catch errors in the hard parts of the law, and those hard parts are where both engines tend to fail.

### Cited Findings
- Math-error authority is IRC §6213(b), a summary assessment. If no abatement request is made within 60 days, the assessment becomes final and Tax Court review is generally lost — [NTA Purple Book 2025 (ARC24)](https://taxpayeradvocate.irs.gov/wp-content/uploads/2024/12/ARC24_PurpleBook_03_ImproveAssmtCollect.pdf)
- Volume: at least 9.4 million math-error notices in the 2022 filing season (per the NTA). The FY2023 Data Book shows 2.7 million math errors and 2.2 million notices — [The Hill](https://digital-release.thehill.com/?p=4602429). The IRS publishes Data Book Table 25, "Math errors on individual income tax returns by type of error" — [IRS SOI Table 25](https://www.irs.gov/zh-hans/statistics/soi-tax-stats-math-errors-on-individual-income-tax-returns-by-type-of-error-irs-data-book-table-25)
- Criticism: notices are often vague, and some list possible errors without saying which one applied. The proposed IRS MATH Act would require notices to name the changed line and the reason — [NTA blog](https://www.taxpayeradvocate.irs.gov/news/nta-blog-math-error-part-i); [Sen. Cassidy release](https://www.cassidy.senate.gov/?p=35347)
- N-version programming: 27 independently written versions from one specification were run on 1 million tests. Coincident failures were "substantially more than expected" under independence, because programmers made similar mistakes on the same hard parts of the problem — [Knight & Leveson 1986 (MIT copy)](https://dspace.mit.edu/server/api/core/bitstreams/1331578f-65c1-4665-a0be-1bc3cdc001d5/content); [UVA tech report](https://libraopen.lib.virginia.edu/public_view/jd472w463); [reply to critics](https://www.cs.washington.edu/homes/leveson/critics.pdf)
- A 2026 preprint reran the protocol with AI coding agents and found "substantial common-mode failure", in line with Knight and Leveson — [arXiv 2606.20158](https://arxiv.org/pdf/2606.20158) (single preprint, not verified further)
- Tax-model cross-validation in practice: Tax-Calculator against TAXSIM at one-cent tolerance on 100,000 random units, with residual differences concentrated in specific provisions (SECA, recovery rebate, CTC 2021, itemized deductions) — [Tax-Calculator README](https://github.com/PSLmodels/Tax-Calculator/blob/master/taxcalc/validation/taxsim35/README.md)
- Mlang was validated against the DGFiP's private test suite before production adoption, a case of a reimplementation used as a second computation of a national tax — [MSR](https://www.microsoft.com/en-us/research/?p=725464)
- Catala's formalisation surfaced a bug in France's official family-benefits implementation — [arXiv 2103.03198](https://arxiv.org/abs/2103.03198v2)

### Inferences
- Common-mode failure suggests two practical rules. First, the second computation should be written from a different source (the form instructions, not the engine's rule text). Second, it should be compared on structure (which lines exist and are computed), not only on values.
- The math-error program recomputes arithmetic only, so it would not have caught CA AMT = 0. A held-at-0 line is arithmetically consistent.

### Gaps
- The fraction of errors caught by payroll parallel runs, actuarial independent valuations (e.g. ASOP reviews), or shadow accounting: no sourced figures were found in this pass.
- Breakdown of math errors by type (Table 25 contents): not opened.

## Q4. Generic verification techniques, and which would catch "a line never computed" and "an input that feeds no output"

### Takeaway
Two generic, deterministic checks catch both failure classes with no knowledge of CA AMT. (a) **Default-deny coverage / proof obligation:** every line on the filed path must be `complete` with a derivation, and any `not_computed`, placeholder, or rule text admitting non-computation blocks approval. (b) **Input reachability (dead-input analysis on the dependency DAG):** every non-zero input fact must reach at least one filed line; the ISO adjustment of 40,000 reaching federal AMT but no CA line is flagged. Metamorphic testing is a strong third: "raise the ISO adjustment by Δ; CA AMT (or CA tax) must not decrease, and must change if the return is in scope". A line held at 0 fails it. A second engine helps mainly by having a different coverage set.

### Cited Findings
- Metamorphic testing of tax software: relations derived from IRS publications (Form 1040, Pub 596 EIC, Schedule 8812, Form 8863) on the premise that similar taxpayers get similar outcomes. This supplies oracles where no explicit specification exists. Applied to OpenTaxSolver, it found non-robust behaviour near zero tax and "missing eligibility conditions in the updated versions" — [Tizpaz-Niari et al., arXiv 2205.04998 / ICSE-SEIS 2023](https://arxiv.org/abs/2205.04998v2); [ICSE 2023](https://conf.researchr.org/details/icse-2023/icse-2023-SEIS/11/Metamorphic-Testing-and-Debugging-of-Tax-Preparation-Software)
- Follow-up work studies the limits of using few-shot LLM prompting to generate metamorphic specifications from IRS text — [NSF PAR 10547718](https://par.nsf.gov/biblio/10547718-potential-limitations-few-shot-context-learning-generate-metamorphic-specifications-tax-preparation-software)
- "Metamorphic debugging for accountable software" extends this with explanations of failures — [review summary](https://www.themoonlight.io/en/review/metamorphic-debugging-for-accountable-software) (secondary summary)
- Fail-loudly on unimplemented calculations (HabuTax) — [PyPI](https://pypi.org/project/habutax/)
- Explicit incompleteness propagation (Fact Graph) — [tutorial 02](https://github.com/IRS-Public/direct-file/blob/main/direct-file/fact-graph-scala/shared/src/main/scala/_tutorial/02_completeness.worksheet.sc)
- Independent recomputation shares failures on hard parts (N-version) — [Knight & Leveson](https://dspace.mit.edu/server/api/core/bitstreams/1331578f-65c1-4665-a0be-1bc3cdc001d5/content)

### Inferences (technique against failure class)
| Technique | "Line never computed" (CA AMT held at 0) | "Input feeds no output" (ISO 40,000 reaches no CA line) | Notes |
|---|---|---|---|
| Default-deny coverage / proof obligation (each line carries rule + inputs + status) | **Catches** if status is `not_computed`, or if a rule text or constant-0-without-inputs pattern is denied | No | Cheapest, fully generic |
| Input reachability on the dependency DAG (dead-input check) | Indirectly | **Catches**: a non-zero fact with zero in-scope consumers | Needs a jurisdiction-aware "should reach" map (e.g. AMT adjustments must reach a CA AMT line when CA residency > 0) |
| Metamorphic / property-based (perturb input, assert monotone or non-zero effect) | **Catches**: ∂(CA AMT)/∂(ISO adj) = 0 | **Catches** | Needs relations written from form instructions |
| Invariants / conservation (Σ sourced = total; resident + nonresident portions = whole; federal-to-CA adjustments balance) | Partially: only if a CA AMT invariant exists | Partially: "every federal AMT adjustment has a CA disposition (conform / adjust / not applicable)" works like double entry | Double-entry framing: every input must be "posted" somewhere |
| Dual computation (second engine) | Catches **only if** engine B computes CA AMT; otherwise reports "uncomputable", which still flags it | Only via engine B's own coverage | Common-mode risk on hard provisions |
| Math-error-style arithmetic recompute | **Misses**: 0 is arithmetically consistent | Misses | |
| Known-mistake checks (current app) | Misses unless anticipated | Misses unless anticipated | Shows why a generic layer is needed |

- (Prior knowledge, unverified this pass) Assurance cases (GSN, the Goal Structuring Notation) and safety cases formalise "every claim needs supporting evidence". Applied here, each filed line is a claim that needs a derivation as its evidence, and unsupported claims block sign-off. Code coverage in the default-deny sense (every rule must execute or be explicitly marked not applicable for this return) is the analogue in tests.
- Recommended layer (most to least value): (1) `not_computed` status plus approval block (done: CHK-LINE-NOT-COMPUTED); (2) dead-input check with a per-jurisdiction disposition requirement for every federal adjustment; (3) a small set of metamorphic relations (monotonicity of tax in income and in AMT preference items; part-year proration bounds); (4) a PolicyEngine or OTS diff that reports both value mismatches and lines the engine could not compute.

### Gaps
- No sourced study measures catch rates for dead-input or coverage checks in tax or finance engines.
- Sourced material on assurance cases and default-deny proof obligations was not gathered in this pass.
