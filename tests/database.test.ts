import { describe, expect, test } from "bun:test";
import { getDashboard } from "../server/dashboard.ts";
import {
  getKeywords,
  getSnapshots,
  importSnapshots,
  openDatabase,
  setKeywordActive,
  upsertKeyword,
  writeSnapshots,
} from "../server/database.ts";
import { DomainError } from "../server/errors.ts";
import type { SnapshotInput } from "../shared/contracts.ts";

function snapshot(
  keyword: string,
  snapshotDate: string,
  monthlyVolume = 100,
  category = "뷰티",
): SnapshotInput {
  return {
    keyword,
    category,
    monthlyVolume,
    snapshotDate,
    volumeMin: monthlyVolume,
    volumeMax: monthlyVolume,
    rawVolume: String(monthlyVolume),
  };
}

describe("snapshot persistence", () => {
  test("replaces the same normalized keyword and date when collected twice", () => {
    // Given
    using db = openDatabase(":memory:");
    writeSnapshots(
      db,
      [
        snapshot("Skin Care", "2026-09-20"),
        snapshot("Skin Care", "2026-09-21", 200),
      ],
      "naver",
    );
    const corrected = {
      ...snapshot("ＳＫＩＮＣＡＲＥ", "2026-09-21", 350),
      category: "경쟁사",
    };
    // When
    writeSnapshots(db, [corrected], "csv");
    // Then
    expect(getSnapshots(db)).toEqual([
      snapshot("Skin Care", "2026-09-20"),
      corrected,
    ]);
  });

  test("uses the newest imported category when history arrives out of order", () => {
    // Given
    using db = openDatabase(":memory:");
    const newest = { ...snapshot("키워드", "2026-09-21"), category: "현재" };
    const oldest = { ...snapshot("키워드", "2026-09-14"), category: "과거" };
    // When
    importSnapshots(db, [newest, oldest]);
    // Then
    expect(
      getKeywords(db).map(({ keyword, category }) => ({ keyword, category })),
    ).toEqual([{ keyword: "키워드", category: "현재" }]);
    expect(getSnapshots(db)).toEqual([oldest, newest]);
  });

  test("rolls back all imported changes when registered keywords would exceed one hundred", () => {
    // Given
    using db = openDatabase(":memory:");
    importSnapshots(
      db,
      Array.from({ length: 99 }, (_, index) =>
        snapshot(`기존${index}`, "2026-09-14"),
      ),
    );
    const beforeKeywords = getKeywords(db);
    const beforeSnapshots = getSnapshots(db);
    const batch = [
      { ...snapshot("기존0", "2026-09-21", 250), category: "변경" },
      snapshot("신규100", "2026-09-21"),
      snapshot("신규101", "2026-09-21"),
    ];
    // When / Then
    expect(() => importSnapshots(db, batch)).toThrow(DomainError);
    expect(getKeywords(db)).toEqual(beforeKeywords);
    expect(getSnapshots(db)).toEqual(beforeSnapshots);
  });

  test("updates an existing keyword even when registration is at capacity", () => {
    // Given
    using db = openDatabase(":memory:");
    importSnapshots(
      db,
      Array.from({ length: 100 }, (_, index) =>
        snapshot(`기존${index}`, "2026-09-14"),
      ),
    );
    const first = getKeywords(db)[0];
    if (!first) throw new Error("Expected imported keyword fixture");
    setKeywordActive(db, first.id, false);
    // When
    const result = upsertKeyword(db, {
      keyword: first.keyword,
      category: "변경",
    });
    // Then
    expect(result).toEqual({ ...first, category: "변경", active: true });
    expect(getKeywords(db)).toHaveLength(100);
  });

  test("keeps first appearance across the full normalized keyword history and category changes", () => {
    // Given
    using db = openDatabase(":memory:");
    writeSnapshots(
      db,
      [
        snapshot("Skin Care", "2026-08-01", 50, "이전"),
        snapshot("skincare", "2026-09-14", 100, "이전"),
        snapshot("ＳＫＩＮＣＡＲＥ", "2026-09-21", 200, "현재"),
      ],
      "csv",
    );
    // When
    const dashboard = getDashboard(db, { days: 7, category: "현재" });
    // Then
    expect(dashboard.rows).toHaveLength(1);
    expect(dashboard.rows[0]).toMatchObject({
      firstSeen: "2026-08-01",
      delta: 100,
      changePct: 100,
    });
    expect(dashboard.rows[0]?.history.map((point) => point.date)).toEqual([
      "2026-09-14",
      "2026-09-21",
    ]);
    expect(dashboard.stats.newKeywords).toBe(0);
  });

  test("filters current rows, registrations and discoveries by category", () => {
    // Given
    using db = openDatabase(":memory:");
    importSnapshots(db, [
      snapshot("뷰티기존", "2026-09-14"),
      snapshot("뷰티기존", "2026-09-21", 200),
      snapshot("뷰티신규", "2026-09-21", 80),
      snapshot("경쟁사신규", "2026-09-21", 500, "경쟁사"),
    ]);
    const paused = upsertKeyword(db, { keyword: "중지", category: "뷰티" });
    setKeywordActive(db, paused.id, false);
    upsertKeyword(db, { keyword: "수집대기", category: "대기" });
    // When
    const dashboard = getDashboard(db, { days: 7, category: "뷰티" });
    // Then
    expect(dashboard.rows.map((row) => row.keyword)).toEqual([
      "뷰티기존",
      "뷰티신규",
    ]);
    expect(dashboard.topRisers.map((row) => row.keyword)).toEqual(["뷰티기존"]);
    expect(dashboard.newGroups[0]?.keywords).toEqual([
      { keyword: "뷰티신규", category: "뷰티" },
    ]);
    expect(dashboard.stats).toMatchObject({
      totalKeywords: 2,
      trackedKeywords: 2,
      risingKeywords: 1,
      newKeywords: 1,
      totalVolume: 280,
      comparableKeywords: 1,
    });
    expect(new Set(dashboard.categories)).toEqual(
      new Set(["뷰티", "경쟁사", "대기"]),
    );
  });
});
