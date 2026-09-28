import { createApp } from "./app";
import { readConfig } from "./config";
import { openDatabase } from "./database";
import { startScheduler } from "./scheduler";

const config = readConfig(process.env);
const database = openDatabase(config.databasePath);
const app = createApp(database, config);
const stopScheduler = startScheduler(database, config);
const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch(request, runtime) {
    if (new URL(request.url).pathname === "/api/collect")
      runtime.timeout(request, 0);
    return app.fetch(request);
  },
  idleTimeout: 255,
});
console.info(
  JSON.stringify({
    level: "info",
    event: "server_started",
    url: server.url.toString(),
    schedulerEnabled: config.schedulerEnabled,
  }),
);
function shutdown(): void {
  stopScheduler();
  server.stop(true);
  database.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
