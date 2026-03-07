import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    seed: 'ts-node prisma/seed.ts',
    async onMigrate() {
      return {
        datasourceUrl: process.env.DATABASE_URL!,
      };
    },
  },
});

