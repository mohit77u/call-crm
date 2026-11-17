import "reflect-metadata";
import { AppDataSource, bootstrapSchema, seedSuperadmin } from "./database";
import { createApp } from "./app";
import { config } from "./config";
import { startImportWorker } from "./modules/leads/import-queue";

async function main() {
  await AppDataSource.initialize();
  await bootstrapSchema();
  await seedSuperadmin();
  startImportWorker();

  const app = createApp();
  app.listen(config.port, () => {
    const publicUrl = config.publicUrl || `http://localhost:${config.port}`;
    console.log(`Call CRM API listening on ${publicUrl}`);
    if (config.publicUrl) console.log(`(local bind: http://localhost:${config.port})`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
