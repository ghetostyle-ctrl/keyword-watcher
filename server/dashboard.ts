import type { Database } from "bun:sqlite";
import type { Dashboard, KeywordRow, SnapshotInput } from "../shared/contracts";
import { getKeywords, getSnapshots, normalizeKeyword } from "./database";

export function koreaDate(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function calculateRow(
  history: readonly SnapshotInput[],
  context: { readonly latest: SnapshotInput; readonly baseline: string },
): KeywordRow {
  const { latest, baseline } = context;
  const previous = history.find((point) => point.snapshotDate === baseline);
  const comparable =
    previous &&
    previous.monthlyVolume !== null &&
    latest.monthlyVolume !== null;
  const delta = comparable
    ? latest.monthlyVolume - previous.monthlyVolume
    : null;
  const changePct =
    comparable && previous.monthlyVolume > 0
      ? ((latest.monthlyVolume - previous.monthlyVolume) /
          previous.monthlyVolume) *
        100
      : null;
  return {
    keyword: latest.keyword,
    category: latest.category,
    monthlyVolume: latest.monthlyVolume,
    volumeMin: latest.volumeMin,
    volumeMax: latest.volumeMax,
    previousVolume: previous?.monthlyVolume ?? null,
    delta,
    changePct,
    comparison: !previous
      ? "missing-baseline"
      : latest.monthlyVolume === null || previous.monthlyVolume === null
        ? "censored"
        : previous.monthlyVolume === 0
          ? "zero-baseline"
          : "ready",
    firstSeen: history[0]?.snapshotDate ?? latest.snapshotDate,
    history: history
      .filter(
        (point) =>
          point.snapshotDate >= baseline &&
          point.snapshotDate <= latest.snapshotDate,
      )
      .map((point) => ({
        date: point.snapshotDate,
        volume: point.monthlyVolume,
        min: point.volumeMin,
        max: point.volumeMax,
      })),
  };
}

export function getDashboard(
  db: Database,
  query: { readonly days: 7 | 14 | 30; readonly category?: string },
): Dashboard {
  const all = getSnapshots(db);
  const latestDate = all.at(-1)?.snapshotDate ?? null;
  const baselineDate = latestDate ? shiftDate(latestDate, -query.days) : null;
  const tracked = getKeywords(db);
  const categories = [
    ...new Set([
      ...all.map((row) => row.category),
      ...tracked.map((row) => row.category),
    ]),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  const groups = new Map<string, SnapshotInput[]>();
  for (const point of all) {
    const normalized = normalizeKeyword(point.keyword);
    const history = groups.get(normalized) ?? [];
    history.push(point);
    groups.set(normalized, history);
  }
  const included = (category: string): boolean =>
    !query.category || category === query.category;
  const rows: KeywordRow[] = [];
  if (latestDate && baselineDate)
    for (const history of groups.values()) {
      const latest = history.at(-1);
      if (
        latest &&
        latest.snapshotDate === latestDate &&
        included(latest.category)
      )
        rows.push(calculateRow(history, { latest, baseline: baselineDate }));
    }
  rows.sort(
    (a, b) =>
      (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity) ||
      a.keyword.localeCompare(b.keyword, "ko"),
  );
  const recentDates = [...new Set(all.map((point) => point.snapshotDate))]
    .reverse()
    .slice(0, 3);
  const newGroups = recentDates.map((date) => ({
    date,
    keywords: [...groups.values()].flatMap((history) => {
      const first = history[0];
      return first && first.snapshotDate === date && included(first.category)
        ? [{ keyword: first.keyword, category: first.category }]
        : [];
    }),
  }));
  return {
    latestDate,
    baselineDate,
    days: query.days,
    categories,
    rows,
    topRisers: rows
      .filter((row) => row.delta !== null && row.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 3),
    newGroups,
    stats: {
      totalKeywords: rows.length,
      trackedKeywords: tracked.filter(
        (row) => row.active && included(row.category),
      ).length,
      risingKeywords: rows.filter((row) => row.delta !== null && row.delta > 0)
        .length,
      newKeywords: rows.filter((row) => row.firstSeen === latestDate).length,
      totalVolume: rows.reduce((sum, row) => sum + (row.monthlyVolume ?? 0), 0),
      comparableKeywords: rows.filter((row) => row.comparison === "ready")
        .length,
      censoredKeywords: rows.filter((row) => row.monthlyVolume === null).length,
    },
  };
}
