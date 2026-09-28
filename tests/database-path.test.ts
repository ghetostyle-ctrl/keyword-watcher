import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { getKeywords, openDatabase, upsertKeyword } from "../server/database";

test("opens and reopens a database through a parent-relative existing directory", () => {
  // Given a unique directory outside the project, addressed through parent segments.
  const directory = mkdtempSync(join(tmpdir(), "trendwatch-path-"));
  const path = relative(process.cwd(), join(directory, "history.sqlite"));
  try {
    // When the configured relative database path is opened and subsequently reopened.
    const created = openDatabase(path);
    try {
      upsertKeyword(created, { keyword: "경로 검증", category: "검증" });
    } finally {
      created.close();
    }
    const reopened = openDatabase(path);
    try {
      // Then the same stored database is readable without a directory-creation error.
      expect(getKeywords(reopened)).toHaveLength(1);
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
