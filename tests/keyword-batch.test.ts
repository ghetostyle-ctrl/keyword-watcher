import { describe, expect, test } from "bun:test";
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
import {
  getKeywords,
  openDatabase,
  setKeywordActive,
  upsertKeyword,
} from "../server/database.ts";
import { KeywordBatchResultSchema } from "../shared/keyword-batch.ts";

const headers = {
  "Content-Type": "application/json",
  "X-Requested-With": "TrendWatch",
} as const;

describe("bulk keyword registration", () => {
  test("registers requested keywords when the batch is valid", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    const unrelated = upsertKeyword(db, { keyword: "책", category: "도서" });
    // When
    const response = await app.request("/api/keywords/batch", {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords: [
          { keyword: "스킨케어", category: "뷰티" },
          { keyword: "노트북", category: "디지털" },
        ],
      }),
    });
    // Then
    expect(response.status).toBe(201);
    expect(KeywordBatchResultSchema.parse(await response.json())).toMatchObject(
      {
        added: 2,
        existing: 0,
        keywords: [
          unrelated,
          { keyword: "스킨케어", category: "뷰티", active: true },
          { keyword: "노트북", category: "디지털", active: true },
        ],
      },
    );
    expect(getKeywords(db)).toHaveLength(3);
  });

  test("keeps the first entry when normalized request keywords repeat", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const response = await app.request("/api/keywords/batch", {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords: [
          { keyword: " Skin Care ", category: "뷰티" },
          { keyword: "ＳＫＩＮＣＡＲＥ", category: "다른 카테고리" },
          { keyword: "skin\tcare", category: "또 다른 카테고리" },
        ],
      }),
    });
    // Then
    expect(response.status).toBe(201);
    expect(KeywordBatchResultSchema.parse(await response.json())).toMatchObject(
      {
        added: 1,
        existing: 0,
        keywords: [{ keyword: "Skin Care", category: "뷰티" }],
      },
    );
    expect(getKeywords(db)).toHaveLength(1);
  });

  test("preserves existing spelling, category and paused state when a keyword is requested again", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    const original = upsertKeyword(db, {
      keyword: "Skin Care",
      category: "사용자 카테고리",
    });
    const paused = setKeywordActive(db, original.id, false);
    // When
    const response = await app.request("/api/keywords/batch", {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords: [
          { keyword: "ＳＫＩＮＣＡＲＥ", category: "뷰티" },
          { keyword: "skincare", category: "뷰티" },
          { keyword: "립밤", category: "뷰티" },
        ],
      }),
    });
    // Then
    expect(response.status).toBe(201);
    expect(KeywordBatchResultSchema.parse(await response.json())).toMatchObject(
      {
        added: 1,
        existing: 1,
        keywords: [paused, { keyword: "립밤", category: "뷰티", active: true }],
      },
    );
    expect(getKeywords(db)[0]).toEqual(paused);
  });

  test.each([99, 100])(
    "allows a batch when the final unique keyword count is exactly 100 from %i",
    async (initialCount) => {
      // Given
      using db = openDatabase(":memory:");
      const app = createApp(db, readConfig({}));
      for (let index = 0; index < initialCount; index++)
        upsertKeyword(db, { keyword: `기존${index}`, category: "기존" });
      // When
      const response = await app.request("/api/keywords/batch", {
        method: "POST",
        headers,
        body: JSON.stringify({
          keywords: [
            { keyword: "기존0", category: "변경" },
            { keyword: "기존99", category: "신규" },
            { keyword: "기 존 99", category: "중복" },
          ],
        }),
      });
      // Then
      expect(response.status).toBe(201);
      expect(
        KeywordBatchResultSchema.parse(await response.json()),
      ).toMatchObject({
        added: 100 - initialCount,
        existing: initialCount - 98,
      });
      expect(getKeywords(db)).toHaveLength(100);
      expect(getKeywords(db)[0]?.category).toBe("기존");
    },
  );

  test("leaves all records unchanged when a batch would exceed capacity", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    for (let index = 0; index < 99; index++)
      upsertKeyword(db, { keyword: `기존${index}`, category: "기존" });
    const before = getKeywords(db);
    // When
    const response = await app.request("/api/keywords/batch", {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords: [
          { keyword: "기존0", category: "변경" },
          { keyword: "신규100", category: "새 카테고리" },
          { keyword: "신규101", category: "새 카테고리" },
        ],
      }),
    });
    // Then
    expect(response.status).toBe(422);
    expect(getKeywords(db)).toEqual(before);
  });

  test("rolls back earlier inserts when a later database insert fails", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    db.exec(`CREATE TRIGGER reject_second_keyword BEFORE INSERT ON tracked_keyword
      WHEN NEW.normalized = '실패'
      BEGIN SELECT RAISE(ABORT, 'intentional test constraint'); END;`);
    // When
    const response = await app.request("/api/keywords/batch", {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords: [
          { keyword: "정상", category: "뷰티" },
          { keyword: "실패", category: "뷰티" },
        ],
      }),
    });
    // Then
    expect(response.status).toBe(500);
    expect(getKeywords(db)).toEqual([]);
  });

  test.each([
    ["missing keyword list", {}],
    ["empty keyword list", { keywords: [] }],
    ["invalid keyword", { keywords: [{ keyword: " ", category: "뷰티" }] }],
    [
      "invalid category after a valid entry",
      {
        keywords: [
          { keyword: "스킨케어", category: "뷰티" },
          { keyword: "립밤", category: " " },
        ],
      },
    ],
    [
      "more than 50 entries",
      {
        keywords: Array.from({ length: 51 }, (_, index) => ({
          keyword: `키워드${index}`,
          category: "뷰티",
        })),
      },
    ],
  ] as const)("rejects %s without writing records", async (_name, body) => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const response = await app.request("/api/keywords/batch", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    // Then
    expect(response.status).toBe(400);
    expect(getKeywords(db)).toEqual([]);
  });
});
