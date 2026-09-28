import {
  ArrowUpRight,
  MoveUpRight,
  Radar,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Dashboard, KeywordRow } from "../../shared/contracts";
import { day, number, percent, signed } from "../format";
import { Badge } from "./ui";
export function Metrics({ data }: { data: Dashboard }) {
  const stats = [
    {
      label: "추적 중인 키워드",
      value: number(data.stats.trackedKeywords),
      unit: "개",
      note: "내가 등록한 관심 키워드",
      icon: Radar,
    },
    {
      label: "상승 중인 키워드",
      value: data.latestDate ? number(data.stats.risingKeywords) : "—",
      unit: data.latestDate ? "개" : "",
      note: `${data.days}일 전보다 검색량 증가`,
      icon: TrendingUp,
    },
    {
      label: "새로 발견한 키워드",
      value: data.latestDate ? number(data.stats.newKeywords) : "—",
      unit: data.latestDate ? "개" : "",
      note: "최신 수집일에 처음 기록",
      icon: Sparkles,
    },
  ];
  return (
    <div className="metrics">
      {stats.map((stat) => (
        <div className="metric card" key={stat.label}>
          <div className="cluster between">
            <span>{stat.label}</span>
            <stat.icon size={14} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="metric-value numeric">
            {stat.value}
            <small>{stat.unit}</small>
          </div>
          <p>{stat.note}</p>
        </div>
      ))}
    </div>
  );
}
export function RisingCards({
  data,
  onSelect,
}: {
  data: Dashboard;
  onSelect: (row: KeywordRow) => void;
}) {
  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">
          <TrendingUp size={16} strokeWidth={1.75} aria-hidden="true" />
          급상승 TOP 3
        </h2>
        <span className="section-note">{data.days}일 검색량 증가량 기준</span>
      </div>
      {data.topRisers.length ? (
        <div className="riser-grid">
          {data.topRisers.map((row, index) => (
            <button
              type="button"
              className="riser-card"
              key={row.keyword}
              onClick={() => onSelect(row)}
            >
              <div className="cluster between">
                <span className="rank">0{index + 1}</span>
                <Badge>{row.category}</Badge>
              </div>
              <h3>{row.keyword}</h3>
              <div className="riser-value">
                {signed(row.delta ?? 0)}
                <small>건</small>
                <MoveUpRight size={16} aria-hidden="true" />
              </div>
              <div className="riser-bottom">
                <span>이전 스냅샷 대비</span>
                <strong>
                  {row.changePct === null
                    ? "기준 검색량 0"
                    : percent(row.changePct)}
                </strong>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="compact-empty card">
          <span className="empty-line-icon">
            <TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h3>다음 상승 키워드를 기다리고 있어요</h3>
            <p>
              같은 키워드의 {data.days}일 전 스냅샷이 있어야 증가량을 비교할 수
              있습니다.
            </p>
          </div>
          <span className="empty-dash">—</span>
        </div>
      )}
    </section>
  );
}
export function NewKeywords({
  data,
  onSelect,
}: {
  data: Dashboard;
  onSelect: (row: KeywordRow) => void;
}) {
  return (
    <section className="card">
      <div className="section-head">
        <h2 className="section-title">
          <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
          새로 등장한 키워드
        </h2>
        <span className="section-note">최근 첫 발견일 3개 · 내 DB 기준</span>
      </div>
      {data.newGroups.length ? (
        <div className="new-grid">
          {data.newGroups.map((group) => (
            <div className="new-group" key={group.date}>
              <div className="cluster">
                <i className="dot connected" />
                <strong>{day(group.date)}</strong>
                {group.date === data.latestDate && (
                  <Badge tone="accent">최신</Badge>
                )}
              </div>
              <div className="new-keywords">
                {group.keywords.map((item) => {
                  const row = data.rows.find((r) => r.keyword === item.keyword);
                  return row ? (
                    <button
                      type="button"
                      className="keyword-chip"
                      key={item.keyword}
                      onClick={() => onSelect(row)}
                    >
                      <span>NEW</span>
                      {item.keyword}
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="keyword-chip" key={item.keyword}>
                      <span>NEW</span>
                      {item.keyword}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="inline-empty">
          <span className="empty-line-icon">
            <Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p>처음 수집된 키워드를 날짜별로 모아 보여드려요.</p>
          <Badge>수집 대기</Badge>
        </div>
      )}
    </section>
  );
}
export function Change({ row }: { row: KeywordRow }) {
  if (row.changePct === null)
    return (
      <span className="comparison-label">
        {
          {
            ready: "—",
            "missing-baseline": "비교 데이터 없음",
            "zero-baseline": "기준 검색량 0",
            censored: "범위 데이터",
          }[row.comparison]
        }
      </span>
    );
  return (
    <span className={`change ${row.changePct >= 0 ? "positive" : "negative"}`}>
      {row.changePct > 0 ? (
        <TrendingUp size={12} strokeWidth={2} aria-hidden="true" />
      ) : row.changePct < 0 ? (
        <TrendingDown size={12} strokeWidth={2} aria-hidden="true" />
      ) : null}
      {percent(row.changePct)}
    </span>
  );
}
