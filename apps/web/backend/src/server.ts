import "reflect-metadata";
import { AppDataSource, bootstrapSchema, seedSuperadmin } from "./database";
import { createApp } from "./app";
import { config } from "./config";

async function main() {
  await AppDataSource.initialize();
  await bootstrapSchema();
  await seedSuperadmin();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Call CRM API listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
