import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
import { parseCsv } from "../server/csv.ts";
import {
  getKeywords,
  getSnapshots,
  openDatabase,
  upsertKeyword,
} from "../server/database.ts";
import {
  DashboardSchema,
  StatusSchema,
  TrackedKeywordSchema,
} from "../shared/contracts.ts";

const headers = {
  "Content-Type": "application/json",
  "X-Requested-With": "TrendWatch",
} as const;
const KeywordResponse = z.object({ keyword: TrackedKeywordSchema });
const csv =
  "keyword,category,monthly_volume,snapshot_date\n스킨케어,뷰티,100,2024-01-01\n스킨케어,뷰티,150,2024-01-08";

describe("local HTTP API", () => {
  test("returns the documented empty dashboard when storage is empty", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const response = await app.request("/api/dashboard");
    // Then
    expect(response.status).toBe(200);
    const dashboard = DashboardSchema.parse(await response.json());
    expect(dashboard.latestDate).toBeNull();
    expect(dashboard.rows).toEqual([]);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("adds a tracked keyword through the JSON write route", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const response = await app.request("/api/keywords", {
      method: "POST",
      headers,
      body: JSON.stringify({ keyword: "스킨케어", category: "뷰티" }),
    });
    // Then
    expect(response.status).toBe(201);
    const body = KeywordResponse.parse(await response.json());
    expect(body.keyword).toMatchObject({
      keyword: "스킨케어",
      category: "뷰티",
      active: true,
    });
    expect(getKeywords(db)).toEqual([body.keyword]);
  });

  test("pauses a registered keyword through the patch route", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    const keyword = upsertKeyword(db, {
      keyword: "스킨케어",
      category: "뷰티",
    });
    // When
    const response = await app.request(`/api/keywords/${keyword.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ active: false }),
    });
    // Then
    expect(response.status).toBe(200);
    const body = KeywordResponse.parse(await response.json());
    expect(body.keyword).toEqual({ ...keyword, active: false });
    expect(getKeywords(db)).toEqual([body.keyword]);
  });

  test.each([
    ["missing app header", { "Content-Type": "application/json" }, 403],
    ["foreign origin", { ...headers, Origin: "https://attacker.example" }, 403],
    ["cross-site fetch", { ...headers, "Sec-Fetch-Site": "cross-site" }, 403],
    ["malformed origin", { ...headers, Origin: "not-a-url" }, 403],
    ["non-JSON content", { ...headers, "Content-Type": "text/plain" }, 400],
  ] as const)(
    "rejects writes with %s before mutating storage",
    async (_name, requestHeaders, status) => {
      // Given
      using db = openDatabase(":memory:");
      const app = createApp(db, readConfig({}));
      // When
      const response = await app.request("/api/keywords", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ keyword: "금지", category: "기타" }),
      });
      // Then
      expect(response.status).toBe(status);
      expect(getKeywords(db)).toEqual([]);
    },
  );

  test("rejects requests addressed to a nonlocal host", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const response = await app.request(
      "https://attacker.example/api/dashboard",
    );
    // Then
    expect(response.status).toBe(403);
  });

  test("returns a validation error for malformed JSON without writing records", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const response = await app.request("/api/keywords", {
      method: "POST",
      headers,
      body: "{",
    });
    // Then
    expect(response.status).toBe(400);
    expect(getKeywords(db)).toEqual([]);
  });

  test("rejects an entire CSV batch when one date is in the future", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    const invalidCsv = `${csv}\n미래,뷰티,100,2999-01-01`;
    // When
    const response = await app.request("/api/import", {
      method: "POST",
      headers,
      body: JSON.stringify({ csv: invalidCsv }),
    });
    // Then
    expect(response.status).toBe(400);
    expect(getSnapshots(db)).toEqual([]);
    expect(getKeywords(db)).toEqual([]);
  });

  test("serves imported data in the dashboard and downloadable roundtrip CSV", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    // When
    const imported = await app.request("/api/import", {
      method: "POST",
      headers,
      body: JSON.stringify({ csv }),
    });
    // Then
    expect(imported.status).toBe(200);
    expect(await imported.json()).toEqual({ imported: 2 });
    const dashboardResponse = await app.request(
      "/api/dashboard?days=7&category=뷰티",
    );
    const dashboard = DashboardSchema.parse(await dashboardResponse.json());
    expect(dashboard.rows[0]).toMatchObject({
      keyword: "스킨케어",
      monthlyVolume: 150,
      delta: 50,
      changePct: 50,
    });
    const exported = await app.request("/api/export");
    expect(exported.status).toBe(200);
    expect(exported.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(parseCsv(await exported.text(), "2024-01-08")).toEqual(
      parseCsv(csv, "2024-01-08"),
    );
  });

  test("reveals only credential availability in status responses", async () => {
    // Given
    using db = openDatabase(":memory:");
    const sentinels = [
      "sentinel-api-key",
      "sentinel-secret-key",
      "sentinel-customer-id",
    ] as const;
    const config = {
      ...readConfig({}),
      apiKey: sentinels[0],
      secretKey: sentinels[1],
      customerId: sentinels[2],
    };
    const app = createApp(db, config);
    // When
    const response = await app.request("/api/status");
    // Then
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(StatusSchema.parse(JSON.parse(text))).toMatchObject({
      configured: true,
      apiKeySet: true,
      secretKeySet: true,
      customerIdSet: true,
    });
    for (const sentinel of sentinels) expect(text).not.toContain(sentinel);
  });

  test("refuses collection without credentials and stores no generated observations", async () => {
    // Given
    using db = openDatabase(":memory:");
    const app = createApp(db, readConfig({}));
    upsertKeyword(db, { keyword: "스킨케어", category: "뷰티" });
    // When
    const response = await app.request("/api/collect", {
      method: "POST",
      headers,
      body: "{}",
    });
    // Then
    expect(response.status).toBe(422);
    expect(getSnapshots(db)).toEqual([]);
    const runs = await app.request("/api/runs");
    expect(await runs.json()).toEqual({ runs: [] });
  });
});
