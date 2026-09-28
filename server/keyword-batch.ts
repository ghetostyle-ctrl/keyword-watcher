import type { Database } from "bun:sqlite";
import type {
  KeywordBatchInput,
  KeywordBatchResult,
} from "../shared/keyword-batch";
import { getKeywords, normalizeKeyword } from "./database";
import { DomainError } from "./errors";

export function registerKeywordBatch(
  db: Database,
  input: KeywordBatchInput,
): KeywordBatchResult {
  return db
    .transaction(() => {
      const tracked = getKeywords(db);
      const existing = new Set(
        tracked.map((row) => normalizeKeyword(row.keyword)),
      );
      const unique = new Map<string, KeywordBatchInput["keywords"][number]>();
      for (const keyword of input.keywords) {
        const normalized = normalizeKeyword(keyword.keyword);
        if (!unique.has(normalized)) unique.set(normalized, keyword);
      }
      const additions = [...unique].filter(
        ([normalized]) => !existing.has(normalized),
      );
      if (tracked.length + additions.length > 100)
        throw new DomainError(
          "키워드는 최대 100개까지 등록할 수 있습니다.",
          422,
        );

      const insert = db.query(
        "INSERT INTO tracked_keyword (keyword, normalized, category, created_at) VALUES (?, ?, ?, ?)",
      );
      const createdAt = new Date().toISOString();
      for (const [normalized, keyword] of additions)
        insert.run(keyword.keyword, normalized, keyword.category, createdAt);
      return {
        added: additions.length,
        existing: unique.size - additions.length,
        keywords: getKeywords(db),
      };
    })
    .immediate();
}
