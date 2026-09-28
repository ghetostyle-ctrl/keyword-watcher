import { CalendarDays, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { AppStatus, KeywordRow } from "../../shared/contracts";
import { DashboardSchema } from "../../shared/contracts";
import { KeywordDetail } from "../components/KeywordDetail";
import { KeywordTable } from "../components/KeywordTable";
import { MarketSignal } from "../components/MarketSignal";
import { Ticker } from "../components/Ticker";
import { Metrics, NewKeywords, RisingCards } from "../components/TrendSections";
import { Button, LoadingState, Notice } from "../components/ui";
import { day } from "../format";
import { useResource } from "../useResource";
import "../styles/dashboard.css";
export function DashboardPage({
  status,
  onCollect,
  busy,
  revision,
}: {
  status: AppStatus | null;
  onCollect: () => void;
  busy: boolean;
  revision: number;
}) {
  const [days, setDays] = useState("7");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<KeywordRow | null>(null);
  const resource = useResource(
    `dashboard?days=${days}&category=${encodeURIComponent(category)}&v=${revision}`,
    DashboardSchema,
  );
  const data = resource.data;
  return (
    <>
      <Ticker rows={data?.topRisers ?? []} />
      <div className="dashboard">
        <div className="page-heading">
          <div>
            <p className="eyebrow">MARKET OVERVIEW</p>
            <h1>키워드 트렌드</h1>
            <p className="page-description">
              검색량의 변화에서, 시장의 다음 기회를 발견하세요.
            </p>
          </div>
          <Button onClick={onCollect} disabled={busy} variant="primary">
            <RefreshCw size={15} className={busy ? "loader" : ""} />
            {busy ? "수집하고 있어요" : "지금 수집하기"}
          </Button>
        </div>
        <div className="dashboard-controls">
          <div className="date-info">
            <CalendarDays size={15} />
            <span>
              마지막 업데이트 <strong>{day(data?.latestDate ?? null)}</strong>
            </span>
          </div>
          <label className="cluster small muted">
            비교 기간
            <select
              className="select"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            >
              <option value="7">최근 7일</option>
              <option value="14">최근 14일</option>
              <option value="30">최근 30일</option>
            </select>
          </label>
        </div>
        <div className="tabs">
          <button
            type="button"
            className="tab"
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            전체
          </button>
          {data?.categories.map((item) => (
            <button
              type="button"
              className="tab"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        {resource.error ? (
          <Notice error>
            {resource.error}{" "}
            <Button onClick={resource.reload}>다시 시도</Button>
          </Notice>
        ) : resource.loading ? (
          <LoadingState />
        ) : data ? (
          <>
            <MarketSignal data={data} />
            <Metrics data={data} />
            {data.latestDate && (
              <p className="comparison-footnote small muted">
                비교 기준: {day(data.latestDate)} ↔ {day(data.baselineDate)} ·
                월간 검색량 추정치의 변화이며, 해당 {days}일간의 검색 횟수가
                아닙니다.
              </p>
            )}
            <RisingCards data={data} onSelect={setSelected} />
            <NewKeywords data={data} onSelect={setSelected} />
            <KeywordTable data={data} onSelect={setSelected} />
            {!status?.configured && data.latestDate ? (
              <Notice>
                CSV 데이터가 표시되고 있습니다. 자동 수집을 시작하려면{" "}
                <a href="#settings">네이버 API를 연결해 주세요.</a>
              </Notice>
            ) : null}
          </>
        ) : null}
      </div>
      {selected && (
        <KeywordDetail row={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
