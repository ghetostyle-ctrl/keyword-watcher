# Code review — TrendWatch backend

**Result:** `codeQualityStatus: CLEAR`  
**Recommendation:** `APPROVE`  
**Blockers:** none

## Scope and evidence

This checkout has no Git review base, so the review treated the delivered backend, shared contracts, and tests as the effective change set. The focused scope was `server/`, `shared/`, `scripts/collector.ts`, and `tests/`.

Validated on 2026-09-21:

- `bun run test` — 75 passing tests, 139 assertions.
- `bun run tsc --noEmit` — passed.
- `bun run check` — passed; it reports seven existing frontend-style warnings but no errors in the reviewed code lane.
- A read-only SQLite query confirmed zero rows in `tracked_keyword`, `keyword_snapshot`, `collection_run`, `raw_response`, and `collection_lock`; the delivered database contains no seeded live data.

The test process emits a non-failing `Cannot read file \"C:\\Users\\a\": EPERM` line after completion. It also appears in a standalone read-only Bun SQLite query, so it is an environment/runtime artifact rather than a product test failure.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

None.

## Correctness review

- The dashboard selects only exact 7-, 14-, or 30-day baseline dates and marks a missing date incomparable; it does not substitute a neighboring observation (`server/dashboard.ts:20-49`, `tests/dashboard.test.ts:43-95`).
- First-seen dates use the full normalized-keyword history, while graph history is bounded to the selected comparison window (`server/dashboard.ts:50-62`; `tests/database.test.ts:115-141`).
- TOP 3 means the three largest **positive absolute increases**, as required for the product's “급상승 TOP 3” treatment; it is independently sorted from the percentage-ranked table (`server/dashboard.ts:123-126`, `tests/dashboard.test.ts:175-210`).
- Censored upstream values are kept as ranges, never converted to fabricated exact volume; their comparison reason is `censored` (`server/searchad.ts:28-66`, `server/dashboard.ts:21-49`).
- CSV parsing validates the untrusted import boundary and imports atomically; export neutralizes spreadsheet formulas (`server/csv.ts:73-164`, `server/database.ts:127-142`, `tests/csv.test.ts`).
- Collection writes snapshots only in the completion transaction, with a SQLite lease preventing concurrent runs and a failed run leaving snapshots unpublished (`server/collector.ts:40-66`, `server/runs.ts:32-115`, `tests/collector.test.ts:99-147`).
- The recently added path regression test is relevant: replacing `resolve(path)` with the prior relative `mkdirSync(dirname(path), { recursive: true })` reproduces Bun's `EEXIST` failure for an existing parent-relative directory. It is not a tautological test (`server/database.ts:14-18`, `tests/database-path.test.ts:7-28`).

## Skill-perspective check

This check ran after loading `remove-ai-slops` and `programming` plus the TypeScript data-modeling and error-handling references. The reviewed diff does not violate either perspective: no deletion-only or implementation-mirroring tests were found; the two added regression tests exercise observable error/path behavior; no `any`, unsafe assertions, native enums, non-null assertions, prompt assertions, or needless production parsing/normalization were found in the reviewed scope. All reviewed source modules are below the 250 pure-LOC ceiling.

The supplied programming no-excuse script could not run to completion in this sandbox because TypeScript 7 attempted a child-process spawn and received `EPERM`; the equivalent prohibited-pattern audit was performed directly and the project typecheck passed.
