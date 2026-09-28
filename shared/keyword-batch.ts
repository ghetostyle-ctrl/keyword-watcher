import { z } from "zod";
import { KeywordInputSchema, TrackedKeywordSchema } from "./contracts";

export const KeywordBatchInputSchema = z.object({
  keywords: z.array(KeywordInputSchema).min(1).max(50),
});
export type KeywordBatchInput = Readonly<
  z.infer<typeof KeywordBatchInputSchema>
>;

export const KeywordBatchResultSchema = z.object({
  added: z.number().int().nonnegative(),
  existing: z.number().int().nonnegative(),
  keywords: z.array(TrackedKeywordSchema),
});
export type KeywordBatchResult = Readonly<
  z.infer<typeof KeywordBatchResultSchema>
>;
