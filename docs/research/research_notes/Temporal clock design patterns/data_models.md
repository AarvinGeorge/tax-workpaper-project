# Temporal clock design patterns: data models in free/open-source temporal systems

Research date: Sun 18 Oct 2026. Scope: XTDB, Datomic, SQL:2011 temporal tables (MariaDB, SQL Server, Postgres), Dolt, TerminusDB, KurrentDB (EventStoreDB), Marten, and the Fowler and Snodgrass references. Temporal.io is skipped. It is a workflow engine whose replay rebuilds a running workflow's state. It does not offer as-of queries over business data. (This is from background knowledge and was not re-fetched; see Gaps.)

App context, so the mapping sections make sense: a Next.js tax workpaper with an append-only Postgres event log over a read-only packet. Each workspace has one "story clock". The packet holds three computed return versions, each with a `computed_at`. Screens render the packet "as of" story time. Actions are allowed only at the latest point reached, so the past is view-only and there are no branches.

## Q1. Per system: licence, maturity, time concepts, branching and rewriting the past, corrections, projection and snapshot caching

### Takeaway
There are three families of design:
- **Bitemporal engines** (XTDB) keep two separate axes. Valid time is set by the user. System time is set by the database and cannot be rewritten.
- **Transaction-time-only stores** (Datomic, SQL:2011 system-versioned tables, Dolt, TerminusDB, event stores) give "as of" over when things were recorded. Any business ("valid") time has to be modelled as ordinary data.
- **Event stores** (KurrentDB, Marten) rebuild "as of" state by replaying events up to a version or timestamp, and cache the result as inline, async or live projections.

In every system, a correction is a new record. None of them edits the past in place without a privileged, explicitly destructive step.

### Cited Findings

