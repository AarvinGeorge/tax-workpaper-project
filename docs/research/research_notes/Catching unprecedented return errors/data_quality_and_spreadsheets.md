# Generic, structure-driven error detection: data-quality tools, spreadsheet auditors, lineage

Scope: techniques that find errors nobody wrote a specific test for, mapped to a return-as-lines model (line = key, value, rule id, input line keys, source extracted values). Motivating miss: a state AMT line whose rule says "the engine does not compute this", held at 0 while its input line was 40,000.

Research was done 24 Oct 2026. Tool-call budget was limited, so coverage is uneven. What was not reached is listed under Gaps.

## Data quality / observability: which checks are generic or auto-generated, and how does profiling suggest them?

### Takeaway
Data-quality tools make checks generic in three ways:
- **Fixed per-column test types** applied by declaration (dbt's four generic tests).
- **Profiling heuristics** that propose constraints from observed data (Deequ's rule classes: completeness, non-negativity, categorical range, uniqueness, type retention).
- **Learned thresholds on per-field metrics over history** (Monte Carlo Null % and Unique %; Soda's Prophet-based anomaly detection).

None of them reasons about a computation's own declared semantics. They assume the observed data is correct and flag departures from it. That limits them for a single return with no history, though they suggest strong analogues.

### Cited Findings
- **dbt generic tests.** dbt ships four: `unique`, `not_null`, `accepted_values`, `relationships`. The last is referential integrity: each value must exist in another model's column. A generic test is a parameterised SQL query defined in a `{% test %}` block and attached by YAML to any model, column, source, seed or snapshot. It passes when the query returns zero rows. `severity` (warn/error) and `warn_if`/`error_if` thresholds such as `">10"` control escalation. — [dbt docs: data tests](https://docs.getdbt.com/docs/build/data-tests)
- **dbt model contracts.** The fetched page did not cover contracts. The summariser's general statement that contracts (`contract: enforced: true`) check declared columns, types and constraints at build time is unverified. — [dbt docs: data tests](https://docs.getdbt.com/docs/build/data-tests)
- **Deequ constraint-suggestion rule classes.** The repo directory lists: `CategoricalRangeRule`, `CompleteIfCompleteRule`, `FractionalCategoricalRangeRule`, `HasMax`, `HasMaxLength`, `HasMean`, `HasMin`, `HasMinLength`, `HasStandardDeviation`, `NonNegativeNumbersRule`, `RetainCompletenessRule`, `RetainTypeRule`, `UniqueIfApproximatelyUniqueRule`, plus an `interval` subfolder. — [awslabs/deequ suggestions/rules](https://github.com/awslabs/deequ/tree/master/src/main/scala/com/amazon/deequ/suggestions/rules)
- **Deequ example output.** A column with no observed negatives gets `isNonNegative`. A partly-missing column gets a completeness floor (e.g. ≥0.53). Low-cardinality string columns get `isContainedIn(observed values)`. Fully populated columns get `isComplete`. `RetainCompletenessRule` can take an interval strategy such as `WilsonScoreIntervalStrategy()`. — [Deequ constraint suggestion example](https://github.com/awslabs/deequ/blob/master/src/main/scala/com/amazon/deequ/examples/constraint_suggestion_example.md)
- **Deequ validates its own suggestions.** `useTrainTestSplitWithTestsetRatio(0.1)` derives suggestions on 90% of the data and checks them on the held-out 10%. The docs warn that suggestions "assume the data is static and correct" and must be reviewed by a person. — [Deequ constraint suggestion example](https://github.com/awslabs/deequ/blob/master/src/main/scala/com/amazon/deequ/examples/constraint_suggestion_example.md); also [Velotio blog](https://www.velotio.com/engineering-blog/test-data-quality-at-scale-using-deequ-and-apache-spark): the algorithm "just works on the data distribution".
- **Deequ's three pillars.** Automatic constraint suggestion, anomaly detection on data-quality metrics over time, and a `MetricsRepository` that persists computed metrics. — [awslabs/deequ README](https://github.com/awslabs/deequ)
- **Monte Carlo metric monitors.** They support ML (automated) thresholds, built quickly by backfilling history, and "All supported fields" mode allows only automated thresholds. The two metrics named on the page are Null (%) and Unique (%). Their thresholds are "optimized for the extremes": a column that never has nulls gets a very sensitive threshold, and a volatile column a looser one. — [Monte Carlo docs: metric monitors](https://docs.getmontecarlo.com/docs/metric-monitors)
- **Soda anomaly detection.**
  - Applies to numeric, freshness, missing, validity and user-defined metrics, e.g. `anomaly detection for row_count` and `anomaly detection for avg(order_price)`.
  - Needs at least 4 measurements at a regular cadence; until then the check returns `[NOT EVALUATED]`. It uses the last 1000 measurements by default.
  - The model is Facebook Prophet, which flags values outside the predicted interval. `auto_exclude_anomalies` keeps anomalies out of future training.
  - The page says this check is being deprecated in favour of a rebuilt version.
  — [Soda docs: anomaly detection](https://docs.soda.io/soda-cl/anomaly-detection.html)

### Inferences
- **Map each tool family to the return model:**
  - dbt `not_null` / Deequ `isComplete` → "every line that has nonzero inputs has a computed (non-null, non-placeholder) value".
  - dbt `relationships` → "every `input line key` resolves to an existing line, and every source extracted value resolves to a document field".
  - Deequ `isNonNegative` / `HasMin` → sign constraints per line type (tax lines ≥ 0).
  - `accepted_values` → the rule id must be in the set of implemented rules. A "not computed" rule id is outside that set, so it fails.
- **Monte Carlo's "optimized for the extremes" idea transfers directly.** A line that is nonzero in every prior year or comparable return should alarm sharply when it is 0. The analogue of history here is the packet's prior years and the three computed versions.
- **Soda's `[NOT EVALUATED]` is the right pattern for "this check could not run".** It is an explicit third state rather than a silent pass. This matches the CLAUDE.md rule "a zero must be proven possible to be non-zero". The AMT miss is the computation-side version of the same failure: a line that could not be computed reported 0 instead of NOT EVALUATED.
- **The most direct generic catch for the AMT class is a value-vs-provenance contract:** value = 0 AND at least one input ≠ 0 AND the rule is a stub/unimplemented → error. That is a dbt-style generic test over the line table, needing no tax knowledge.

### Gaps
- **Not fetched:** Great Expectations (profilers, Data Assistants, auto-generated Expectation Suites), Anomalo (unsupervised ML table checks), and Bigeye (autometrics, autothresholds). No sourced claims on these.
- **Monte Carlo's full field-metric catalogue** (zero rate, negative rate and so on) is on its "available metrics" page, which was not read.
- **dbt contracts** are not verified from primary docs.
- **No source found** giving quantitative evidence of what share of real incidents these generic checks catch.
- **The Deequ VLDB 2018 paper** (Schelter et al., "Automating large-scale data quality verification") was not fetched.

## Spreadsheet verification: which structural checks find unanticipated errors, and what is each one's return-as-lines analogue?

### Takeaway
Spreadsheet auditors find unanticipated errors through structure:
- hard-coded constants inside formulas;
- formulas overwritten with values;
- references to empty cells;
- cells with no dependents (and inputs no one uses);
- inconsistent or "distinct" formulas across a row;
- error values;
- hidden content;
- smells such as long calculation chains and duplicated formulas.

Field evidence:
- Errors are near-universal: around 1–5% of formulas, and most audited sheets contain at least one.
- The better tools found about 80% of seeded errors in a 2000s test, versus 47% for Excel's built-in auditing.

### Cited Findings
- **PerfectXL Risk Finder categories:**
  - references to empty cells;
  - hard-coded numbers in formulas;
  - circular references;
  - Excel error values including #REF!;
  - hidden information (sheets, rows, names);
  - external links;
  - error-prone functions;
  - structural weaknesses.

  Findings are graded risk / weakness / observation. — [PerfectXL Risk Finder](https://www.perfectxl.com/products/perfectxl-risk-finder/)
- **PerfectXL's auditor study.** Hermans et al. (EuSpRIG 2015) interviewed auditors about PerfectXL. They found the visualisation useful and the risk feature less so. — [arXiv 1603.02261](https://arxiv.org/pdf/1603.02261), summarised via search; full text not read.
- **Nixon & O'Hara, "Spreadsheet Auditing Software" (University of Salford; EuSpRIG proceedings, 2000s, older material).**
  - They tested Excel built-in auditing, The Spreadsheet Detective, Operis Analysis Kit (OAK), SpACE and The Excel Auditor against a sheet with seeded errors.
  - Scores: SpACE 43 (84%), Spreadsheet Detective 41 (80%), OAK 33 (65%), Excel built-ins 24 (47%), Excel Auditor 14 (27%).
  - Cell-by-cell team inspection is cited as the best manual method, at about 80%.
  — [arXiv 1001.4293](https://arxiv.org/pdf/1001.4293)
- **How those tools found things (same paper):**
  - **Two approaches.** OAK-style tools search "for particular types of cells that are more likely to be problematic, such as those with no dependents or those with formula containing hardwired constants". They also map formula schema ("distinct formula" in OAK) on a worksheet overlay.
  - **Formulas overwritten with values.** All four seeded cases were "easily identified" using the overlay.
  - **Column sum that includes subtotals.** Passed by Detective, OAK and SpACE "by highlighting the cell as a prospective error due to the fact that it contained blank cells".
  - **Broken link to the bottom line.** SpACE's "failure to establish a link between the source data and the bottom line cell … prompted further investigation that subsequently detected the error".
  - **What worked best.** The most successful tools combined "Schema Identification, Visual Methods, Search for/Report on" problem cells. Tools "do not detect and correct errors, they merely point the user in the right direction". Tools did worse on some qualitative errors, e.g. "presentation illogical".
  — [arXiv 1001.4293](https://arxiv.org/pdf/1001.4293)
- **OAK5.** Marketing describes a Search tool "to identify cells not aligned with the best modelling practices" and pruning calculations "not on the active path of a formula". — [Operis OAK5 launch](https://www.operis.com/operis-launch-oak5-the-latest-version-of-the-worlds-favourite-financial-modelling-software/) (vendor page)
- **ICAEW on unused inputs.** An unreferenced input "is not necessarily an error, but it does beg the question 'why is it there?'". It recommends Trace Dependents on every input. — [ICAEW: How to review a spreadsheet, Part 4 (2022)](https://www.icaew.com/technical/technology/excel-community/excel-community-articles/2022/how-to-review-a-spreadsheet-part-4), via search snippet; the article body was not retrieved.
- **EuSpRIG 2013 audit framework.** A summary-report category "Unused Input Cells", noting that items of interest include "things you would not expect to find". — [arXiv 1401.7586](https://web3.arxiv.org/pdf/1401.7586), via search snippet.
- **Hermans, Pinzger, van Deursen, "Detecting Code Smells in Spreadsheet Formulas" (ICSM 2012).**
  - Five smells: Multiple Operations, Multiple References, Conditional Complexity, Long Calculation Chain, Duplicated Formula.
  - Thresholds were set at the 70/80/90% points of the EUSES corpus.
  - In 10 real spreadsheets, Duplicated Formula revealed two actual faults in one sheet. The other smells mainly flagged hard-to-maintain formulas.
  — [felienne.com](https://www.felienne.com/archives/394)
- **Hermans et al., "Detecting and Visualizing Inter-Worksheet Smells in Spreadsheets" (ICSE 2012, pp. 441–451).** Adapts Fowler's smells to worksheet dependencies, e.g. "middle man" worksheets, shows them on dataflow diagrams, sets thresholds from the EUSES corpus, and is built into the Breviz toolkit. — [TU Delft research portal](https://research.tudelft.nl/en/publications/detecting-and-visualizing-inter-worksheet-smells-in-spreadsheets/); [slides](https://www.slideshare.net/slideshow/detecting-and-visualizing-interworksheet-smells-in-spreadsheets/13236793)
- **Panko's error rates (older material, 1990s–2000s):**
  - Developers leave uncorrected errors in about 2–5% of formulas, from lab and field studies. — [Panko, arXiv 0801.1514](https://arxiv.org/pdf/0801.1514.pdf)
  - Lab mean cell error rate: 5.5% for general business students working alone, 3.1% for accounting/finance students. — [Panko 1996](https://mirkwood.cs.edinboro.edu/~bennett/class/dsci201/spring2019/hw/activity/Panko96.pdf)
  - Recent audits found errors in 49 of 54 spreadsheets (91%). — [Computerworld](https://www.computerworld.com/article/1704893/sidebar-oops.html)
  - The 5.2% average cell error rate across 7 audits and the Coopers & Lybrand "90% of >150-row sheets" figure come only from a vendor blog. They are unverified. — [SpreadsheetWeb](https://spreadsheetweb.com/how-to-mitigate-spreadsheet-errors/)
- **Other tool evaluations.** Powell, Baker & Lawson (2008) tested XL Analyst and Spreadsheet Professional. They found high false-positive and false-negative rates, but tools still beat unaided auditing. — via search summary of [Tuck/Dartmouth Auditing paper](https://faculty.tuck.dartmouth.edu/images/uploads/faculty/serp/Auditing.pdf); full text not read.

### Inferences (mapping to a return-as-lines model)

| Spreadsheet check | Return-as-lines analogue | Would it catch the AMT miss? |
|---|---|---|
| Formula overwritten with a value / constant where a formula is expected | A line whose value does not depend on its inputs: constant output while an input is nonzero, or a rule id flagged stub / "not computed" | **Yes.** This is the direct analogue. |
| Hard-coded number in a formula | A rule with a literal amount that is not a published tax constant (limit, rate, phase-out) with a cited source | Partly |
| Reference to an empty cell | An input key that resolves to a missing or null line, or a source value with no document field | No; this line's input was present |
| Cell with no dependents / unused input | A source extracted value or computed line that feeds no line on the path to tax or refund (orphan) | No; finds a different class |
| Source not linked to the bottom line (SpACE) | A nonzero input whose influence on the final liability is cut off. Here 40,000 entered AMT and stopped. | **Yes.** "Nonzero input, zero marginal effect" |
| Distinct / inconsistent formula across a row | The same rule id computed differently across return versions or across federal and state twins (federal AMT computed, state AMT not) | Likely: the federal/state asymmetry |
| Error values (#REF!, #N/A) | A rule result of NaN, undefined or "unsupported" that the display turns into 0 | **Yes**, if "not computed" is an explicit error value instead of 0 |
| Hidden content | Lines or values not rendered in any view or role | No |
| Long calculation chain / duplicated formula (Hermans) | Deep dependency chains, and duplicated rule logic across lines (a source of drift) | No; maintainability signal |

- **The AMT miss is the spreadsheet "formula overwritten with a value" smell.** OAK and Detective caught it "easily" in the seeded test. It is detectable from structure alone: a nonzero input with a constant output, or a rule declared unimplemented.
- **Panko's 2–5% per-formula rate argues that unanticipated errors are expected, not exceptional,** in any hand-built calculation of a few hundred lines. That justifies generic structural checks alongside targeted ones.

### Gaps
- **PerfectXL.** Its full inspection library and its inconsistent-formula and unused-cell checks are not confirmed from its docs.
- **Microsoft Inquire.** The categories in its Workbook Analysis report are not retrieved; the support page with them returned 404.
- **Operis OAK.** Its current feature list beyond vendor marketing is not retrieved.
- **ExcelAnalyzer** is not researched.
- **The FAST standard's rules** (e.g. one formula per row, no hard-codes in calculations, separate inputs) are not fetched.
- **ICAEW Part 4** article body is not retrieved.
- **Original Panko audit tables** are not verified.

## Lineage and provenance tools: how do they flag broken or missing lineage?

### Takeaway
OpenLineage's column-lineage facet records, for each output column, its input fields and a typed transformation:
- **DIRECT** (IDENTITY / TRANSFORMATION / AGGREGATION);
- **INDIRECT** (JOIN / GROUP_BY / FILTER / SORT / WINDOW / CONDITIONAL).

The spec itself does not define how to represent or flag missing or broken lineage. Gap detection is left to whoever consumes the lineage.

### Cited Findings
- **Facet structure.** `columnLineage.fields` maps each output column to `inputFields`, each with namespace, dataset name, source field and a list of transformations. A dataset-level `dataset` list holds inputs that affect the whole output, e.g. sort keys. — [OpenLineage column lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- **Transformation properties.** Each transformation has `type`, `subtype`, `description` and `masking`.
  - `DIRECT` = the output value derives from the input.
  - `INDIRECT` = the input affects the output without being part of its value, e.g. a filter.
  - `masking` = the input was obfuscated (hashed, counted).
  — [OpenLineage column lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- **Legacy Spark default.** With `datasetLineageEnabled=False`, Spark links each output column to every source column through INDIRECT edges, "nearly a Cartesian product". This over-reports lineage. The page does not address undeterminable or partial lineage. — [OpenLineage column lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)

### Inferences
- **Typed edges for the line model.** Each `input line key` could carry a DIRECT/INDIRECT-style type: value-contributing versus gating (threshold, filing-status condition). A generic check then becomes "a line with a DIRECT input that is nonzero must not equal its zero-input value". The AMT line had a DIRECT input of 40,000 and a constant 0, so it fails without any tax knowledge.
- **Declared versus observed lineage.** Over-reported lineage (the Spark Cartesian case) is the opposite failure. Lineage that is declared but has no effect looks complete while carrying nothing. Declared lineage should be checked against observed influence, e.g. by perturbing the input and checking that the output moves. That is a deterministic structural test.

### Gaps
- **Lineage tools on missing lineage.** Not researched: how Marquez, DataHub, Atlan or dbt column-level lineage flag missing lineage (e.g. "unknown upstream" markers, lineage coverage metrics).
- **Influence or perturbation testing in data observability.** No source found on validating lineage by perturbation; the idea above is inference only.
