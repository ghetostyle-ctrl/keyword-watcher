import { ArrowUpRight, Pause, Play, Zap } from "lucide-react";
import { useState } from "react";
import type { KeywordRow } from "../../shared/contracts";
import { signed } from "../format";
export function Ticker({ rows }: { rows: readonly KeywordRow[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="ticker">
      <span className="ticker-label">
        <Zap size={14} aria-hidden="true" /> TREND LIVE
      </span>
      {rows.length ? (
        <>
          <div className="ticker-window">
            <div className={`ticker-track ${paused ? "paused" : ""}`}>
              {[0, 1].map((copy) => (
                <div
                  className="ticker-items"
                  key={copy}
                  aria-hidden={copy === 1}
                >
                  {rows.map((row) => (
                    <span key={row.keyword}>
                      {row.keyword}
                      <b>{signed(row.delta ?? 0)}</b>
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="ticker-toggle"
            aria-label={paused ? "티커 재생" : "티커 일시정지"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </>
      ) : (
        <span className="ticker-empty">
          첫 수집을 마치면, 지금 움직이는 키워드가 이곳에 표시됩니다.
        </span>
      )}
    </div>
  );
}