**XTDB (v1 / v2)**
- Licence: "XTDB is licensed under the Mozilla Public License, version 2 or (at your option) any later version" (MPL-2.0, weak copyleft, free/OSS). — [xtdb GitHub README](https://github.com/xtdb/xtdb)
- XTDB says it "implements the bitemporal functionality as specified in the SQL:2011 standard". It lets you "record and query when that data is, was, or will become valid in your business domain", and "you can audit the full history of your database at any point". — [xtdb GitHub README](https://github.com/xtdb/xtdb)
- Maturity: the docs site has described v2 as "early access" at some point. A third-party directory lists v2.1.0 released 2025-12-01 (secondary source, unverified). The GitHub page fetched shows no releases section. — [docs.xtdb.com](https://docs.xtdb.com/); [dev.co listing](https://dev.co/databases/open-source/xtdb)
- System time: "Users (rightly) have no control over system-time - the database maintains this timeline". The docs call it "the immutable system-time timeline". Valid time is user-editable and can be backdated or set in the future. Any requirement phrased "as of" or "with effect from" is probably valid time. — [XTDB: Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html)
- Query defaults: system time is "as best known" (latest) and valid time is "as of now". `FOR VALID_TIME AS OF` gives the curated view including corrections. `FOR SYSTEM_TIME AS OF` gives what was known at a past moment, without later corrections. `BETWEEN` and `FOR ALL` variants also exist. — [XTDB: Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html)
- Corrections: a retroactive change is `UPDATE ... FOR VALID_TIME FROM ...`. The old row gets a valid-to and a new row is added. Both are stamped with system-time ranges, so the earlier belief stays visible. `INSERT` acts as an upsert, and older rows stay reachable by historical queries. — [XTDB: Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html)
- Erasure: the time-in-XTDB page does not cover erasure. Not verified here.

**Datomic**
- Licence: on 27 Apr 2023 Nubank made all editions free, with "binaries ... released under the Apache 2.0 license", available on Maven Central. — [Datomic blog: Datomic is free](https://blog.datomic.com/2023/04/datomic-is-free.html)
- Datomic Cloud was made free in June 2023, and Datomic Local (embeddable, Apache 2.0) was released in Aug 2023. — [Datomic Cloud is free](https://blog.datomic.com/2023/06/datomic-cloud-is-free.html); [Datomic Local released](https://blog.datomic.com/2023/08/datomic-local-is-released.html)
- The FAQ says Datomic is *not* open source: it is free binaries under Apache 2.0, and the source is not published. — [Datomic Cloud FAQ](https://www.datomic.com/cloud-faq.html)
- Maturity: the latest Pro release listed is 1.0.7491, dated 2026-01-26 (from a search summary of the releases page). — [Datomic Pro releases](https://docs.datomic.com/releases-pro.html)
- Model: each datom is (E, A, V, Tx, Op). A retraction is a new datom with Op=false, and existing datoms are never changed. "A db is a point-in-time, immutable value and will never change". Transactions are serialized with increasing ids and carry `:db/txInstant`. — [Datomic data model](https://docs.datomic.com/whatis/data-model.html)
- Corrections and provenance: a transaction is itself an entity, so you can attach attributes to it. The docs' example `:correction/for` records that tx 1235 corrects tx 1234. — [Datomic data model](https://docs.datomic.com/whatis/data-model.html)
- Time axis: transaction time only. The data-model page does not discuss valid time, so business time must be modelled as your own attributes. — [Datomic data model](https://docs.datomic.com/whatis/data-model.html)
- Filters:
  - `as-of` gives the db "ignoring any transactions after that point".
  - `since` gives only datoms added after a point.
  - `history` gives all assertions and retractions.
  - `filter` takes an arbitrary predicate, e.g. to exclude known-bad transactions.
  - An instant "is not as precise as Datomic's t or tx values".
  
  — [Datomic filters](https://docs.datomic.com/reference/filters.html)
- No branching of the past: combining `with` and `as-of` always applies `with` first, so it "does **not** let you branch the past". — [Datomic filters](https://docs.datomic.com/reference/filters.html)

**SQL:2011 system-versioned tables: MariaDB**
- MariaDB uses `WITH SYSTEM VERSIONING` with `ROW_START`/`ROW_END`, which may be invisible pseudo-columns.
  - Queries: `FOR SYSTEM_TIME AS OF | BETWEEN (inclusive) | FROM..TO (end-exclusive) | ALL`. Without a clause, only current rows are returned.
  - "A history row is created for every UPDATE statement that includes a versioned column in its SET list", even when no value changes.
  
  — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- Transaction-precise history (InnoDB) uses `BIGINT UNSIGNED` trx-id columns and `AS OF TRANSACTION n`. Rows "inserted before that point, but committed after will not be shown". — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- Protecting the past:
  - `DELETE HISTORY` needs a special privilege, "to protect the integrity of the history".
  - `TRUNCATE` is blocked.
  - `ALTER` is blocked unless `system_versioning_alter_history=KEEP`, in which case "the history will become incorrect".
  - Dropping and re-adding versioning erases all history.
  
  — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- Caching and performance: `PARTITION BY SYSTEM_TIME` keeps current-data queries on the current partition only. It is not available with trx-precise history. Before 10.11, `mariadb-dump` did not back up history rows. — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- The same page says MariaDB also has application-time periods and bitemporal tables (system versioning plus application time). The page only links to these and does not describe them. — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- MariaDB Server is GPLv2. This was not fetched in this pass; see Gaps.

**SQL:2011 system-versioned tables: SQL Server / Azure SQL** (proprietary product; docs free to read; SQL Server 2016+)
- The table is split in two: a current table plus a history table, with period columns (`datetime2`, UTC).
  - On update or delete, the old row moves to history and its `ValidTo` is set to the transaction's begin time.
  - "The times recorded ... are based on the begin time of the transaction itself", so all rows in one transaction share a timestamp.
  - A history row is added "even if no column values change".
  
  — [Microsoft Learn: Temporal tables (updated 2026-08-18)](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables)
- Query clauses:
  - `AS OF` = `ValidFrom <= t AND ValidTo > t`. This is half-open. The same convention is worth copying for `computed_at` lookups.
  - `FROM..TO`, `BETWEEN..AND`, `CONTAINED IN` and `ALL`.
  - `FOR SYSTEM_TIME` filters out zero-duration rows created by several updates in one transaction.
  
  — [Microsoft Learn: Temporal tables](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables)
- SQL Server's temporal tables are system-time only. The overview page mentions no application-time period.

**PostgreSQL**
- Core PG 18 (released 2025-09-25) adds application-time *temporal constraints*: `PRIMARY KEY/UNIQUE (..., range WITHOUT OVERLAPS)` and temporal foreign keys with `PERIOD`. These work on `daterange`/`tstzrange`/`tsrange`. — [PostgreSQL 18 release notes](https://www.postgresql.org/docs/release/18/); [Npgsql temporal constraints](https://www.npgsql.org/efcore/misc/temporal-constraints.html)
- The feature was first committed for v17 and then reverted "because we didn't forbid empty ranges". — [PostgreSQL wiki: ApplicationTimeProgress](https://wiki.postgresql.org/wiki/ApplicationTimeProgress)
- Core Postgres still has no built-in `FOR SYSTEM_TIME` or system versioning. This is inferred from the extension's README below, which says extensions cannot add the grammar; it was not confirmed against PG 18 docs.
- `periods` extension (PostgreSQL License):
  - It implements SQL:2011-style application periods, `WITHOUT OVERLAPS` unique keys, temporal FKs, `SYSTEM_TIME` (trigger-set to the transaction timestamp) and system versioning into a separate history table.
  - Queries go through functions `t__as_of`, `t__from_to` and `t__between`, because extensions cannot change the grammar.
  - Supports PG 9.5–15 and is tagged "proof-of-concept". There are no portion deletes, and versioning must be dropped before `ALTER`.
  
  — [xocolatl/periods](https://github.com/xocolatl/periods)
- `temporal_tables` (arkhipov) was not fetched in this pass; see Gaps.

**Dolt (git-for-data)**
- Dolt SQL "supports a variant of SQL 2011 syntax to query non-HEAD revisions ... via the AS OF clause". The target can be a commit hash, a branch name or a timestamp, and each table in a query can use a different `AS OF`. `mydb/<hash>` is an equivalent form. — [Dolt docs: Querying history](https://docs.dolthub.com/sql-reference/version-control/querying-history)
- `dolt_history_<table>` holds one row per revision of a row, with `commit_hash`, `committer` and `commit_date`. `dolt_diff` and `dolt_commit_diff_<table>` give diffs. — [Dolt docs: Querying history](https://docs.dolthub.com/sql-reference/version-control/querying-history); [Dolt system tables](https://docs.dolthub.com/sql-reference/version-control/dolt-system-tables)
- Pitfall: an `AS OF` query on a view "will use the current definition of the view, but use rows from the tables as they existed at the revision". — [Dolt docs: Querying history](https://docs.dolthub.com/sql-reference/version-control/querying-history)
- Dolt is branch-first: branches, merges and commits are the core model, which is the opposite of this app's no-branch rule. Doltgres is the Postgres-flavoured sibling. — [Doltgres docs](https://docs.doltgres.com/reference/version-control/querying-history)

**TerminusDB**
- Licence: Apache 2.0. — [Wikipedia: TerminusDB](https://en.wikipedia.org/wiki/TerminusDB)
- It is "architecturally similar to Git": "Every commit is an immutable delta layer (a record of what was added and removed)". Time travel works by pinning a commit id. — [TerminusDB docs: time travel](https://terminusdb.com/docs/time-travel-to-previous-commits); [terminusdb-client docs](https://terminusdb-client.hexdocs.pm/introduction.html)

**KurrentDB (formerly EventStoreDB)**
- Licence history: Event Store License v2 changed to Kurrent License v1 (KLv1) with 25.0, the first release under the KurrentDB name. KLv1 "is not an OSI-approved Open Source License". Anyone can use it, but enterprise features need a key. — [KurrentDB 25.0 release](https://www.kurrent.io/releases/kurrentdb/25-0/); [docs.kurrent.io](https://docs.kurrent.io/latest.html)
- Planned 26.2 (expected Q3 2026): multi-node clustering, read-only replicas, archiving and encryption at rest will need an Enterprise licence. Versions up to 26.1 keep their current terms. — [Kurrent blog: licensing in v26.2](https://kurrentdb.kurrent.io/blog/licensing-in-kurrentdb-v26-2-and-beyond-what-s-free-and-what-s-licensed)
- So KurrentDB is free to use but source-available, not OSS. Its projection and time-travel docs were not fetched; see Gaps.

**Marten (.NET, on PostgreSQL)**
- Licence: MIT. — [Marten: Projections](https://martendb.io/events/projections/)
- Projection lifecycles:
  - **Inline**: "executed at the time of event capture and in the same unit of work", so it is strongly consistent.
  - **Live**: "executed on demand by loading event data and creating the projected view in memory", and not persisted.
  - **Async**: "executed by a background process (eventual consistency)".
  
  — [Marten: Projections](https://martendb.io/events/projections/)
- Time travel: `AggregateStreamAsync<T>` builds an aggregate live from events, stopping at a stream version or a timestamp (e.g. "as of yesterday"). Without a projection, aggregates "are recalculated on each request". Snapshots (`SnapshotLifecycle.Inline/Async`) are "a version of the projection from the events". — [Marten: Projections](https://martendb.io/events/projections/)
- Rebuilds: "Projections need to be rebuilt when the code that defines them changes in a way that requires events to be reapplied". — [Marten: Projections](https://martendb.io/events/projections/)

**Reference designs**
- Fowler, *Bitemporal History* (7 Apr 2021):
  - Actual (valid) time is "when something was true". Record (transaction) time is "when we learned it".
  - Record history is append-only: "We don't change what we thought we knew about Sally's salary on Feb 25".
  - The API shape is `salaryAt(actualDate, recordDate)`, with record date defaulting to today.
  
  — [Fowler: Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)
- Fowler, *Event Sourcing* (12 Dec 2005, draft, not updated; old but still the canonical description):
  - "We can determine the application state at any point in time".
  - Complete rebuild means "re-running the events from the event log".
  - "Since an application state is purely derivable from the event log, you can cache it anywhere you like". Snapshots plus the replay tail give recovery.
  - Branching timelines are described as optional, "analogous to branching in a version control system".
  
  — [Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- Snodgrass, *Developing Time-Oriented Database Applications in SQL* (Morgan Kaufmann, 1999; out of print). The author hosts a free PDF. It predates SQL:2011 syntax, but its valid/transaction-time constraint and query patterns are still the reference. — [Author PDF (Univ. Arizona)](https://smsf.cs.arizona.edu/~rts/tdbbook.pdf); [Elsevier listing](https://shop.elsevier.com/books/developing-time-oriented-database-applications-in-sql/snodgrass/978-0-08-050422-3)

### Inferences
- Licence ranking for "free/OSS":
  - OSI open source: XTDB (MPL-2.0), Marten (MIT), TerminusDB (Apache-2.0), `periods` (PostgreSQL License), PostgreSQL core.
  - Free but not OSS: Datomic (free Apache-2.0 binaries, closed source) and KurrentDB (KLv1, source-available).
  - Proprietary with free docs: SQL Server.
- None of these needs adopting for this app. The app already has the essential shape of the Datomic/Marten family: an append-only log with a serial id and a commit timestamp, with "as of" done as a filter `seq <= cursor`.

### Gaps
- Not fetched in this pass, so stated only from background knowledge:
  - Temporal.io's lack of as-of business state.
  - Dolt's licence (believed Apache-2.0).
  - MariaDB's licence (GPLv2).
  - XTDB v2 GA date (believed mid-2025) and its `ERASE` semantics.
  - KurrentDB stream read-from-revision and projection docs.
  - Postgres `temporal_tables` extension status.
  - MariaDB application-time and bitemporal syntax details.

## Q2. Which concepts map to the app's four needs

### Takeaway
- (a) "Return at time T" is a valid-time lookup over the three engine versions, using their `computed_at`. It is a half-open interval pick (SQL Server/XTDB `AS OF` semantics) over packet data.
- (b) "What people had done by T" is a transaction-time `as-of` over our own event log, like Datomic `as-of` or Marten `AggregateStreamAsync` up to a version or timestamp.
- (c) The view-only past is what every system already does: an as-of value is an immutable read.
- (d) Amendments are new events that reference the event they correct, like Datomic's `:correction/for` on the transaction entity or Fowler's append-only record history.

### Cited Findings
- (a) XTDB says "as of" or "with effect from" requirements are probably *valid time*, and that valid time is user-supplied. The packet's `computed_at` is a business-domain time supplied by the data, not by our DB. — [XTDB: Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html)
- (a) A half-open interval lookup, `ValidFrom <= t AND ValidTo > t`. — [Microsoft Learn: Temporal tables](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables)
- (b) The Datomic `as-of` db ignores "any transactions after that point". t/tx values are more precise than wall-clock instants. — [Datomic filters](https://docs.datomic.com/reference/filters.html)
- (b) MariaDB's `AS OF TRANSACTION n` uses commit order, not wall clock, and excludes rows "inserted before that point, but committed after". — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- (b) Marten aggregates a stream up to a version *or* a timestamp. — [Marten: Projections](https://martendb.io/events/projections/)
- (c) "A db is a point-in-time, immutable value and will never change". `as-of` combined with `with` "does not let you branch the past". — [Datomic data model](https://docs.datomic.com/whatis/data-model.html); [Datomic filters](https://docs.datomic.com/reference/filters.html)
- (c) In XTDB, users have no control over system time. — [XTDB: Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html)
- (d) Datomic: a retraction is a new datom, and a correction is a tx carrying `:correction/for`. — [Datomic data model](https://docs.datomic.com/whatis/data-model.html)
- (d) Fowler: in event sourcing, each event can carry both an actual date and a record date. A retroactive change alters actual history while record history is append-only. — [Fowler: Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)
- (d) Fowler: reversal is easiest when events record differences, otherwise events must store prior values. — [Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)

### Inferences
- The two app clocks are the two classic axes:
  - The packet's `computed_at` is **valid/actual time**: when the engine says the return looked like this.
  - Our event `seq`/`recorded_at` is **transaction/record time**: when the preparer did something.
  - The story clock is a cursor that drives both at once. A clean model is `asOf(storyT) = { returnVersion: latest v where v.computed_at <= storyT, events: e where e.story_at <= storyT }`.
- Prefer a monotonic sequence number over wall-clock time for the "latest point reached" check. This follows the Datomic t-vs-instant and MariaDB trx-id precision notes, because a sequence makes "acting only at the head" an exact equality test (`cursor == head_seq`).
- The no-branch rule matches Datomic's design: as-of is a read-only filter, and writes go only against the current db. Dolt and TerminusDB are the counter-model, since they are branch-centred, and they should not be copied.
- Amendments: model them as `{type:'amend', corrects: <event_id>, ...}` appended at head, the Datomic `:correction/for` pattern. Never as an UPDATE of an old row.

### Gaps
- No source examined models a "story clock" that is user-advanced and separate from both wall-clock and data time. That is an app-specific concept with no direct precedent found.

## Q3. Documented pitfalls

### Takeaway
The recurring pitfalls are:
- confusing the two axes, and users struggling to understand them;
- wall-clock timestamps being too coarse, or out of order relative to commit order;
- historical reads applying *current* derived logic, such as views or projection code, to past data;
- replay cost, which needs snapshots or inline projections;
- projections needing rebuilds when their code changes;
- replays re-triggering side effects.

### Cited Findings
- Axis confusion and complexity:
  - Bitemporal modelling "does complicate a system quite significantly".
  - "One of the hardest parts of this is educating users on how bitemporal history works".
  - "we can often get away without it" if changes are made before anything relies on the old value.
  
  — [Fowler: Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)
- Correcting the record does not undo the effects of acting on the old value, such as a check already paid. Those need compensating actions. — [Fowler: Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)
- Timestamp precision: an instant "is not as precise as Datomic's t or tx values". — [Datomic filters](https://docs.datomic.com/reference/filters.html)
- In SQL Server, all rows in a transaction share its begin time, and zero-duration rows are hidden from `FOR SYSTEM_TIME`. — [Microsoft Learn: Temporal tables](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables)
- MariaDB: a row inserted before point n but committed after it is not shown. — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- Current logic over past data: Dolt `AS OF` on a view uses the *current* view definition. — [Dolt docs: Querying history](https://docs.dolthub.com/sql-reference/version-control/querying-history)
- Current logic over past data: Marten projections must be rebuilt when their code changes. — [Marten: Projections](https://martendb.io/events/projections/)
- `since` views lose lookup attributes. In Datomic, resolve the entity via the current db, then read through the `since` db. — [Datomic filters](https://docs.datomic.com/reference/filters.html)
- Replay cost: Marten live aggregates are recalculated per request unless registered as projections or snapshots. — [Marten: Projections](https://martendb.io/events/projections/)
- Replay cost: in Fowler, snapshots plus replay of newer events are the standard mitigation. — [Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- History query cost: Datomic's unfiltered current db "pay[s] no penalty for history", so filters should be used only where needed. — [Datomic filters](https://docs.datomic.com/reference/filters.html)
- History query cost: MariaDB partitions history away from current rows. — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
- Side effects on replay: replays can resend messages to external systems. Wrap those calls in gateways that are disabled during replay. External query results can differ at replay time, so log their responses. — [Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- History mutability escape hatches exist:
  - MariaDB `DELETE HISTORY` (privileged), and `system_versioning_alter_history=KEEP` makes "history ... incorrect". — [MariaDB: System-versioned tables](https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables)
  - `periods` requires dropping versioning to alter a table. — [xocolatl/periods](https://github.com/xocolatl/periods)
- Empty or degenerate ranges: PG's temporal keys were reverted from v17 for not forbidding empty ranges. — [PostgreSQL wiki: ApplicationTimeProgress](https://wiki.postgresql.org/wiki/ApplicationTimeProgress)

### Inferences
- For a small app with a short log (a single household, tens to hundreds of events), live replay per request (Marten's "Live" lifecycle) is the simplest correct choice. Snapshot invalidation becomes a concern only if events grow large.
- If a head-state cache exists, update it in the same transaction as the append (Marten's "Inline"), so the "latest point" can never be stale.
- Guard against "current logic over past data": the as-of view of a past moment must read the *engine version current at that moment* (packet `computed_at`), not the latest version. That is the app-level equivalent of Dolt's view pitfall.
- Keep the two times visibly labelled in the UI ("Return as computed at …" versus "Work done up to …"). Fowler names user education as the hardest part.
- Enforce append-only at the DB level. Revoke UPDATE/DELETE on the events table, or use a trigger that raises. This mirrors MariaDB's privileged-only `DELETE HISTORY` and keeps the view-only past a guarantee rather than a convention.

### Gaps
- No quantitative replay-performance benchmarks were gathered for any system.
- KurrentDB's own pitfalls documentation, such as the projection-engine caveats, was not reviewed.
