# Lane C ready: first version (17 Oct 2026, 00:05 EDT)

`src/server/state.ts` works end to end on the memory store (tests) and the file store (local dev, `.data/events/<ws>.jsonl`).
Lane C tests: 5 files, 50 tests, exit 0 (`npx vitest run tests/unit/{events,policy,project,clock,store}.test.ts`).

## Use from server components
```ts
import { loadWorkspace, postEvent } from '@/server/state';
const { ix, findings, state, role } = await loadWorkspace(ws, roleKey);   // throws on a bad ws id or role key
const r = await postEvent(ws, roleKey, { type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: '...' }, baseVersion: state.claims['line:F540NR.72']?.version ?? 0 });
// r: { ok: true, event } | { ok: false, status: 400 | 403 | 409, reason, newer? }
```
- `ws`, `role` and `storyAt` are set by the server; the client sends only `{ type, claimId?, payload, baseVersion?, groupId?, retracts? }`.
- `findings` comes from lane A's `runChecks` (loaded lazily; `[]` until it exists). Staff get all; clients only those with `plain`; examiner none.
- `ix` is the raw packet index: pass every packet text a role sees through `maskText(text, role, revealed)` or `maskRecord(obj, role, revealed)`
  (`@/domain/policy`). `state` is already masked and filtered for the role.

## API (client side)
- `POST /api/w/:ws/events?role=<key>` body as above. 200 `{ ok, seq, event }`; 400 bad input; 403 `{ reason }` (policy, text quotes the firm rule); 409 `{ reason, newer }`.
- `GET /api/w/:ws/state?role=<key>&after=<seq>` returns `{ role, state, findings, lastSeq, newEvents }` (masked; never the packet).

## Payload conventions
- adjustment: `{ value, reason, authority?, category?, effect?: { federal, california, basis }, status? }`. status defaults to
  `applied` for reviewer/partner, `proposed` for preparers (a preparer cannot apply). `category` is a `tax_effect_rates` key;
  payment and credit lines are 1:1 automatically; `effect` (e.g. from a finding) wins.
- signoff: `{ level? }` (defaults to the role's level; the server stores the value it covered). Self-review refused.
- review_note `{ text, blocking? }`; note_resolved `{ noteSeq }`; question_to_client `{ to: 'ngozi'|'erik', text }`;
  answer_recorded `{ questionSeq, text }` (clients); attach_note `{ text }` on `doc:<ID>` or `question:<seq>`;
  question_to_colleague `{ to: <staff key>, text }`; verification `{ method }` (one of firm verification_types);
  decision `{ kind: election|due_diligence|penalty|judgment, authority, text? }`; finding_cleared on `finding:<id>` `{ reason }`;
  reason_set `{ code, text }`; reveal `{ what }` (a ref or label, never the value); clock_moved `{ to: ISO }` (any staff);
  undo: `retracts: <seq>` or `groupId: <id>` (bulk sign-off: give each event the same groupId, undo the group once).
- `can(ix, roleKeyOrInfo, action, claimIdOrTarget, state)` mirrors the server for disabling buttons; action `'approve'` lists blockers.

## Other exports
`roles`, `roleInfo`, `isRoleKey`, `partnerThreshold`, `maskValue`, `sensitiveTypeOf(value)` (an IP PIN is value_type `code`),
`redactText`, `maskText`, `maskRecord` (policy); `DEFAULT_STORY_AT`, `stageAt`, `frozenAt`, `visibleAt`, `deadlines` (clock);
`projectWorkspace`, `effectOf` (project); `getStore`, `storeKind` (store).

## Update 17 Oct 00:15 EDT (coordinator fixes)
- Sign-off staleness compares normalised values (null as '', '10,500' equals 10500): a sign-off on a finding claim is not stale at birth.
- Clients and the examiner get screens `home`, `documents`, `filing`.
- Approval = a partner `signoff` on claim `return`. The server refuses it (403, reason lists the blockers) while `state.blockers` is non-empty, and for anyone but the partner. `can(ix, role, 'approve', {}, state)` gives the same verdict for the button.
