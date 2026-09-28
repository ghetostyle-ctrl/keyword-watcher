import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SnapshotInput, TrackedKeyword } from "../shared/contracts";
import { DomainError } from "./errors";

export function normalizeKeyword(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .toLocaleLowerCase("en-US");
}

export function openDatabase(path: string): Database {
  const databasePath = path === ":memory:" ? path : resolve(path);
  if (databasePath !== ":memory:")
    mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath, { create: true, strict: true });
  db.exec(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_keyword (
      id INTEGER PRIMARY KEY, keyword TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS keyword_snapshot (
      keyword TEXT NOT NULL, normalized TEXT NOT NULL, category TEXT NOT NULL,
      monthly_volume INTEGER, volume_min INTEGER NOT NULL, volume_max INTEGER NOT NULL,
      raw_volume TEXT NOT NULL, snapshot_date TEXT NOT NULL, source TEXT NOT NULL,
      PRIMARY KEY (normalized, snapshot_date),
      CHECK (volume_min >= 0 AND volume_max >= volume_min),
      CHECK (monthly_volume IS NULL OR (monthly_volume = volume_min AND monthly_volume = volume_max))
    );
    CREATE INDEX IF NOT EXISTS snapshot_date_idx ON keyword_snapshot(snapshot_date);
    CREATE TABLE IF NOT EXISTS collection_run (
      id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, snapshot_date TEXT NOT NULL,
      status TEXT NOT NULL, trigger TEXT NOT NULL, requested INTEGER NOT NULL,
      collected INTEGER NOT NULL DEFAULT 0, message TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS collection_lock (
      id INTEGER PRIMARY KEY CHECK (id = 1), owner TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS raw_response (
      run_id TEXT NOT NULL REFERENCES collection_run(id), keyword TEXT NOT NULL,
      payload TEXT NOT NULL, received_at TEXT NOT NULL, PRIMARY KEY (run_id, keyword)
    );
  `);
  return db;
}

type KeywordRecord = {
  readonly id: number;
  readonly keyword: string;
  readonly category: string;
  readonly active: number;
  readonly createdAt: string;
};
export function getKeywords(db: Database): TrackedKeyword[] {
  return db
    .query<KeywordRecord, []>(
      "SELECT id, keyword, category, active, created_at AS createdAt FROM tracked_keyword ORDER BY id",
    )
    .all()
    .map((row) => ({ ...row, active: row.active === 1 }));
}

export function upsertKeyword(
  db: Database,
  input: { readonly keyword: string; readonly category: string },
): TrackedKeyword {
  const normalized = normalizeKeyword(input.keyword);
  const existing = db
    .query<{ readonly id: number }, [string]>(
      "SELECT id FROM tracked_keyword WHERE normalized = ?",
    )
    .get(normalized);
  if (!existing && getKeywords(db).length >= 100)
    throw new DomainError("키워드는 최대 100개까지 등록할 수 있습니다.", 422);
  db.query(
    "INSERT INTO tracked_keyword (keyword, normalized, category, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(normalized) DO UPDATE SET keyword=excluded.keyword, category=excluded.category, active=1",
  ).run(input.keyword, normalized, input.category, new Date().toISOString());
  const found = getKeywords(db).find(
    (row) => normalizeKeyword(row.keyword) === normalized,
  );
  if (!found) throw new DomainError("키워드 저장에 실패했습니다.", 503);
  return found;
}

export function setKeywordActive(
  db: Database,
  id: number,
  active: boolean,
): TrackedKeyword {
  const result = db
    .query("UPDATE tracked_keyword SET active = ? WHERE id = ?")
    .run(active ? 1 : 0, id);
  if (result.changes === 0)
    throw new DomainError("키워드를 찾을 수 없습니다.", 404);
  const found = getKeywords(db).find((row) => row.id === id);
  if (!found) throw new DomainError("키워드를 찾을 수 없습니다.", 404);
  return found;
}

export function writeSnapshots(
  db: Database,
  rows: readonly SnapshotInput[],
  source: string,
): void {
  const insert =
    db.query(`INSERT INTO keyword_snapshot (keyword, normalized, category, monthly_volume, volume_min, volume_max, raw_volume, snapshot_date, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(normalized, snapshot_date) DO UPDATE SET
    keyword=excluded.keyword, category=excluded.category, monthly_volume=excluded.monthly_volume,
    volume_min=excluded.volume_min, volume_max=excluded.volume_max, raw_volume=excluded.raw_volume, source=excluded.source`);
  for (const row of rows)
    insert.run(
      row.keyword,
      normalizeKeyword(row.keyword),
      row.category,
      row.monthlyVolume,
      row.volumeMin,
      row.volumeMax,
      row.rawVolume,
      row.snapshotDate,
      source,
    );
}

export function importSnapshots(
  db: Database,
  rows: readonly SnapshotInput[],
): void {
  db.transaction(() => {
    const newest = new Map<string, SnapshotInput>();
    for (const row of rows) {
      const normalized = normalizeKeyword(row.keyword);
      const previous = newest.get(normalized);
      if (!previous || previous.snapshotDate <= row.snapshotDate)
        newest.set(normalized, row);
    }
    for (const row of newest.values()) upsertKeyword(db, row);
    writeSnapshots(db, rows, "csv");
  }).immediate();
}

export function getSnapshots(db: Database): SnapshotInput[] {
  return db
    .query<
      SnapshotInput,
      []
    >(`SELECT keyword, category, snapshot_date AS snapshotDate,
    monthly_volume AS monthlyVolume, volume_min AS volumeMin, volume_max AS volumeMax,
    raw_volume AS rawVolume FROM keyword_snapshot ORDER BY snapshot_date, keyword`)
    .all();
}
