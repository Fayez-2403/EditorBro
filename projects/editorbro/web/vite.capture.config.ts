// A second dev server for frame capture: no HMR and no file watching, so edits elsewhere in the project can never
// reload a page halfway through a capture.  npx vite --config vite.capture.config.ts  (port 54211)
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

export default mergeConfig(base, defineConfig({
  server: { port: 54211, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } },
}));
