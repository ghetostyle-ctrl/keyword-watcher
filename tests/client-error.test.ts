import { expect, test } from "bun:test";
import ky from "ky";
import { errorMessage } from "../src/api";

test("Ky parsed validation error is shown to the user", async () => {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      Response.json(
        { error: "2행: 월간 검색량이 비어 있습니다." },
        { status: 400 },
      ),
  });
  try {
    await ky.get(server.url, { retry: 0 });
    throw new Error("Expected HTTP error");
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    expect(await errorMessage(error)).toBe("2행: 월간 검색량이 비어 있습니다.");
  } finally {
    await server.stop(true);
  }
});
