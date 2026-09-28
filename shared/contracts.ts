import { z } from "zod";

export const DaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "유효한 날짜(YYYY-MM-DD)를 입력하세요.");
export const KeywordInputSchema = z.object({
  keyword: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40),
});
export const SnapshotInputSchema = KeywordInputSchema.extend({
  snapshotDate: DaySchema,
  monthlyVolume: z.number().int().nonnegative().nullable(),
  volumeMin: z.number().int().nonnegative(),
  volumeMax: z.number().int().nonnegative(),
  rawVolume: z.string(),
}).refine(
  (row) =>
    row.volumeMin <= row.volumeMax &&
    (row.monthlyVolume === null
      ? row.volumeMin < row.volumeMax
      : row.monthlyVolume === row.volumeMin &&
        row.monthlyVolume === row.volumeMax),
  "검색량 범위가 올바르지 않습니다.",
);
export type SnapshotInput = Readonly<z.infer<typeof SnapshotInputSchema>>;
export const TrackedKeywordSchema = KeywordInputSchema.extend({
  id: z.number().int().positive(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type TrackedKeyword = Readonly<z.infer<typeof TrackedKeywordSchema>>;
export const HistoryPointSchema = z.object({
  date: DaySchema,
  volume: z.number().nullable(),
  min: z.number(),
  max: z.number(),
});
export const KeywordRowSchema = KeywordInputSchema.extend({
  monthlyVolume: z.number().nullable(),
  volumeMin: z.number(),
  volumeMax: z.number(),
  previousVolume: z.number().nullable(),
  delta: z.number().nullable(),
  changePct: z.number().nullable(),
  comparison: z.enum([
    "ready",
    "missing-baseline",
    "zero-baseline",
    "censored",
  ]),
  firstSeen: DaySchema,
  history: z.array(HistoryPointSchema),
});
export type KeywordRow = Readonly<z.infer<typeof KeywordRowSchema>>;
export const DashboardSchema = z.object({
  latestDate: DaySchema.nullable(),
  baselineDate: DaySchema.nullable(),
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  categories: z.array(z.string()),
  stats: z.object({
    totalKeywords: z.number(),
    trackedKeywords: z.number(),
    risingKeywords: z.number(),
    newKeywords: z.number(),
    totalVolume: z.number(),
    comparableKeywords: z.number(),
    censoredKeywords: z.number(),
  }),
  rows: z.array(KeywordRowSchema),
  topRisers: z.array(KeywordRowSchema),
  newGroups: z.array(
    z.object({
      date: DaySchema,
      keywords: z.array(
        z.object({ keyword: z.string(), category: z.string() }),
      ),
    }),
  ),
});
export type Dashboard = Readonly<z.infer<typeof DashboardSchema>>;
export const RunSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  snapshotDate: DaySchema,
  status: z.enum(["running", "success", "failed"]),
  trigger: z.enum(["manual", "scheduler", "cli"]),
  requested: z.number(),
  collected: z.number(),
  message: z.string(),
});
export type CollectionRun = Readonly<z.infer<typeof RunSchema>>;
export const StatusSchema = z.object({
  configured: z.boolean(),
  apiKeySet: z.boolean(),
  secretKeySet: z.boolean(),
  customerIdSet: z.boolean(),
  schedulerEnabled: z.boolean(),
  collectionHour: z.number(),
  timezone: z.literal("Asia/Seoul"),
  collecting: z.boolean(),
  nextRunAt: z.string().nullable(),
  latestSuccessAt: z.string().nullable(),
  activeKeywords: z.number(),
  databaseReady: z.boolean(),
});
export type AppStatus = Readonly<z.infer<typeof StatusSchema>>;
