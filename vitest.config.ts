import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/extension/**/*.ts'],
      exclude: ['src/extension/main.ts', 'src/extension/commands/**'],
    },
    alias: {
      vscode: '/src/test/mocks/vscode.ts',
    },
  },
});
