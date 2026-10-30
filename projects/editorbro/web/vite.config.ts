import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Every demos/<slug>/index.html is its own page, found automatically, so demos can be added without editing this file.
const demos = Object.fromEntries(
  readdirSync(resolve(__dirname, 'demos'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(__dirname, 'demos', d.name, 'index.html')))
    .map((d) => [`demo-${d.name}`, resolve(__dirname, 'demos', d.name, 'index.html')]),
);

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        reel: resolve(__dirname, 'reel.html'),
        ...demos,
      },
    },
  },
  esbuild: { target: 'es2022' },
});
