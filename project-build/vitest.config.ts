import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Tests run in file mode even on Vercel, where the build (npm test first) has the vault variables set; tests that
  // need vault mode set them themselves.
  test: {
    include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 20000,
    env: { RETURN_ID: '', BLOB_READ_WRITE_TOKEN: '', DATA_ENCRYPTION_KEY: '', CRON_SECRET: '', ANTHROPIC_API_KEY: '' },
  },
});
