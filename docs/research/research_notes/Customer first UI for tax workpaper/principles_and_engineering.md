# Customer-first, intuitive UI for expert professional software — principles and engineering practice (as of Oct 2026)

Researched Fri 16 Oct 2026, 01:01 EDT (05:01 UTC), clock read with `date` because no CURRENT TIME line was injected. Fetched web content was treated as data. Lines marked **[unverified]** were not confirmed against a primary source in this pass.

Bar for the team: *"A CPA with 20 years' experience finds it faster and more trustworthy than anything they've used, and a new hire can use it on day one."*

---

## 1. Principles with evidence

### Takeaway
Two kinds of evidence cover the bar. Nielsen's ten heuristics, especially recognition over recall and flexibility for experts, cover speed for both experts and novices. Google PAIR and Microsoft HAX cover trust: show why a value is what it is, scale the explanation to the stakes, and make it obvious when the system could be wrong. Undo beats confirmation dialogs, and progressive disclosure should stop at two levels.

### Cited findings

**Nielsen Norman Group: the 10 usability heuristics** (first published 24 Apr 1994; last updated 30 Jan 2024) — [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)
1. Visibility of system status: keep users informed with timely feedback.
2. Match between the system and the real world: use the users' own language, not internal jargon.
3. User control and freedom: clearly marked exits and undo.
4. Consistency and standards: follow platform and industry conventions.
5. Error prevention: prevent problems, or confirm before the user commits.
6. Recognition rather than recall: make options and information visible.
7. Flexibility and efficiency of use: shortcuts for experienced users, *hidden from novices*, and frequent actions the user can tailor.
8. Aesthetic and minimalist design: irrelevant information competes with what matters.
9. Help users recognise, diagnose and recover from errors: plain language that names the problem and suggests a fix.
10. Help and documentation: concise, searchable, task-focused, and ideally in context.

