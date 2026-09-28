import {
  type SnapshotInput,
  SnapshotInputSchema,
} from "../shared/contracts.ts";
import { DomainError } from "./errors.ts";

const requiredHeaders = [
  "keyword",
  "category",
  "monthly_volume",
  "snapshot_date",
] as const;
const formulaLead = /^\s*[=+@\-\t\r]/;

function readRecords(csv: string): readonly (readonly string[])[] {
  const records: string[][] = [];
  let cells: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const finishField = () => {
    cells.push(field);
    field = "";
    closed = false;
  };
  const finishRecord = () => {
    finishField();
    if (cells.length !== 1 || cells[0] !== "") records.push(cells);
    cells = [];
    if (records.length > 10_001)
      throw new DomainError("CSV는 최대 10,000행까지 가져올 수 있습니다.");
  };
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv.charAt(index);
    if (quoted) {
      if (character === '"') {
        if (csv.charAt(index + 1) === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += character;
    } else if (character === ",") {
      finishField();
    } else if (character === "\r" || character === "\n") {
      finishRecord();
      if (character === "\r" && csv.charAt(index + 1) === "\n") index += 1;
    } else if (closed) {
      throw new DomainError(
        "CSV의 닫는 따옴표 뒤에는 쉼표 또는 줄바꿈만 올 수 있습니다.",
      );
    } else if (character === '"') {
      if (field.length > 0)
        throw new DomainError("CSV 필드 중간에 잘못된 따옴표가 있습니다.");
      quoted = true;
    } else field += character;
  }
  if (quoted) throw new DomainError("CSV의 따옴표가 닫히지 않았습니다.");
  if (field.length > 0 || cells.length > 0 || closed) finishRecord();
  return records;
}

function integer(value: string, label: string): number {
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed)) {
    throw new DomainError(`${label}에는 0 이상의 정수를 입력하세요.`);
  }
  return parsed;
}

export function parseCsv(csv: string, today: string): readonly SnapshotInput[] {
  if (new TextEncoder().encode(csv).byteLength > 2 * 1024 * 1024) {
    throw new DomainError("CSV 파일은 2MB 이하여야 합니다.");
  }
  const [first, ...records] = readRecords(csv.replace(/^\uFEFF/, ""));
  if (!first) throw new DomainError("CSV 헤더가 없습니다.");
  const headers = first.map((cell) => cell.trim());
  if (
    headers.some((header) => header.length === 0) ||
    new Set(headers).size !== headers.length
  ) {
    throw new DomainError("CSV 헤더가 비어 있거나 중복되었습니다.");
  }
  if (requiredHeaders.some((header) => !headers.includes(header))) {
    throw new DomainError(`CSV 필수 헤더: ${requiredHeaders.join(", ")}`);
  }
  return records.map((record, index) => {
    const rowNumber = index + 2;
    if (record.length !== headers.length)
      throw new DomainError(`${rowNumber}행의 열 수가 헤더와 다릅니다.`);
    const read = (name: string): string => {
      const value = record[headers.indexOf(name)] ?? "";
      return value.startsWith("'") && formulaLead.test(value.slice(1))
        ? value.slice(1)
        : value;
    };
    const rawVolume = read("monthly_volume").trim();
    const minText = read("volume_min").trim();
    const maxText = read("volume_max").trim();
    const hasBounds = minText !== "" && maxText !== "";
    if ((minText === "") !== (maxText === ""))
      throw new DomainError(`${rowNumber}행의 검색량 범위를 모두 입력하세요.`);
    if (rawVolume === "" && !hasBounds)
      throw new DomainError(`${rowNumber}행의 검색량이 비어 있습니다.`);
    const monthlyVolume =
      rawVolume === "<10" || rawVolume === ""
        ? null
        : integer(rawVolume, `${rowNumber}행 검색량`);
    const volumeMin = hasBounds
      ? integer(minText, `${rowNumber}행 최소 검색량`)
      : (monthlyVolume ?? 0);
    const volumeMax = hasBounds
      ? integer(maxText, `${rowNumber}행 최대 검색량`)
      : (monthlyVolume ?? 9);
    if (rawVolume === "<10" && (volumeMin !== 0 || volumeMax !== 9)) {
      throw new DomainError(
        `${rowNumber}행의 <10 검색량은 0~9 범위여야 합니다.`,
      );
    }
    const parsed = SnapshotInputSchema.safeParse({
      keyword: read("keyword"),
      category: read("category"),
      snapshotDate: read("snapshot_date").trim(),
      monthlyVolume,
      volumeMin,
      volumeMax,
      rawVolume,
    });
    if (!parsed.success)
      throw new DomainError(
        `${rowNumber}행: ${parsed.error.issues.map((issue) => issue.message).join(" ")}`,
      );
    if (parsed.data.snapshotDate > today)
      throw new DomainError(
        `${rowNumber}행의 수집일은 오늘 이후일 수 없습니다.`,
      );
    return parsed.data;
  });
}

export function exportCsv(rows: readonly SnapshotInput[]): string {
  const quote = (value: string): string => {
    const safe = formulaLead.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const records = rows.map((row) =>
    [
      row.keyword,
      row.category,
      row.monthlyVolume === null
        ? row.rawVolume === "<10"
          ? "<10"
          : ""
        : String(row.monthlyVolume),
      row.snapshotDate,
      String(row.volumeMin),
      String(row.volumeMax),
    ]
      .map(quote)
      .join(","),
  );
  return `\uFEFF${[...requiredHeaders, "volume_min", "volume_max"].join(",")}\r\n${records.join("\r\n")}${records.length > 0 ? "\r\n" : ""}`;
}
