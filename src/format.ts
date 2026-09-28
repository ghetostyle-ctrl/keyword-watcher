import type { KeywordRow } from "../shared/contracts";

const numberFormatter = new Intl.NumberFormat("ko-KR");
export const number = (value: number) => numberFormatter.format(value);
export const signed = (value: number) =>
  `${value > 0 ? "+" : ""}${number(value)}`;
export const percent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
export function volume(
  row: Pick<KeywordRow, "monthlyVolume" | "volumeMin" | "volumeMax">,
) {
  return row.monthlyVolume === null
    ? `${number(row.volumeMin)}–${number(row.volumeMax)}`
    : number(row.monthlyVolume);
}
export const comparisonLabels = {
  ready: "비교 가능",
  "missing-baseline": "비교 데이터 없음",
  "zero-baseline": "기준 검색량 0",
  censored: "범위 데이터",
} satisfies Record<KeywordRow["comparison"], string>;
export function day(value: string | null) {
  return value ? value.replaceAll("-", ".") : "아직 수집 전";
}
