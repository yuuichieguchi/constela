import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Bundle all dependencies for browser usage
  noExternal: ['marked', 'dompurify', 'shiki'],
});
