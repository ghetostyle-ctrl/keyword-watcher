import { Clock3, History, RefreshCw } from "lucide-react";
import { z } from "zod";
import type { CollectionRun } from "../../shared/contracts";
import { RunSchema } from "../../shared/contracts";
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Notice,
} from "../components/ui";
import { useResource } from "../useResource";
import "../styles/management.css";

const RunsSchema = z.object({ runs: z.array(RunSchema) });
const statusLabels = {
  running: "수집 중",
  success: "완료",
  failed: "실패",
} satisfies Record<CollectionRun["status"], string>;
const statusTones = {
  running: "accent",
  success: "positive",
  failed: "error",
} satisfies Record<CollectionRun["status"], "accent" | "positive" | "error">;
const triggerLabels = {
  manual: "직접 실행",
  scheduler: "예약 실행",
  cli: "명령어 실행",
} satisfies Record<CollectionRun["trigger"], string>;
const timestamp = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

export function Activity() {
  const { data, error, loading, reload } = useResource("runs", RunsSchema);
  const runs = data?.runs ?? [];
  return (
    <div className="stack management-page">
      <header className="management-heading page-heading">
        <div>
          <p className="management-eyebrow eyebrow">수집 기록</p>
          <h1>수집 기록</h1>
          <p className="muted page-description">
            매일의 데이터 수집 과정과 결과를 확인하세요.
          </p>
        </div>
        <Button onClick={reload} disabled={loading}>
          <RefreshCw size={16} />
          새로고침
        </Button>
      </header>
      <div className="management-intro">
        <Clock3 size={16} />
        <div>
          <strong>수집의 시작부터 저장까지, 투명하게.</strong>
          <p>
            예약 수집과 직접 실행한 내역을 보여줍니다. 표시 시간은 모두 한국
            표준시(KST)입니다.
          </p>
        </div>
      </div>
      <section className="card registry-card" aria-labelledby="activity-title">
        <div className="section-head">
          <div className="section-title">
            <History size={16} />
            <h2 id="activity-title">최근 실행 내역</h2>
          </div>
          {data && <span className="section-note">{runs.length}개 기록</span>}
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <Notice error>{error}</Notice>
        ) : runs.length === 0 ? (
          <EmptyState
            title="아직 수집 기록이 없어요"
            description="키워드를 등록하고 API를 설정한 뒤 수집을 실행해 주세요. 첫 실행부터 여기에 기록됩니다."
            action={
              <a className="btn" href="#settings">
                수집 설정 보기
              </a>
            }
          />
        ) : (
          <ol className="run-list">
            {runs.map((run) => (
              <li className="run-item" key={run.id}>
                <div className={`run-mark run-mark-${run.status}`}>
                  <History size={16} />
                </div>
                <div className="run-body">
                  <div className="cluster between">
                    <div className="cluster">
                      <h3>{triggerLabels[run.trigger]}</h3>
                      <Badge tone={statusTones[run.status]}>
                        {statusLabels[run.status]}
                      </Badge>
                    </div>
                    <time
                      className="muted small numeric"
                      dateTime={run.startedAt}
                    >
                      {timestamp(run.startedAt)}
                    </time>
                  </div>
                  <p className="run-message">
                    {run.message ||
                      (run.status === "running"
                        ? "검색량을 수집하고 있습니다."
                        : "수집 결과가 기록되었습니다.")}
                  </p>
                  <dl className="run-meta">
                    <div>
                      <dt>스냅샷 날짜</dt>
                      <dd>{run.snapshotDate.replaceAll("-", ".")}</dd>
                    </div>
                    <div>
                      <dt>저장 / 요청</dt>
                      <dd>
                        {run.collected.toLocaleString("ko-KR")} /{" "}
                        {run.requested.toLocaleString("ko-KR")}개
                      </dd>
                    </div>
                    {run.finishedAt && (
                      <div>
                        <dt>종료 시간</dt>
                        <dd>{timestamp(run.finishedAt)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
