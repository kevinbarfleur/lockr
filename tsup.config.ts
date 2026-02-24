import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  dts: false,
  minify: false,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
