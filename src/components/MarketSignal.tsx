import { ArrowRight, ArrowUpRight, Radar } from "lucide-react";
import type { Dashboard } from "../../shared/contracts";
import { percent } from "../format";
import { Badge } from "./ui";
export function MarketSignal({ data }: { data: Dashboard }) {
  const leader = [...data.rows]
    .filter((row) => (row.changePct ?? 0) > 0)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0];
  const newest = data.newGroups.find((group) => group.date === data.latestDate)
    ?.keywords[0];
  return (
    <section className="signal">
      <div className="signal-icon">
        <Radar size={26} strokeWidth={1.5} />
      </div>
      <div className="signal-content">
        <div className="cluster">
          <span className="signal-label">오늘의 시장 시그널</span>
          <Badge tone="positive">
            {data.latestDate ? "스냅샷 분석" : "시작하기"}
          </Badge>
        </div>
        <h2>
          {leader ? (
            <>
              <strong>{leader.keyword}</strong>가 {data.days}일간{" "}
              <span className="positive">{percent(leader.changePct ?? 0)}</span>
              , 상승세가 가장 뚜렷합니다.
            </>
          ) : data.latestDate ? (
            "꾸준히 쌓이는 데이터에서 다음 기회를 발견하세요."
          ) : (
            "시장의 다음 움직임, 오늘부터 모아보세요."
          )}
        </h2>
        <p>
          {newest
            ? `${newest.keyword} 등 ${data.stats.newKeywords}개 키워드가 최신 스냅샷에서 처음 포착됐습니다.`
            : data.latestDate
              ? "선택한 기간에 비교 가능한 상승 키워드가 아직 없습니다."
              : "관심 키워드를 등록하고 네이버 데이터를 연결하세요. 매일 달라지는 수요를 한눈에 확인하세요."}
        </p>
        {!data.latestDate && (
          <div className="cluster signal-actions">
            <a className="btn btn-primary" href="#keywords">
              첫 키워드 등록 <ArrowRight size={15} />
            </a>
            <a className="signal-link" href="#settings">
              데이터 연결하기 <ArrowUpRight size={15} />
            </a>
          </div>
        )}
        <span className="signal-stamp">
          저장된 월간 검색량을 기준으로 자동 분석
        </span>
      </div>
    </section>
  );
}
