import type { TrackedKeyword } from "../../shared/contracts";
import { Badge, Button } from "../components/ui";

export function KeywordRegistry({
  items,
  total,
  busyId,
  toggle,
}: {
  readonly items: readonly TrackedKeyword[];
  readonly total: number;
  readonly busyId: number | null;
  readonly toggle: (item: TrackedKeyword) => Promise<void>;
}) {
  return (
    <div className="management-table-wrap">
      <table className="management-table keyword-registry">
        <thead>
          <tr>
            <th>키워드</th>
            <th>카테고리</th>
            <th>등록일</th>
            <th>수집 상태</th>
            <th>
              <span className="sr-only">수집 변경</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td data-label="키워드">
                <strong>{item.keyword}</strong>
              </td>
              <td data-label="카테고리">
                <Badge>{item.category}</Badge>
              </td>
              <td data-label="등록일" className="muted numeric">
                {new Date(item.createdAt).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </td>
              <td data-label="수집 상태">
                <Badge tone={item.active ? "positive" : "neutral"}>
                  {item.active ? "수집 중" : "일시 중지"}
                </Badge>
              </td>
              <td className="management-row-action">
                <Button
                  onClick={() => void toggle(item)}
                  disabled={busyId !== null}
                  aria-label={`${item.keyword} 수집 ${item.active ? "중지" : "재개"}`}
                >
                  {busyId === item.id
                    ? "변경 중…"
                    : item.active
                      ? "중지"
                      : "재개"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="management-table-footer">
        전체 {total}개 중 {items.length}개 표시
      </p>
    </div>
  );
}
