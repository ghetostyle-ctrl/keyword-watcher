import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ListFilter,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { Dashboard, KeywordRow } from "../../shared/contracts";
import { number, signed, volume } from "../format";
import { Change } from "./TrendSections";
import { Badge, EmptyState } from "./ui";
export function KeywordTable({
  data,
  onSelect,
}: {
  data: Dashboard;
  onSelect: (row: KeywordRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"changePct" | "monthlyVolume" | "delta">(
    "changePct",
  );
  const [ascending, setAscending] = useState(false);
  const rows = data.rows
    .filter((row) =>
      row.keyword.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => {
      const av = a[sort],
        bv = b[sort];
      if (av === null)
        return bv === null ? a.keyword.localeCompare(b.keyword) : 1;
      if (bv === null) return -1;
      return (
        (ascending ? 1 : -1) * (av - bv) || a.keyword.localeCompare(b.keyword)
      );
    });
  function toggleSort(value: typeof sort) {
    if (sort === value) setAscending(!ascending);
    else {
      setSort(value);
      setAscending(false);
    }
  }
  return (
    <section className="card keyword-table-card">
      <div className="section-head">
        <div className="section-title">
          <ListFilter size={16} strokeWidth={1.75} aria-hidden="true" />
          <h2>전체 키워드</h2>
          <Badge>{number(rows.length)}개</Badge>
        </div>
        <a className="btn" href="/api/export">
          <Download size={16} aria-hidden="true" />
          CSV 내보내기
        </a>
      </div>
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">키워드 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="키워드를 검색해 보세요"
          />
        </label>
        <span className="section-note">
          {data.days}일 변화 · 저장 스냅샷 기준
        </span>
      </div>
      {!data.rows.length ? (
        <EmptyState
          title="아직 수집된 키워드가 없어요"
          description="키워드를 등록하고 첫 수집을 시작하세요. 보유한 실제 데이터는 CSV로 가져오세요."
          action={
            <a className="text-button" href="#settings">
              데이터 가져오기 <Download size={14} aria-hidden="true" />
            </a>
          }
        />
      ) : !rows.length ? (
        <EmptyState
          title="검색 결과가 없어요"
          description="다른 검색어를 입력해 주세요."
        />
      ) : (
        <section
          className="table-wrap"
          aria-label="전체 키워드 표"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region needs keyboard focus so wide tables can be scrolled without a mouse.
          tabIndex={0}
        >
          <table className="keyword-table">
            <thead>
              <tr>
                <th scope="col">키워드</th>
                <th scope="col">카테고리</th>
                {(
                  [
                    { key: "monthlyVolume", label: "월간 검색량" },
                    { key: "delta", label: "증감량" },
                    { key: "changePct", label: "증감률" },
                  ] as const
                ).map((item) => (
                  <th
                    scope="col"
                    key={item.key}
                    aria-sort={
                      sort === item.key
                        ? ascending
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button type="button" onClick={() => toggleSort(item.key)}>
                      {item.label}
                      {sort !== item.key ? (
                        <ArrowUpDown size={12} aria-hidden="true" />
                      ) : ascending ? (
                        <ArrowUp
                          size={12}
                          className="sort-active"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowDown
                          size={12}
                          className="sort-active"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.keyword}>
                  <td>
                    <button
                      type="button"
                      className="keyword-name"
                      onClick={() => onSelect(row)}
                    >
                      <span className="row-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <strong>{row.keyword}</strong>
                    </button>
                  </td>
                  <td data-label="카테고리">
                    <Badge>{row.category}</Badge>
                  </td>
                  <td data-label="월간 검색량" className="numeric">
                    {volume(row)}
                    <span className="table-unit">건</span>
                  </td>
                  <td data-label="증감량" className="numeric">
                    {row.delta === null ? "—" : signed(row.delta)}
                  </td>
                  <td data-label="증감률">
                    <Change row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <div className="table-foot">
        <span>검색광고 API의 월간 검색량 추정치입니다.</span>
        <span>범위값·비교 누락 시 증감률 미표시</span>
      </div>
    </section>
  );
}
