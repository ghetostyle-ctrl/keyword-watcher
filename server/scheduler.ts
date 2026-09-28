import type { Database } from "bun:sqlite";
import type { AppStatus } from "../shared/contracts";
import { collect } from "./collector";
import { type Config, isConfigured } from "./config";
import { koreaDate, shiftDate } from "./dashboard";
import { getKeywords } from "./database";
import { DomainError } from "./errors";
import { getRuns, isCollecting, successfulRun } from "./runs";

export function nextCollectionAt(
  config: Config,
  now = new Date(),
): string | null {
  if (!config.schedulerEnabled) return null;
  const today = koreaDate(now);
  const time = `${String(config.collectionHour).padStart(2, "0")}:00:00+09:00`;
  const todayRun = new Date(`${today}T${time}`);
  return (
    todayRun > now ? todayRun : new Date(`${shiftDate(today, 1)}T${time}`)
  ).toISOString();
}
export function getStatus(db: Database, config: Config): AppStatus {
  const latestSuccess = db
    .query<{ readonly finishedAt: string }, []>(
      "SELECT finished_at AS finishedAt FROM collection_run WHERE status='success' ORDER BY finished_at DESC LIMIT 1",
    )
    .get();
  return {
    configured: isConfigured(config),
    apiKeySet: Boolean(config.apiKey),
    secretKeySet: Boolean(config.secretKey),
    customerIdSet: Boolean(config.customerId),
    schedulerEnabled: config.schedulerEnabled,
    collectionHour: config.collectionHour,
    timezone: "Asia/Seoul",
    collecting: isCollecting(db),
    nextRunAt: nextCollectionAt(config),
    latestSuccessAt: latestSuccess?.finishedAt ?? null,
    activeKeywords: getKeywords(db).filter((row) => row.active).length,
    databaseReady: true,
  };
}
export function startScheduler(db: Database, config: Config): () => void {
  if (!config.schedulerEnabled) return () => undefined;
  async function tick(): Promise<void> {
    const now = new Date();
    const hour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
    if (
      hour < config.collectionHour ||
      !isConfigured(config) ||
      isCollecting(db)
    )
      return;
    if (
      successfulRun(db, koreaDate(now)) ||
      !getKeywords(db).some((row) => row.active)
    )
      return;
    const last = getRuns(db)[0];
    if (
      last?.status === "failed" &&
      now.getTime() - Date.parse(last.startedAt) < 30 * 60 * 1000
    )
      return;
    try {
      await collect(db, config, "scheduler");
    } catch (error) {
      if (error instanceof DomainError)
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "scheduled_collection_failed",
            message: error.message,
          }),
        );
      else
        console.error(
          JSON.stringify({
            level: "error",
            event: "scheduled_collection_failed",
          }),
        );
    }
  }
  const timer = setInterval(() => {
    void tick();
  }, 60_000);
  void tick();
  return () => clearInterval(timer);
}
