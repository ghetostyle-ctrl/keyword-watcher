import type { Database } from "bun:sqlite";
import type { CollectionRun, SnapshotInput } from "../shared/contracts";
import { type Config, isConfigured } from "./config";
import { koreaDate } from "./dashboard";
import { getKeywords } from "./database";
import { DomainError } from "./errors";
import {
  acquireRun,
  failRun,
  finishRun,
  renewRun,
  saveRawResponse,
} from "./runs";
import { fetchSearchAd, snapshotFromResponse } from "./searchad";

export async function collect(
  db: Database,
  config: Config,
  trigger: CollectionRun["trigger"],
): Promise<{ readonly run: CollectionRun; readonly skipped: boolean }> {
  if (!isConfigured(config))
    throw new DomainError(
      ".env에 네이버 검색광고 API 키, 시크릿 키, 고객 ID를 설정하세요.",
      422,
    );
  const keywords = getKeywords(db).filter((row) => row.active);
  if (keywords.length === 0)
    throw new DomainError("수집할 키워드를 먼저 등록하세요.", 422);
  const run: CollectionRun = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    snapshotDate: koreaDate(),
    status: "running",
    trigger,
    requested: keywords.length,
    collected: 0,
    message: "",
  };
  const previous = acquireRun(db, run);
  if (previous) return { run: previous, skipped: true };
  const snapshots: SnapshotInput[] = [];
  try {
    for (const keyword of keywords) {
      renewRun(db, run.id);
      const response = await fetchSearchAd(config, keyword.keyword);
      saveRawResponse(db, {
        runId: run.id,
        keyword: keyword.keyword,
        payload: JSON.stringify(response),
      });
      snapshots.push(snapshotFromResponse(response, keyword, run.snapshotDate));
      await Bun.sleep(200);
    }
    return { run: finishRun(db, run, snapshots), skipped: false };
  } catch (error) {
    const message =
      error instanceof DomainError
        ? error.message
        : "수집 중 통신 또는 저장 오류가 발생했습니다. 연결 상태를 확인하세요.";
    failRun(db, run, {
      collected: snapshots.length,
      message: `${message} ${snapshots.length}/${keywords.length}개 응답 수신. 이번 실행의 검색량은 모두 저장하지 않았습니다.`,
    });
    throw new DomainError(message, 503);
  }
}
