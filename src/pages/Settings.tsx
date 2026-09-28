import {
  CalendarClock,
  Download,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useState } from "react";
import type { AppStatus } from "../../shared/contracts";
import { Badge, Button, LoadingState, Notice } from "../components/ui";
import { CsvImport, csvHeader } from "./CsvImport";
import { SettingsSources } from "./SettingsSources";
import "../styles/management.css";

const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csvHeader}`)}`;
const timestamp = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

export function Settings({
  status,
  onChanged,
}: {
  status: AppStatus | null;
  onChanged: () => void;
}) {
  const [modal, setModal] = useState(false);
  const [message, setMessage] = useState("");
  const openImport = () => setModal(true);
  return (
    <div className="stack management-page">
      <header className="management-heading page-heading">
        <div>
          <p className="management-eyebrow eyebrow">데이터·자동화</p>
          <h1>수집 설정</h1>
          <p className="muted page-description">
            실제 검색량을 연결하고, 매일의 변화를 기록하세요.
          </p>
        </div>
        <Button onClick={onChanged}>
          <RefreshCw size={16} />
          상태 새로고침
        </Button>
      </header>
      {message && <Notice>{message}</Notice>}
      <div className="management-intro">
        <ShieldCheck size={16} />
        <div>
          <strong>검색량 데이터는 안전하게, 서버에서만.</strong>
          <p>
            인증 정보는 서버의 환경 변수로 관리합니다. 이 화면에는 설정 여부만
            표시되며 API 키는 브라우저에 전달되지 않습니다.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <SettingsSources status={status} />
        <div className="settings-stack">
          <section className="card" aria-labelledby="schedule-title">
            <div className="section-head">
              <div className="section-title">
                <CalendarClock size={16} />
                <h2 id="schedule-title">자동 수집</h2>
              </div>
              {status && (
                <Badge tone={status.schedulerEnabled ? "positive" : "neutral"}>
                  {status.schedulerEnabled ? "활성" : "비활성"}
                </Badge>
              )}
            </div>
            {!status ? (
              <LoadingState />
            ) : (
              <>
                <p className="schedule-time">
                  매일 {String(status.collectionHour).padStart(2, "0")}:00
                  <span>KST</span>
                </p>
                <p className="muted small">
                  서버가 실행 중일 때 한국 시간 기준으로 수집합니다.
                </p>
                <dl className="settings-detail">
                  <div>
                    <dt>다음 실행</dt>
                    <dd>
                      {status.nextRunAt
                        ? timestamp(status.nextRunAt)
                        : "예약된 실행 없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>수집 대상</dt>
                    <dd>{status.activeKeywords}개 키워드</dd>
                  </div>
                  <div>
                    <dt>최근 성공</dt>
                    <dd>
                      {status.latestSuccessAt
                        ? timestamp(status.latestSuccessAt)
                        : "성공 기록 없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>현재 상태</dt>
                    <dd>{status.collecting ? "수집 진행 중" : "대기 중"}</dd>
                  </div>
                </dl>
              </>
            )}
            <hr className="divider" />
            <p className="muted small">
              자동 수집을 켜려면 <code>.env</code>에 아래 값을 지정하고 서버를
              재시작하세요. 수집 시각은 0~23시로 변경할 수 있습니다.
            </p>
            <pre className="code-block">
              <code>{`SCHEDULER_ENABLED=true\nCOLLECTION_HOUR=${status?.collectionHour ?? 9}`}</code>
            </pre>
          </section>
          <section className="card" aria-labelledby="import-title">
            <div className="section-head">
              <div className="section-title">
                <Upload size={16} />
                <h2 id="import-title">보유 데이터 가져오기</h2>
              </div>
            </div>
            <p className="connection-description">
              이미 보유한 실제 검색량 CSV가 있다면 이전 수집일의 스냅샷도 함께
              가져올 수 있습니다.
            </p>
            <p className="muted small">
              필수 열: 키워드, 카테고리, 월간 검색량, 수집일. 수집일은
              YYYY-MM-DD 형식으로 입력하세요.
            </p>
            <div className="import-actions">
              <Button onClick={openImport}>
                <Upload size={16} />
                CSV 가져오기
              </Button>
              <a
                href={templateHref}
                download="keyword_snapshot_template.csv"
                className="btn"
              >
                <Download size={16} />빈 양식
              </a>
            </div>
          </section>
        </div>
      </div>
      {modal && (
        <CsvImport
          onClose={() => setModal(false)}
          onImported={(count) => {
            setModal(false);
            setMessage(
              `${count.toLocaleString("ko-KR")}행의 스냅샷을 가져왔습니다.`,
            );
            onChanged();
          }}
        />
      )}
    </div>
  );
}
