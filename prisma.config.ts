import "dotenv/config";
import { defineConfig } from "prisma/config";

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasourceUrl,
  migrate: {
    seed: 'ts-node prisma/seed.ts',
  },
});

