import type { KeywordRow } from "../../shared/contracts";
import { day, number, volume } from "../format";
import { Change } from "./TrendSections";
import { Badge, Modal } from "./ui";
export function KeywordDetail({
  row,
  onClose,
}: {
  row: KeywordRow;
  onClose: () => void;
}) {
  const points = row.history;
  const known = points.filter((point) => point.volume !== null);
  const maximum = Math.max(...points.map((point) => point.max), 1);
  const first = points[0];
  const last = points.at(-1);
  const start = first ? Date.parse(first.date) : 0;
  const span = last
    ? Math.max(Date.parse(last.date) - start, 86400000)
    : 86400000;
  const plot = points.map((point) => ({
    date: point.date,
    value: point.volume,
    x: 36 + ((Date.parse(point.date) - start) / span) * 400,
    y: point.volume === null ? null : 160 - (point.volume / maximum) * 128,
  }));
  return (
    <Modal title={row.keyword} onClose={onClose}>
      <div className="cluster between">
        <Badge>{row.category}</Badge>
        <span className="small muted">첫 발견 {day(row.firstSeen)}</span>
      </div>
      <div className="detail-metric">
        <strong>
          {volume(row)}
          <small>건</small>
        </strong>
        <Change row={row} />
      </div>
      <p className="small muted">
        저장된 월간 검색량 추이 · {points.length}개 스냅샷
      </p>
      {known.length > 0 ? (
        <svg
          className="history-chart"
          viewBox="0 0 472 196"
          role="img"
          aria-label={`${row.keyword} 월간 검색량 기록. 아래 표에서 정확한 값을 확인할 수 있습니다.`}
        >
          {[32, 96, 160].map((y) => (
            <line
              key={y}
              x1="36"
              x2="436"
              y1={y}
              y2={y}
              className="chart-grid"
            />
          ))}
          {plot.map((point, index) => {
            const previous = plot[index - 1];
            return (
              <g key={point.date}>
                {point.y !== null &&
                previous?.y !== null &&
                previous?.y !== undefined &&
                Date.parse(point.date) - Date.parse(previous.date) ===
                  86400000 ? (
                  <line
                    x1={previous.x}
                    y1={previous.y}
                    x2={point.x}
                    y2={point.y}
                    className="chart-line"
                  />
                ) : null}
                {point.y !== null ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    className="chart-point"
                  />
                ) : null}
              </g>
            );
          })}
          <text x="36" y="188">
            {first?.date}
          </text>
          <text x="436" y="188" textAnchor="end">
            {last?.date}
          </text>
        </svg>
      ) : (
        <p className="notice">
          범위로 제공된 데이터는 정확한 추이 선으로 표시하지 않습니다.
        </p>
      )}
      <details className="history-data" open={points.length < 3}>
        <summary>날짜별 수집 데이터</summary>
        <div className="history-list">
          {points.map((point) => (
            <div key={point.date}>
              <time>{day(point.date)}</time>
              <strong>
                {point.volume === null
                  ? `${number(point.min)}–${number(point.max)}`
                  : number(point.volume)}
                건
              </strong>
            </div>
          ))}
        </div>
      </details>
      <p className="detail-note">
        빈 날짜는 연결하지 않습니다. 신규는 이 데이터베이스에서 처음 발견했다는
        뜻이며, 시장에 새로 출시된 제품을 의미하지 않습니다.
      </p>
    </Modal>
  );
}
