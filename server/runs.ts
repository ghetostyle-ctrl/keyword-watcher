import type { Database } from "bun:sqlite";
import {
  type CollectionRun,
  RunSchema,
  type SnapshotInput,
} from "../shared/contracts";
import { writeSnapshots } from "./database";
import { DomainError } from "./errors";

const RUN_COLUMNS = `id, started_at AS startedAt, finished_at AS finishedAt, snapshot_date AS snapshotDate,
  status, trigger, requested, collected, message`;
const LEASE_MS = 10 * 60 * 1000;
export function getRuns(db: Database): CollectionRun[] {
  return db
    .query(
      `SELECT ${RUN_COLUMNS} FROM collection_run ORDER BY started_at DESC LIMIT 30`,
    )
    .all()
    .map((row) => RunSchema.parse(row));
}
export function successfulRun(
  db: Database,
  date: string,
): CollectionRun | null {
  const row = db
    .query(
      `SELECT ${RUN_COLUMNS} FROM collection_run WHERE snapshot_date=? AND status='success' ORDER BY started_at DESC LIMIT 1`,
    )
    .get(date);
  return row ? RunSchema.parse(row) : null;
}
export function acquireRun(
  db: Database,
  run: CollectionRun,
): CollectionRun | null {
  return db
    .transaction(() => {
      const success = successfulRun(db, run.snapshotDate);
      if (success) return success;
      const lock = db
        .query<{ readonly owner: string; readonly expiresAt: number }, []>(
          "SELECT owner, expires_at AS expiresAt FROM collection_lock WHERE id=1",
        )
        .get();
      const now = Date.now();
      if (lock && lock.expiresAt > now)
        throw new DomainError("다른 수집 작업이 실행 중입니다.", 409);
      if (lock)
        db.query(
          "UPDATE collection_run SET status='failed', finished_at=?, message=? WHERE id=? AND status='running'",
        ).run(
          new Date(now).toISOString(),
          "이전 작업이 중단되어 수집 잠금을 복구했습니다.",
          lock.owner,
        );
      db.query(
        "INSERT INTO collection_lock (id, owner, expires_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, expires_at=excluded.expires_at",
      ).run(run.id, now + LEASE_MS);
      db.query(
        "INSERT INTO collection_run (id, started_at, snapshot_date, status, trigger, requested) VALUES (?, ?, ?, 'running', ?, ?)",
      ).run(
        run.id,
        run.startedAt,
        run.snapshotDate,
        run.trigger,
        run.requested,
      );
      return null;
    })
    .immediate();
}
export function renewRun(db: Database, owner: string): void {
  const result = db
    .query(
      "UPDATE collection_lock SET expires_at=? WHERE id=1 AND owner=? AND expires_at>?",
    )
    .run(Date.now() + LEASE_MS, owner, Date.now());
  if (result.changes === 0)
    throw new DomainError("수집 잠금이 만료되었습니다. 다시 실행하세요.", 409);
}
export function finishRun(
  db: Database,
  run: CollectionRun,
  rows: readonly SnapshotInput[],
): CollectionRun {
  return db
    .transaction(() => {
      renewRun(db, run.id);
      writeSnapshots(db, rows, "naver-searchad");
      const finished = {
        ...run,
        status: "success",
        collected: rows.length,
        finishedAt: new Date().toISOString(),
        message: `${rows.length}개 키워드의 검색량을 저장했습니다.`,
      } satisfies CollectionRun;
      db.query(
        "UPDATE collection_run SET status='success', collected=?, finished_at=?, message=? WHERE id=?",
      ).run(finished.collected, finished.finishedAt, finished.message, run.id);
      db.query("DELETE FROM collection_lock WHERE owner=?").run(run.id);
      return finished;
    })
    .immediate();
}
export function failRun(
  db: Database,
  run: CollectionRun,
  issue: { readonly collected: number; readonly message: string },
): void {
  db.transaction(() => {
    db.query(
      "UPDATE collection_run SET status='failed', collected=?, finished_at=?, message=? WHERE id=?",
    ).run(issue.collected, new Date().toISOString(), issue.message, run.id);
    db.query("DELETE FROM collection_lock WHERE owner=?").run(run.id);
  }).immediate();
}
export function isCollecting(db: Database): boolean {
  return Boolean(
    db
      .query("SELECT owner FROM collection_lock WHERE id=1 AND expires_at>?")
      .get(Date.now()),
  );
}
export function saveRawResponse(
  db: Database,
  response: {
    readonly runId: string;
    readonly keyword: string;
    readonly payload: string;
  },
): void {
  db.query(
    "INSERT INTO raw_response (run_id, keyword, payload, received_at) VALUES (?, ?, ?, ?)",
  ).run(
    response.runId,
    response.keyword,
    response.payload,
    new Date().toISOString(),
  );
}
