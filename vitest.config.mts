import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@/src': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['tests/**/*.test.{ts,mjs}'], environment: 'node', clearMocks: true },
});
