import { createHmac } from "node:crypto";
import ky, { HTTPError, TimeoutError } from "ky";
import { z } from "zod";
import type { SnapshotInput, TrackedKeyword } from "../shared/contracts";
import type { Config } from "./config";
import { normalizeKeyword } from "./database";
import { DomainError } from "./errors";

const CountSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^(?:\d+|<\s*10)$/),
]);
const SearchAdResponseSchema = z.looseObject({
  keywordList: z.array(
    z.looseObject({
      relKeyword: z.string(),
      monthlyPcQcCnt: CountSchema,
      monthlyMobileQcCnt: CountSchema,
    }),
  ),
});
export type SearchAdResponse = Readonly<z.infer<typeof SearchAdResponseSchema>>;
export function signature(secret: string, timestamp: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.GET./keywordstool`)
    .digest("base64");
}
export function parseCount(value: number | string): {
  readonly value: number | null;
  readonly min: number;
  readonly max: number;
} {
  const parsed = CountSchema.parse(value);
  if (typeof parsed === "string" && parsed.startsWith("<"))
    return { value: null, min: 0, max: 9 };
  const exact = Number(parsed);
  return { value: exact, min: exact, max: exact };
}
export function snapshotFromResponse(
  response: SearchAdResponse,
  keyword: TrackedKeyword,
  date: string,
): SnapshotInput {
  const match = response.keywordList.find(
    (row) =>
      normalizeKeyword(row.relKeyword) === normalizeKeyword(keyword.keyword),
  );
  if (!match)
    throw new DomainError(
      `“${keyword.keyword}”의 정확히 일치하는 검색량을 찾지 못했습니다. 키워드 표기를 확인하세요.`,
      503,
    );
  const pc = parseCount(match.monthlyPcQcCnt);
  const mobile = parseCount(match.monthlyMobileQcCnt);
  return {
    keyword: keyword.keyword,
    category: keyword.category,
    snapshotDate: date,
    monthlyVolume:
      pc.value === null || mobile.value === null
        ? null
        : pc.value + mobile.value,
    volumeMin: pc.min + mobile.min,
    volumeMax: pc.max + mobile.max,
    rawVolume: `PC:${match.monthlyPcQcCnt};MOBILE:${match.monthlyMobileQcCnt}`,
  };
}
export async function fetchSearchAd(
  config: Config,
  keyword: string,
): Promise<SearchAdResponse> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const timestamp = String(Date.now());
    try {
      const result = await ky
        .get("https://api.searchad.naver.com/keywordstool", {
          searchParams: {
            hintKeywords: normalizeKeyword(keyword),
            showDetail: "1",
          },
          headers: {
            "X-Timestamp": timestamp,
            "X-API-KEY": config.apiKey,
            "X-Customer": config.customerId,
            "X-Signature": signature(config.secretKey, timestamp),
          },
          timeout: 15_000,
          retry: 0,
        })
        .json<unknown>();
      return SearchAdResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof HTTPError) {
        if (error.response.status === 429 && attempt < 2) {
          const requestedDelay = Number(
            error.response.headers.get("retry-after"),
          );
          await Bun.sleep(
            Math.min(
              5_000,
              Math.max(
                1_000,
                Number.isFinite(requestedDelay)
                  ? requestedDelay * 1000
                  : 1000 * (attempt + 1),
              ),
            ),
          );
          continue;
        }
        throw new DomainError(
          `네이버 검색광고 API 요청 실패 (HTTP ${error.response.status}). API 키·고객 ID·호출 한도를 확인하세요.`,
          503,
        );
      }
      if (error instanceof TimeoutError)
        throw new DomainError(
          "네이버 검색광고 API 응답 시간이 초과되었습니다.",
          503,
        );
      if (error instanceof z.ZodError)
        throw new DomainError(
          "네이버 검색광고 응답 형식이 예상과 다릅니다. 검색량은 저장하지 않았습니다.",
          503,
        );
      throw error;
    }
  }
  throw new DomainError(
    "네이버 검색광고 호출 한도를 초과했습니다. 잠시 후 다시 실행하세요.",
    503,
  );
}
