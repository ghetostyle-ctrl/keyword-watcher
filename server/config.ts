import { z } from "zod";

const EnvSchema = z.object({
  HOST: z.enum(["127.0.0.1", "localhost", "::1"]).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  DATABASE_PATH: z.string().min(1).default("./data/trendwatch.sqlite"),
  NAVER_SEARCHAD_API_KEY: z.string().default(""),
  NAVER_SEARCHAD_SECRET_KEY: z.string().default(""),
  NAVER_SEARCHAD_CUSTOMER_ID: z.string().default(""),
  SCHEDULER_ENABLED: z.enum(["true", "false"]).default("false"),
  COLLECTION_HOUR: z.coerce.number().int().min(0).max(23).default(9),
});
export type Config = Readonly<{
  host: string;
  port: number;
  databasePath: string;
  apiKey: string;
  secretKey: string;
  customerId: string;
  schedulerEnabled: boolean;
  collectionHour: number;
}>;
export function readConfig(env: NodeJS.ProcessEnv): Config {
  const value = EnvSchema.parse(env);
  return {
    host: value.HOST,
    port: value.PORT,
    databasePath: value.DATABASE_PATH,
    apiKey: value.NAVER_SEARCHAD_API_KEY.trim(),
    secretKey: value.NAVER_SEARCHAD_SECRET_KEY.trim(),
    customerId: value.NAVER_SEARCHAD_CUSTOMER_ID.trim(),
    schedulerEnabled: value.SCHEDULER_ENABLED === "true",
    collectionHour: value.COLLECTION_HOUR,
  };
}
export function isConfigured(config: Config): boolean {
  return Boolean(config.apiKey && config.secretKey && config.customerId);
}
