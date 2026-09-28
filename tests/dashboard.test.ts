import { describe, expect, test } from "bun:test";
import { getDashboard, koreaDate } from "../server/dashboard.ts";
import {
  openDatabase,
  upsertKeyword,
  writeSnapshots,
} from "../server/database.ts";
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

describe("stored keyword trends", () => {
  test("returns an honest empty dashboard when no snapshots have been collected", () => {
    // Given
    using db = openDatabase(":memory:");
    upsertKeyword(db, { keyword: "대기", category: "뷰티" });
    // When
    const dashboard = getDashboard(db, { days: 7 });
    // Then
    expect(dashboard.latestDate).toBeNull();
    expect(dashboard.baselineDate).toBeNull();
    expect(dashboard.rows).toEqual([]);
    expect(dashboard.topRisers).toEqual([]);
    expect(dashboard.newGroups).toEqual([]);
    expect(dashboard.stats.trackedKeywords).toBe(1);
  });

  test.each([
    [7, "2026-09-14"],
    [14, "2026-09-07"],
    [30, "2026-08-22"],
  ] as const)(
    "compares exactly %s days before the latest stored date",
    (days, baselineDate) => {
      // Given
      using db = openDatabase(":memory:");
      writeSnapshots(
        db,
        [
          snapshot("기준", baselineDate, 200),
          snapshot("기준", "2026-09-21", 300),
        ],
        "csv",
      );
      // When
      const dashboard = getDashboard(db, { days });
      // Then
      expect(dashboard.latestDate).toBe("2026-09-21");
      expect(dashboard.baselineDate).toBe(baselineDate);
      expect(dashboard.rows[0]).toMatchObject({
        delta: 100,
        changePct: 50,
        comparison: "ready",
      });
    },
  );

  test("leaves a missing baseline incomparable instead of using a neighboring day", () => {
    // Given
    using db = openDatabase(":memory:");
    writeSnapshots(
      db,
      [
        snapshot("불완전", "2026-09-13", 50),
        snapshot("불완전", "2026-09-15", 100),
        snapshot("불완전", "2026-09-21", 200),
      ],
      "csv",
    );
    // When
    const dashboard = getDashboard(db, { days: 7 });
    // Then
    expect(dashboard.rows[0]).toMatchObject({
      previousVolume: null,
      delta: null,
      changePct: null,
      comparison: "missing-baseline",
    });
    expect(dashboard.topRisers).toEqual([]);
  });

  test("preserves a finite delta without an infinite percentage when the baseline is zero", () => {
    // Given
    using db = openDatabase(":memory:");
    writeSnapshots(
      db,
      [snapshot("영점", "2026-09-14", 0), snapshot("영점", "2026-09-21", 80)],
      "csv",
    );
    // When
    const dashboard = getDashboard(db, { days: 7 });
    // Then
    expect(dashboard.rows[0]).toMatchObject({
      previousVolume: 0,
      delta: 80,
      changePct: null,
      comparison: "zero-baseline",
    });
    expect(dashboard.topRisers[0]?.keyword).toBe("영점");
  });

  test.each(["baseline", "latest"] as const)(
    "does not fabricate a delta when %s volume is censored",
    (position) => {
      // Given
      using db = openDatabase(":memory:");
      const baseline = snapshot("비공개", "2026-09-14", 5);
      const latest = snapshot("비공개", "2026-09-21", 8);
      const censored = {
        monthlyVolume: null,
        volumeMin: 0,
        volumeMax: 9,
        rawVolume: "<10",
      };
      writeSnapshots(
        db,
        [
          position === "baseline" ? { ...baseline, ...censored } : baseline,
          position === "latest" ? { ...latest, ...censored } : latest,
        ],
        "csv",
      );
      // When
      const dashboard = getDashboard(db, { days: 7 });
      // Then
      expect(dashboard.rows[0]).toMatchObject({
        delta: null,
        changePct: null,
        comparison: "censored",
      });
      expect(dashboard.topRisers).toEqual([]);
    },
  );

  test("groups first appearances under only the three most recent stored dates", () => {
    // Given
    using db = openDatabase(":memory:");
    writeSnapshots(
      db,
      [
        snapshot("오래됨", "2026-09-01"),
        snapshot("셋째", "2026-09-17"),
        snapshot("둘째", "2026-09-19"),
        snapshot("오늘", "2026-09-21"),
        snapshot("오래됨", "2026-09-21"),
      ],
      "csv",
    );
    // When
    const dashboard = getDashboard(db, { days: 7 });
    // Then
    expect(dashboard.newGroups).toEqual([
      { date: "2026-09-21", keywords: [{ keyword: "오늘", category: "뷰티" }] },
      { date: "2026-09-19", keywords: [{ keyword: "둘째", category: "뷰티" }] },
      { date: "2026-09-17", keywords: [{ keyword: "셋째", category: "뷰티" }] },
    ]);
    expect(dashboard.stats.newKeywords).toBe(1);
  });

  test("ranks top three by positive absolute change while the table ranks by percentage", () => {
    // Given
    using db = openDatabase(":memory:");
    const volumes = [
      ["큰증가", 10_000, 11_000],
      ["중간증가", 1_000, 1_500],
      ["작은증가", 100, 300],
      ["큰비율", 10, 100],
      ["하락", 2_000, 0],
      ["동일", 100, 100],
    ] as const;
    writeSnapshots(
      db,
      volumes.flatMap(([keyword, before, after]) => [
        snapshot(keyword, "2026-09-14", before),
        snapshot(keyword, "2026-09-21", after),
      ]),
      "csv",
    );
    // When
    const dashboard = getDashboard(db, { days: 7 });
    // Then
    expect(dashboard.topRisers.map((row) => row.keyword)).toEqual([
      "큰증가",
      "중간증가",
      "작은증가",
    ]);
    expect(dashboard.rows.map((row) => row.keyword)).toEqual([
      "큰비율",
      "작은증가",
      "중간증가",
      "큰증가",
      "동일",
      "하락",
    ]);
    expect(dashboard.stats.risingKeywords).toBe(4);
  });

  test("does not present stale keyword observations as current", () => {
    // Given
    using db = openDatabase(":memory:");
    writeSnapshots(
      db,
      [snapshot("누락", "2026-09-20"), snapshot("최신", "2026-09-21")],
      "csv",
    );
    // When
    const dashboard = getDashboard(db, { days: 7 });
    // Then
    expect(dashboard.rows.map((row) => row.keyword)).toEqual(["최신"]);
    expect(dashboard.stats.totalKeywords).toBe(1);
  });
});

test("uses the Korean calendar day across the UTC midnight offset", () => {
  // Given
  const boundary = new Date("2026-09-20T15:00:00.000Z");
  // When
  const date = koreaDate(boundary);
  // Then
  expect(date).toBe("2026-09-21");
});
