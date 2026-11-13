import "reflect-metadata";
import { AppDataSource, bootstrapSchema, seedSuperadmin } from "./database";

async function main() {
  await AppDataSource.initialize();
  await bootstrapSchema();
  await seedSuperadmin();
  const rows = await AppDataSource.query("SELECT id, name, email FROM superadmins ORDER BY id");
  console.table(rows);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
