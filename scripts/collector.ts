import { collect } from "../server/collector";
import { readConfig } from "../server/config";
import { openDatabase } from "../server/database";
import { DomainError } from "../server/errors";

const config = readConfig(process.env);
const db = openDatabase(config.databasePath);
try {
  const result = await collect(db, config, "cli");
  console.info(JSON.stringify(result));
} catch (error) {
  console.error(
    error instanceof DomainError
      ? error.message
      : "수집에 실패했습니다. 데이터베이스와 네트워크 연결을 확인하세요.",
  );
  process.exitCode = 1;
} finally {
  db.close();
}
