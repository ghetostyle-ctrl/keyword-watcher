import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig } from "../server/config";
import { koreaDate, shiftDate } from "../server/dashboard";
import { getSnapshots, openDatabase } from "../server/database";
import { acquireRun, failRun, finishRun, getRuns } from "../server/runs";
import { nextCollectionAt } from "../server/scheduler";
import {
  parseCount,
  signature,
  snapshotFromResponse,
} from "../server/searchad";
import { type CollectionRun, SnapshotInputSchema } from "../shared/contracts";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function run(id: string): CollectionRun {
  return {
    id,
    startedAt: "2026-09-21T00:00:00Z",
    finishedAt: null,
    snapshotDate: "2026-09-21",
    status: "running",
    trigger: "manual",
    requested: 1,
    collected: 0,
    message: "",
  };
}
const keyword = {
  id: 1,
  keyword: "테스트 키워드",
  category: "분석",
  active: true,
  createdAt: "2026-09-21T00:00:00Z",
};

describe("SearchAd adapter", () => {
  test("uses raw UTF-8 secret and signs only method path", () => {
    // Given a fixed independently computed HMAC test vector.
    const secret = "test-secret";
    // When signing a fixed request timestamp.
    const signed = signature(secret, "1700000000000");
    // Then the bytes match HMAC-SHA256, not a decoded secret or query-bearing URI.
    expect(signed).toBe("pLnZJtUUxfdXitHXWo/EvKzookF5hlb/Rs2Fuw1W4js=");
  });
  test("preserves a censored mobile count as a range", () => {
    // Given a response with one withheld subcount.
    const response = {
      keywordList: [
        {
          relKeyword: "테스트키워드",
          monthlyPcQcCnt: 100,
          monthlyMobileQcCnt: "< 10",
        },
      ],
    };
    // When composing the total snapshot.
    const snapshot = snapshotFromResponse(response, keyword, "2026-09-21");
    // Then the result represents 100 through 109, without an invented exact count.
    expect(snapshot.monthlyVolume).toBeNull();
    expect([snapshot.volumeMin, snapshot.volumeMax]).toEqual([100, 109]);
    expect(SnapshotInputSchema.safeParse(snapshot).success).toBe(true);
  });
  test("rejects related keywords when exact keyword is absent", () => {
    // Given only a related keyword in the response.
    const response = {
      keywordList: [
        {
          relKeyword: "다른키워드",
          monthlyPcQcCnt: 100,
          monthlyMobileQcCnt: 200,
        },
      ],
    };
    // When selecting the tracked keyword, then no substitute is accepted.
    expect(() =>
      snapshotFromResponse(response, keyword, "2026-09-21"),
    ).toThrow();
  });
  test("recognizes explicit zero separately from a withheld count", () => {
    // Given zero and a threshold returned by SearchAd.
    const values = [0, "<10"];
    // When converting each upstream count.
    const results = values.map(parseCount);
    // Then exact zero and missing precision remain distinct.
    expect(results).toEqual([
      { value: 0, min: 0, max: 0 },
      { value: null, min: 0, max: 9 },
    ]);
  });
});

describe("collection transaction", () => {
  test("prevents concurrent processes and successful duplicate daily commits", () => {
    // Given two real SQLite connections to a unique database.
    const directory = mkdtempSync(join(tmpdir(), "trendwatch-lock-"));
    directories.push(directory);
    const first = openDatabase(join(directory, "test.sqlite"));
    const second = openDatabase(join(directory, "test.sqlite"));
    try {
      acquireRun(first, run("one"));
      // When another process attempts the same daily work.
      expect(() => acquireRun(second, run("two"))).toThrow();
      // Then only the lock owner can complete and the completed day is reused.
      const snapshot = snapshotFromResponse(
        {
          keywordList: [
            {
              relKeyword: "테스트키워드",
              monthlyPcQcCnt: 30,
              monthlyMobileQcCnt: 20,
            },
          ],
        },
        keyword,
        "2026-09-21",
      );
      finishRun(first, run("one"), [snapshot]);
      expect(acquireRun(second, run("three"))?.id).toBe("one");
      expect(getSnapshots(first)).toHaveLength(1);
      expect(getRuns(second)).toHaveLength(1);
    } finally {
      first.close();
      second.close();
    }
  });
  test("a failed run records partial response count without publishing snapshots", () => {
    // Given a started run with one response received.
    const db = openDatabase(":memory:");
    acquireRun(db, run("failed"));
    // When that batch fails before atomic snapshot commit.
    failRun(db, run("failed"), {
      collected: 1,
      message: "upstream unavailable",
    });
    // Then history stays empty and a subsequent attempt can acquire the lock.
    expect(getSnapshots(db)).toEqual([]);
    expect(getRuns(db)[0]?.status).toBe("failed");
    expect(acquireRun(db, run("retry"))).toBeNull();
    db.close();
  });
});

describe("KST collection dates", () => {
  test("crosses calendar boundaries using Korea time", () => {
    // Given a UTC instant just after Korea midnight.
    const now = new Date("2026-09-20T15:01:00Z");
    // When calculating the storage date and baseline.
    const today = koreaDate(now);
    // Then the next Korean calendar date anchors comparisons.
    expect(today).toBe("2026-09-21");
    expect(shiftDate(today, -7)).toBe("2026-09-14");
  });
  test("schedules the following local day after today's collection hour", () => {
    // Given an enabled 9 AM KST schedule after 9 AM.
    const config = readConfig({
      SCHEDULER_ENABLED: "true",
      COLLECTION_HOUR: "9",
    });
    // When calculating the next scheduled time.
    const next = nextCollectionAt(config, new Date("2026-09-21T01:00:00Z"));
    // Then it points to the next day at 00:00 UTC.
    expect(next).toBe("2026-09-22T00:00:00.000Z");
  });
});