**Recognition over recall** — [NN/g](https://www.nngroup.com/articles/recognition-and-recall/)
- "Recalling items from scratch is harder than recognizing the correct option in a list of choices." The difference is the number of cues available to memory.
- Implications the article draws:
  - make functions visible;
  - treat command lines and gestures as recall-heavy, and support them with tips;
  - show recent items and history so users can resume a task;
  - prefer contextual tips to generic tutorials ("tutorials have a lot of information, but they are not rehearsed much");
  - label icons;
  - autocomplete inputs.

**Progressive disclosure** — [NN/g](https://www.nngroup.com/articles/progressive-disclosure/)
- Definition: "defers advanced or rarely used features to a secondary screen."
- It helps novices avoid mistakes and saves experts from scanning past rarely used features.
- "The very fact that something appears on the initial display tells users that it's important."
- Limit: "designs that go beyond 2 disclosure levels typically have low usability because users often get lost."
- Splitting rule: "disclose everything that users frequently need up front." Base the split on task analysis, field studies and frequency-of-use data. Give the reveal control strong information scent, so users know what they will get.

**Information density for experts (Bloomberg Terminal, pro tools)** — evidence here is thin and mostly second-hand.
- Bloomberg's UX team says the Terminal's tight, information-dense screen makes clarifying the information hierarchy challenging, and that workflow and subscriber efficiency drive its design decisions — [Bloomberg UX, 2018](https://www.bloomberg.com/ux/2018/11/07/building-ux-team-10-years-one-iteration-time/) (seen through a search snippet only).
- The team accepts a learning curve because it is an expert tool, and aims to flatten that curve rather than remove density — [Pratt IxD, "Expert systems – when complexity is necessary"](https://ixd.prattsi.org/2016/04/expert-systems-when-complexity-is-necessary/) (search snippet).
- **[unverified]** In 2007 IDEO proposed a graphical redesign and Bloomberg declined it — same Pratt source, second-hand.
- **[unverified]** The Terminal shows "~200 data points per screen" and keeps scannability through colour coding, bold text, borders and spatial grouping — from a third-party skills index, not Bloomberg: [openskillindex](https://openskillindex.com/skills/intense-visions-harness-engineering-design-content-density-d2ab35).

**Trust and explainability: Google PAIR Guidebook** — [PAIR, Explainability + Trust chapter](https://pair.withgoogle.com/chapter/explainability-trust/)
- On trust:
  - Trust rests on ability, reliability and benevolence.
  - "Users shouldn't implicitly trust your AI system in all circumstances, but rather calibrate their trust correctly."
  - Saying a prediction could be wrong may lower trust in that one result, but builds reliance over the long term.
- On explanation:
  - Scale explanations to the stakes: "Don't say 'what' without saying 'why' in a high stakes scenario."
  - "The best explanation is likely a partial one."
  - Explaining a specific output is a different job from explaining how the system works in general.
- On data:
  - Explain which data is used and for what.
  - "Tell the user when a lack of data might mean they'll need to use their own judgment."
- On confidence:
  - Show confidence only when it changes the user's decision.
  - High/medium/low categories need guidance on what action to take at each level.
  - "Numeric confidence indicators are risky."
  - In low-confidence cases, showing the N best alternatives prompts the user's own judgment.

**Trust: Microsoft HAX guidelines**
- Source paper: Amershi, Weld, Vorvoreanu, Fourney, Nushi, Collisson, Suh, Iqbal, Bennett, Inkpen, Teevan, Kikin-Gil and Horvitz, *Guidelines for Human-AI Interaction*, CHI 2019 (Honorable Mention). It proposes 18 guidelines, which 49 design practitioners tested against 20 AI products — [Microsoft Research](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/).
- The guidelines are grouped into four phases: "upon initial interaction, during interaction, when the AI system is wrong, and over time" — [HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/).
- **[unverified, from memory; neither page listed them]** Examples include:
  - G1 "Make clear what the system can do";
  - G2 "Make clear how well the system can do what it can do";
  - G9 "Support efficient correction";
  - G11 "Make clear why the system did what it did".

  The full list is in the [HAX Design Library](https://www.microsoft.com/en-us/haxtoolkit/library/).

**Error prevention and recovery: undo instead of confirm**
- Aza Raskin, "Never Use a Warning When You Mean Undo", *A List Apart*, 21 Jul 2007 — [ALA](https://alistapart.com/article/neveruseawarning/):
  - Habituation makes people click through confirmations by reflex.
  - "The more in-your-face the warning is, the faster we'll want to get away from it."
  - Friction such as typing a name slows every legitimate action.
  - Rule: "Never use a warning when you mean undo."
- NN/g keeps modal confirmation for irreversible actions or real risk of lost work: "interrupt the users to avoid a disaster" — [NN/g, modal vs nonmodal](https://www.nngroup.com/articles/modal-nonmodal-dialog/).

**Status visibility and progress** — [NN/g, Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- Pick the loading indicator by wait time:

  | Wait | Indicator |
  |---|---|
  | Under 1 s | None |
  | About 2–10 s | Spinner or skeleton |
  | Over 10 s | Progress bar: "Anything above 10 seconds requires an explicit estimation of duration." |

- Use skeletons for full-page loads and spinners for a single module, such as a dashboard card.
- Avoid frame-only skeletons: users "will assume the page isn't working."
- Heuristic 1 (system status) is the general principle — [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/).

### Inferences
- The day-one new hire and the 20-year CPA can share one screen. Heuristic 7 says to layer shortcuts and density on top of a recognisable default, not to fork the UI. Example: keyboard navigation plus visible labelled actions.
- In a workpaper, "why is this number this number" is a high-stakes explanation by PAIR's definition. Every value should show its source document and field, and how it was checked, one click away. This is a partial explanation in PAIR's sense, which PAIR says is enough.
- Confidence on extracted values should be categorical and tied to an action (for example "needs review" or "verified against prior year"), not a raw OCR percentage. PAIR says numeric confidence is risky.
- Edits to values should be undoable, with an audit trail, rather than guarded by "are you sure?". Keep a modal only for irreversible steps, such as filing or signing off.
- Progressive disclosure: one level shows the value and its status, the second shows provenance and check detail. Never a third.

### Gaps
- No primary, peer-reviewed study of Bloomberg Terminal density was found. All density claims above are second-hand.
- The exact text of the 18 HAX guidelines was not retrieved: both Microsoft pages point to a PDF or library.
- No NN/g article specifically on expert versus novice density was fetched in this pass.

---

## 2. Customer-first design practice

### Takeaway
Customer-first means designing around the user's job: the situation, the motivation and the outcome they need. It does not mean designing around the system's entities. Measure it with task success rate, recorded as labelled levels rather than averaged numbers, and teach in context rather than with manuals.

### Cited findings
- Jobs-to-be-done job statements follow the format *situation → motivation → expected outcome*, and focus "on the job, not the product" — [skills.sh JTBD](https://www.skills.sh/owl-listener/designer-skills/jobs-to-be-done) (blog-grade).
- To do JTBD research, identify the jobs, observe how users do them today and what counts as success, and note the friction with current tools — [Spicefactory](https://spicefactory.co/blog/jobs-to-be-done-a-useful-concept-in-your-ux-toolbox/) (blog-grade).
- Experience Dynamics contrasts JTBD with task analysis and contextual inquiry, and warns that "hire/fire a product" jargon can obscure more than it clarifies — [Experience Dynamics](https://experiencedynamics.com/blog/archive/2019?page=1) (search snippet).
- Task success rate is "the percentage of users who were able to complete a task", because "if users can't accomplish their target task, all else is irrelevant" — [NN/g](https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/).
  - Record partial success as labelled levels: complete, minor issue, major issue, failure.
  - Report each level with a 95% confidence interval (Adjusted Wald).
  - Never average the level numbers: "assign word labels to levels of success instead of numbering them."
  - Think-aloud sessions distort time-on-task.
- Prefer contextual tips to tutorials, and label icons — [NN/g recognition vs recall](https://www.nngroup.com/articles/recognition-and-recall/).
- Help should be in context and task-focused (heuristic 10) — [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/).
- Progressive-disclosure splits should come from task analysis and frequency-of-use data — [NN/g](https://www.nngroup.com/articles/progressive-disclosure/).

### Inferences
- The preparer's and reviewer's jobs are things like "confirm this return is right and defensible" or "find what's wrong before the client sees it." They are not "browse 74 documents." The home screen should be the open-issues queue and the return summary, not a document list.
- For a case study, a measurable stand-in for time-to-first-value is the time from load to the first traced number, or to the first resolved mistake. Task success can be checked with a scripted task list, such as "find why line X differs from the prior year."
- Onboarding without manuals means:
  - empty states that say what to do next;
  - labelled actions;
  - tooltips on tax terms;
  - every flag stating its reason in plain words.

### Gaps
- No authoritative (non-blog) source on "time-to-first-value" as a UX metric was retrieved.
- No source was found that explicitly contrasts task-centred and data-model-centred enterprise UI. The inference above is reasoning, not a citation.

---

## 3. Modern UI engineering

### Takeaway
The conforming baseline in 2026 is WCAG 2.2 AA. Build on semantic tokens that theme for light, dark and high contrast, and on an accessible headless primitive layer. shadcn/ui now ships on Base UI, Radix or React Aria, and Base UI is reported as the new default. Show loading with the right indicator for the wait time, and keep motion minimal.

### Cited findings

**WCAG 2.2**
- WCAG 2.2 is a W3C Recommendation dated 12 Dec 2024 — [W3C TR](https://www.w3.org/TR/WCAG22/).
- Contrast — [W3C TR](https://www.w3.org/TR/WCAG22/):
  - 1.4.3 Contrast (Minimum), AA: 4.5:1 for normal text; 3:1 for large text (18pt, or 14pt bold).
  - 1.4.11 Non-text Contrast, AA: 3:1 for UI components, their states, and the graphical parts needed to understand content.
- New in 2.2 at A and AA — [W3C WAI, What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/):
  - 2.4.11 Focus Not Obscured (Minimum), AA: a focused element is not entirely hidden by author content. Sticky headers and drawers are the usual cause.
  - 2.5.7 Dragging Movements, AA: every drag has a single-pointer alternative.
  - 2.5.8 Target Size (Minimum), AA: at least 24×24 CSS px, or a listed spacing or exception rule.
  - 3.2.6 Consistent Help, A: help sits in the same relative place on every page.
  - 3.3.7 Redundant Entry, A: information already entered in a process is auto-filled or selectable.
  - 3.3.8 Accessible Authentication (Minimum), AA.
- AAA-only additions in 2.2 — same W3C WAI page:
  - 2.4.13 Focus Appearance: a minimum indicator size and 3:1 contrast between focused and unfocused states.
  - 2.4.12 Focus Not Obscured (Enhanced).
  - 3.3.9 Accessible Authentication (Enhanced).
- 4.1.1 Parsing was removed as obsolete — same W3C WAI page.

**Tokens and themes** — [GitHub Primer, colour overview](https://primer.style/foundations/color/overview)
- Primer splits colour tokens into two kinds:
  - functional tokens: "global UI patterns such as text, borders, shadows, and backgrounds";
  - semantic tokens: "Each semantic color is tied to a role with a specific meaning… status, action, or emphasis."
- Functional tokens reference base tokens, so components follow colour modes automatically.
- "Primer supports both color modes across nine themes." High-contrast themes target "a minimum of 7:1 for most text and interactive elements."

**Component libraries in 2026**
- shadcn/ui changelog entries — [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog):
  - Oct 2026: "Trace, Code Block and AI Elements".
  - Aug 2026: "Human in the Loop" and "Questionnaire".
  - New components are "available for Base UI, React Aria and Radix across all eight styles."
  - Jul 2026: an entry titled "Base UI as the Default". Only the title was read.
  - Feb 2025: an entry titled "Tailwind v4".
- Secondary sources (vendor or blog grade, treat loosely):
  - Base UI, from the people behind Radix, Floating UI and MUI, reached v1.0 in 2026 and is MIT-licensed.
  - Radix releases have slowed.
  - React Aria is the pick when accessibility and internationalisation rigour matter most.
  - Sources: [pkgpulse](https://www.pkgpulse.com/guides/shadcn-ui-vs-base-ui-vs-radix-components-2026), [designrevision](https://designrevision.com/alternatives/radix-ui), [HeroUI blog](https://heroui.com/blog/best-react-ui-component-libraries).
  - **[unverified]** The specific claims "WorkOS acquired Radix, slowing it" and "Base UI v1.0 in 2026".
- Why teams pick this stack (inference from the above): shadcn copies source into the repo, so the team owns and can restyle it. The headless primitive handles focus, keyboard and ARIA, and Tailwind maps tokens to utilities.

**Perceived performance**
- Skeleton, spinner and progress-bar thresholds are in section 1 — [NN/g](https://www.nngroup.com/articles/skeleton-screens/).
- **[unverified, not fetched this pass]** Optimistic UI (showing the saved state immediately and rolling back on failure) is standard practice. React 19's `useOptimistic` hook supports it.

**Motion and responsive layout**
- **[unverified, not fetched this pass]** The specific guidance on `prefers-reduced-motion` (WCAG 2.3.3 Animation from Interactions is AAA) and on laptop breakpoints. No primary source was retrieved.

### Inferences
- Treat WCAG 2.2 AA as the floor and test for it:
  - visible focus everywhere;
  - no sticky header covering a focused row (2.4.11);
  - 24 px targets on row actions (2.5.8);
  - every table and flag operable from the keyboard.
- Semantic tokens such as `--status-error`, `--status-verified` and `--status-needs-review` should be the *only* place colour carries meaning. Both themes then come from the same tokens.
- Saving should be optimistic, with a persistent "Saved · 12:04" indicator. Silent saves hide state; a persistent indicator makes it visible.
- For a one-day build: shadcn/ui plus Tailwind on its default primitive layer is the lowest-risk choice.

### Gaps
- The body of the shadcn "Base UI as the Default" entry was not read. The default is inferred from the title plus secondary sources.
- No primary source was fetched for optimistic UI, motion guidance or responsive breakpoints.
- No primary IBM Carbon, Atlassian or GOV.UK pages were fetched in this pass, because of the tool-call budget.

---

## 4. Typography and layout for number-heavy screens

### Takeaway
Right-align numbers that people compare, use tabular lining figures, and keep each header aligned with its column. Left-align identifiers that merely look like numbers. Format consistently, with thousands separators and fixed decimals for money. Colour belongs to semantic status, never decoration.

### Cited findings
- Adobe Spectrum — [Spectrum, Table](https://spectrum.adobe.com/page/table):
  - Right-align numerical data to make scanning and comparison easier.
  - Use "tabular (monospaced) and lining (not old style) numbers" when values must be compared.
  - Left-align "nominal numbers" such as ZIP codes and phone numbers.
- Morningstar: "Always right align numeric columns"; "Always left align alphabetic columns" — [Morningstar DS](https://designsystem.morningstar.com/legacy/v/1.1.0/components/data-tables.html).
- Spiris — [Spiris DS](https://designsystem.spiris.se/development/documentation/docs/table/):
  - The header follows the alignment of its data.
  - Entry numbers and dates stay left-aligned.
- Formatting:
  - Use human-readable formatting, e.g. 1,234,000 — [Australian Government DS (PR preview page)](https://design-system.agriculture.gov.au/pr-preview/pr-1506/components/table).
  - Use consistent decimals for financial data — [Alberta DS](https://design.alberta.ca/examples/display-numbers-in-a-table-so-they-can-be-scanned-easily).
  - Financial numerals are right-aligned — [Ripple, Victoria](https://ripple.sdp.vic.gov.au/design-system/components/table).
- Semantic colour is reserved for "status, action, or emphasis" — [Primer](https://primer.style/foundations/color/overview).
- Use of Color: **[unverified this pass, well-known]** WCAG 1.4.1 (Level A) says colour must not be the only visual means of conveying information.

### Inferences
- Use the CSS `font-variant-numeric: tabular-nums lining-nums` on every money column.
- Show negatives in a consistent form (a minus sign or parentheses, chosen once).
- Fix currency at 2 decimals in workpaper views, or whole dollars where the form uses whole dollars, and say which on screen.
- Use one hue per status: error, needs review, verified, overridden. Pair each with an icon or label so it passes 1.4.1. Everything else stays neutral.

### Gaps
- No primary source was fetched on accounting-specific negative-number conventions, or on decimal-aligned columns in CSS.

---

## 5. Anti-patterns that make enterprise software feel hostile

### Takeaway
Modals that interrupt work and hide the information needed to answer them, state the user cannot see, and system vocabulary leaking into the UI are the main documented hostility patterns. Each maps to a violated heuristic.

### Cited findings
- Modal overload — [NN/g](https://www.nngroup.com/articles/modal-nonmodal-dialog/):
  - Modals "require immediate attention", "interrupt the user's workflow", "cause users to forget what they were doing", and "block the content in the background".
  - That background can be the very information needed to decide.
  - Fix form errors in context, not in a modal.
  - Use non-modal panels or full pages for multi-step input.
  - "No one likes to be interrupted, but if you must, make sure it's worth the cost."
- Habituation — [KDE HIG](https://develop.kde.org/hig/components/assistance/message); [Raskin, ALA](https://alistapart.com/article/neveruseawarning/):
  - Users reflexively dismiss frequent modal message dialogs.
  - Warnings "cause us to lose our work, to mistrust our computers, and to blame ourselves."
- Modals in enterprise tools make it harder to compare and copy data, and users open duplicate tabs as a workaround — [LinkedIn post via search snippet](https://co.linkedin.com/in/fred-prieto-ux) (low authority).
- Hidden state — heuristic 1, visibility of system status — [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/).
- Jargon:
  - Heuristic 2, match the real world: use users' language, "instead of internal jargon" — [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/).
  - Heuristic 9: error messages in plain language that suggest a fix — same source.

### Inferences
- In a tax workpaper:
  - "Hidden state" means unsaved edits, unknown review status, or which return version is on screen. All three should always be visible.
  - "Jargon" has two layers. CPAs share tax vocabulary, so form-line names are fine. Packet internals (field keys, JSON paths, extraction IDs) are not; show them only in the second disclosure level.
- Put source documents in a side panel that is non-modal and keeps the number visible, not in a modal over the value.

### Gaps
- No NN/g article on enterprise "hostility" or jargon specifically was retrieved.
- No quantitative data was found on the cost of modal interruptions in professional tools.
