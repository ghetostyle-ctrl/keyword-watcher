import { describe, expect, test } from "bun:test";
import { exportCsv, parseCsv } from "../server/csv.ts";
import { DomainError } from "../server/errors.ts";
import type { SnapshotInput } from "../shared/contracts.ts";

const header = "keyword,category,monthly_volume,snapshot_date";
const today = "2026-09-21";
const exact: SnapshotInput = {
  keyword: "스킨케어",
  category: "뷰티",
  monthlyVolume: 1200,
  snapshotDate: today,
  volumeMin: 1200,
  volumeMax: 1200,
  rawVolume: "1200",
};

describe("CSV snapshots", () => {
  test("parses reordered BOM headers and quoted Korean fields when input is valid", () => {
    // Given
    const csv =
      '\uFEFFcategory,keyword,snapshot_date,monthly_volume\r\n"뷰티, 케어","스킨 ""케어""",2026-09-21,1200\r\n';
    // When
    const rows = parseCsv(csv, today);
    // Then
    expect(rows).toEqual([
      { ...exact, category: "뷰티, 케어", keyword: '스킨 "케어"' },
    ]);
  });

  test("retains censored volumes when source reports less than ten", () => {
    // Given
    const csv = `${header}\n새키워드,기타,<10,${today}`;
    // When
    const rows = parseCsv(csv, today);
    // Then
    expect(rows).toEqual([
      {
        ...exact,
        keyword: "새키워드",
        category: "기타",
        monthlyVolume: null,
        volumeMin: 0,
        volumeMax: 9,
        rawVolume: "<10",
      },
    ]);
  });

  test("accepts an explicit censored range when the volume is empty", () => {
    // Given
    const csv = `${header},volume_min,volume_max\n새키워드,기타,,${today},10,19`;
    // When
    const rows = parseCsv(csv, today);
    // Then
    expect(rows).toEqual([
      {
        ...exact,
        keyword: "새키워드",
        category: "기타",
        monthlyVolume: null,
        volumeMin: 10,
        volumeMax: 19,
        rawVolume: "",
      },
    ]);
  });

  test("preserves multiline quoted cells when they occur inside a field", () => {
    // Given
    const csv = `${header}\n"스킨\n케어",뷰티,1200,${today}`;
    // When
    const rows = parseCsv(csv, today);
    // Then
    expect(rows[0]?.keyword).toBe("스킨\n케어");
  });

  test.each([
    ["empty volume", `${header}\n키워드,기타,,${today}`],
    ["decimal volume", `${header}\n키워드,기타,1.2,${today}`],
    ["negative volume", `${header}\n키워드,기타,-1,${today}`],
    ["exponential volume", `${header}\n키워드,기타,1e3,${today}`],
    [
      "unsafe integer volume",
      `${header}\n키워드,기타,9007199254740993,${today}`,
    ],
    ["impossible date", `${header}\n키워드,기타,1,2026-02-30`],
    ["future date", `${header}\n키워드,기타,1,2026-09-22`],
    ["malformed quote", `${header}\n키"워드,기타,1,${today}`],
    ["unterminated quote", `${header}\n"키워드,기타,1,${today}`],
    ["text after closing quote", `${header}\n"키워드"x,기타,1,${today}`],
    ["duplicate headers", `${header},keyword\n키워드,기타,1,${today},두번째`],
    [
      "missing headers",
      `keyword,monthly_volume,snapshot_date\n키워드,1,${today}`,
    ],
    ["short row", `${header}\n키워드,기타,1`],
    ["extra cell", `${header}\n키워드,기타,1,${today},extra`],
    [
      "incomplete bounds",
      `${header},volume_min,volume_max\n키워드,기타,,${today},0,`,
    ],
    [
      "contradictory bounds",
      `${header},volume_min,volume_max\n키워드,기타,10,${today},0,9`,
    ],
    [
      "contradictory censored bounds",
      `${header},volume_min,volume_max\n키워드,기타,<10,${today},10,19`,
    ],
    ["empty keyword", `${header}\n,기타,1,${today}`],
  ])("rejects %s at the import boundary", (_name, csv) => {
    // Given / When / Then
    expect(() => parseCsv(csv, today)).toThrow(DomainError);
  });

  test("rejects more than ten thousand data rows", () => {
    // Given
    const csv = `${header}\n${Array.from({ length: 10_001 }, () => `키워드,기타,1,${today}`).join("\n")}`;
    // When / Then
    expect(() => parseCsv(csv, today)).toThrow(DomainError);
  });

  test("rejects input exceeding two megabytes in UTF-8", () => {
    // Given
    const csv = `${header}\n${"가".repeat(700_000)}`;
    // When / Then
    expect(() => parseCsv(csv, today)).toThrow(DomainError);
  });

  test("roundtrips exact and censored records through downloadable CSV", () => {
    // Given
    const rows: readonly SnapshotInput[] = [
      exact,
      {
        ...exact,
        keyword: "소량",
        monthlyVolume: null,
        volumeMin: 12,
        volumeMax: 21,
        rawVolume: "",
      },
    ];
    // When
    const restored = parseCsv(exportCsv(rows), today);
    // Then
    expect(restored).toEqual(rows);
  });

  test.each([
    "=SUM(1,2)",
    "+CMD",
    "-CMD",
    "@SUM(A1)",
    "  =SUM(1)",
    "\ttext",
    "\rtext",
  ])("neutralizes spreadsheet formulas for %s", (keyword) => {
    // Given
    const rows: readonly SnapshotInput[] = [{ ...exact, keyword }];
    // When
    const output = exportCsv(rows);
    // Then
    expect(output).toContain(`"'${keyword.replaceAll('"', '""')}"`);
  });

  test("reverses only the exporter formula prefix when importing", () => {
    // Given
    const csv = `${header}\n'=SUM(1),뷰티,1200,${today}\n'일반,뷰티,1200,${today}`;
    // When
    const rows = parseCsv(csv, today);
    // Then
    expect(rows.map((row) => row.keyword)).toEqual(["=SUM(1)", "'일반"]);
  });
});
