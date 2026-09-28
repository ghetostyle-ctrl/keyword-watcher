import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "hono/bun";
import { z } from "zod";
import { KeywordInputSchema } from "../shared/contracts";
import { KeywordBatchInputSchema } from "../shared/keyword-batch";
import { collect } from "./collector";
import type { Config } from "./config";
import { exportCsv, parseCsv } from "./csv";
import { getDashboard, koreaDate } from "./dashboard";
import {
  getKeywords,
  getSnapshots,
  importSnapshots,
  setKeywordActive,
  upsertKeyword,
} from "./database";
import { DomainError } from "./errors";
import { registerKeywordBatch } from "./keyword-batch";
import { getRuns } from "./runs";
import { getStatus } from "./scheduler";

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const QuerySchema = z.object({
  days: z.enum(["7", "14", "30"]).default("7"),
  category: z.string().max(40).optional(),
});
export function createApp(db: Database, config: Config): Hono {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (!localHosts.has(new URL(c.req.url).hostname))
      return c.json({ error: "로컬 주소에서만 사용할 수 있습니다." }, 403);
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    await next();
  });
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 2_200_000,
      onError: (c) => c.json({ error: "파일은 2MB 이하여야 합니다." }, 413),
    }),
  );
  app.use("/api/*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("Origin");
      if (origin) {
        let parsed: URL;
        try {
          parsed = new URL(origin);
        } catch (error) {
          if (error instanceof TypeError)
            throw new DomainError("유효하지 않은 요청 출처입니다.", 403);
          throw error;
        }
        if (
          !localHosts.has(parsed.hostname) ||
          !["http:", "https:"].includes(parsed.protocol)
        )
          throw new DomainError("로컬 앱에서 요청하세요.", 403);
      }
      if (
        c.req.header("Sec-Fetch-Site") === "cross-site" ||
        c.req.header("X-Requested-With") !== "TrendWatch"
      )
        throw new DomainError("앱 화면에서 요청하세요.", 403);
      if (!c.req.header("Content-Type")?.includes("application/json"))
        throw new DomainError("JSON 형식으로 요청하세요.", 400);
    }
    await next();
  });
  app.get("/api/dashboard", (c) => {
    const query = QuerySchema.parse(c.req.query());
    const days = query.days === "14" ? 14 : query.days === "30" ? 30 : 7;
    return c.json(
      getDashboard(db, {
        days,
        ...(query.category ? { category: query.category } : {}),
      }),
    );
  });
  app.get("/api/keywords", (c) => c.json({ keywords: getKeywords(db) }));
  app.post("/api/keywords/batch", async (c) =>
    c.json(
      registerKeywordBatch(
        db,
        KeywordBatchInputSchema.parse(await c.req.json<unknown>()),
      ),
      201,
    ),
  );
  app.post("/api/keywords", async (c) =>
    c.json(
      {
        keyword: upsertKeyword(
          db,
          KeywordInputSchema.parse(await c.req.json<unknown>()),
        ),
      },
      201,
    ),
  );
  app.patch("/api/keywords/:id", async (c) => {
    const id = z.coerce.number().int().positive().parse(c.req.param("id"));
    const { active } = z
      .object({ active: z.boolean() })
      .parse(await c.req.json<unknown>());
    return c.json({ keyword: setKeywordActive(db, id, active) });
  });
  app.get("/api/status", (c) => c.json(getStatus(db, config)));
  app.get("/api/runs", (c) => c.json({ runs: getRuns(db) }));
  app.post("/api/collect", async (c) =>
    c.json(await collect(db, config, "manual")),
  );
  app.post("/api/import", async (c) => {
    const body = z
      .object({ csv: z.string().min(1).max(2_100_000) })
      .parse(await c.req.json<unknown>());
    const rows = parseCsv(body.csv, koreaDate());
    importSnapshots(db, rows);
    return c.json({ imported: rows.length });
  });
  app.get("/api/export", (c) => {
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="trendwatch-${koreaDate()}.csv"`,
    );
    return c.body(exportCsv(getSnapshots(db)));
  });
  app.all("/api/*", (c) =>
    c.json({ error: "API 경로를 찾을 수 없습니다." }, 404),
  );
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
  app.onError((error, c) => {
    if (error instanceof DomainError)
      return c.json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return c.json(
        { error: error.issues.map((issue) => issue.message).join(" ") },
        400,
      );
    if (error instanceof SyntaxError)
      return c.json({ error: "요청 형식을 확인하세요." }, 400);
    console.error(
      JSON.stringify({
        level: "error",
        event: "request_failed",
        path: c.req.path,
      }),
    );
    return c.json(
      { error: "요청을 처리하지 못했습니다. 서버 상태를 확인하세요." },
      500,
    );
  });
  return app;
}
