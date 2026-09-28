import ky, { HTTPError } from "ky";
import { z } from "zod";
export const api = ky.create({
  prefix: "/api",
  timeout: 120000,
  retry: 0,
  headers: { "X-Requested-With": "TrendWatch" },
});
const ErrorSchema = z.object({ error: z.string() });
export async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const data: unknown = error.data;
    const parsed = ErrorSchema.safeParse(data);
    return parsed.success
      ? parsed.data.error
      : `요청을 처리하지 못했습니다. (${error.response.status})`;
  }
  return error instanceof Error
    ? error.message
    : "요청 중 오류가 발생했습니다.";
}
