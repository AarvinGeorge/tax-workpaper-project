# Verification: packet README copies

Independent check of `docs/packet/readme.json` and `docs/packet/readme-verbatim.md` against the `readme` key of
`case-study-project-package/okafor_lindqvist_2025_packet (1).json`. Verifier: Claude Fable 5.1, 16 Oct 2026 00:00 EDT.
Probes written from scratch (not the extractor), session scratchpad `review/readme/`, run with `python3 -I`.

## Verdict: both copies are exact and complete

| Measure | Packet | `readme.json` | `.md` rebuilt |
|---|---|---|---|
| Top-level keys | 9 | 9 | 9 |
| Keys, all levels (9 + 12 + 22) | 43 | 43 | 43 |
| Leaf values (all `str`) | 41 | 41 | 41 |
| Leaf characters | 8,078 | 8,078 | 8,078 |
| Non-ASCII in leaves | none | none | none |
| Canonical SHA-256 | `4efd91f7…738c22` | identical | n/a |

### 1. `readme.json`
- Packet loaded with a duplicate-key-rejecting hook (none anywhere in the packet).
- Strict recursive compare: `type()` identity, key order, value and `repr` equality. Zero differences.
- SHA-256 recomputed (`sort_keys`, compact separators, `ensure_ascii=False`, UTF-8): equals the claimed hash.
- File is byte-for-byte `json.dumps(indent=2)` plus a trailing newline, 9,272 bytes.

### 2. `readme-verbatim.md`
- Parsed back into an object (`## \`key\`` = top-level key, `- **\`key\`**: value` = nested key, paragraph = scalar) and compared strictly to the packet: identical in key order, types and every character.
- All 41 leaf strings occur verbatim as substrings; all 43 keys appear in backticks.
- No unaccounted body line below the 8-line preamble. Preamble key count, key order and SHA all match.

### 3. The checks can fail
16 mutants (`mutate.py`); each exits 1 naming the location.
- JSON: one digit changed; two keys swapped; string wrapped in a list; key dropped; key added; trailing space inside a value; duplicate key. A wrong claimed hash is also rejected.
- Markdown: space to hyphen; bullet deleted; bullets reordered; prose line inserted; heading misspelt; hyphen to en dash; apostrophe to U+2019; 74 to 72; bullet flattened to prose.

## 4. What a reader of the rendered Markdown will misread
The source is exact; the rendering is not. Angle-bracket placeholders in prose (outside code spans) are raw HTML tags to CommonMark and renderers hide them. Confirmed with python-markdown 3.10.3:

| Line | Source | Rendered |
|---|---|---|
| 46 | `<form>.<line>, e.g. F1040.11` | `, e.g. F1040.11` |
| 52 | `dependent:<id>` | `dependent:` |
| 42 | `engine_reference.parameters.<name>` | `engine_reference.parameters.` |
| 75 | `F8949 (lines <box>.<lot>)` | `F8949 (lines .)` |
| 75 | `SchCA540NR (lines <line>.<column A-E>)` | `SchCA540NR (lines .)` |
| 43 | `fx.SEK.<rate>` (value) | flagged by scan; same rule |

`<asset_id>`, `<json pointer>` and `<n>` survive (invalid tag names, or inside backticks). If the file is ever shown rendered, wrap values in code spans, or read the raw file / `readme.json`. No list is flattened and no ordering is lost.

Minor: line 3 cites `scratchpad/disc/readme_extract.py`, which is in the session scratchpad, not the repo.
