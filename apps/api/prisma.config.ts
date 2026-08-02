import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://hrm:hrm_dev@localhost:5433/hrm_dev',
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
