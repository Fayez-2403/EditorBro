import { defineConfig, normalizePath, type Plugin } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const assetDirs = ['audio', 'data'];
// The Microsoft-Decision-1 explainer is the default: `bunx vite` serves audio/decision/voiceover.mp3 and
// data/decision/*.json where the engine asks for the 16:9 ones. The default is now the five-repos reel (repos);
// VITE_VARIANT=decision / reel serve the earlier reels, VITE_VARIANT=wide (or empty, as render.ts passes it) the 16:9 video.
// (default now: gh1, Part 1 of the GitHub Trending series)
const variant = (process.env.VITE_VARIANT ?? 'gh1') === 'wide' ? '' : (process.env.VITE_VARIANT ?? 'gh1');
process.env.VITE_VARIANT = variant; // exposed to the app as import.meta.env.VITE_VARIANT
const variantFiles = ['/audio/voiceover.mp3', '/data/lyrics.json', '/data/audio.json'];

// Git can check out directory symlinks as plain files on Windows. Serve the
// original assets through Vite and copy them into builds without using symlinks.
function repoAssets(): Plugin {
  return {
    name: 'repo-assets',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const file = variantFiles.find((f) => req.url?.split('?')[0] === f);
        // grokbot_* preview variants (e.g. grokbot_sheet) share the Grok Bot reel's data and audio
        const dv = variant.startsWith('grokbot') ? 'grokbot' : variant.startsWith('dots') ? 'dots' : variant.startsWith('duet') ? 'duet' : variant.startsWith('carbonx') ? 'carbonx' : variant;   // dots_* / duet_* share their reel's data
        if (variant && file) req.url = file.replace(/\/([^/]+)$/, `/${dv}/$1`);
        // a variant's finished mix (voice + score, from sfx_mix.py) plays in place of the bare voice when it exists
        if (variant && file === '/audio/voiceover.mp3' && existsSync(path.join(repoRoot, 'audio', dv, 'mix.mp3'))) req.url = `/audio/${dv}/mix.mp3`;
        if (assetDirs.some((dir) => req.url?.startsWith(`/${dir}/`))) {
          req.url = `/@fs/${encodeURI(normalizePath(repoRoot))}${req.url}`;
        }
        next();
      });
    },
    writeBundle(options) {
      if (!options.dir) return;
      for (const dir of assetDirs) {
        cpSync(path.join(repoRoot, dir), path.join(options.dir, dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [repoAssets()],
  // PDOOM_NO_HMR=1: no live reload (export renders must not reload mid-run when a file changes)
  server: { port: 54173, strictPort: true, hmr: process.env.PDOOM_NO_HMR ? false : undefined, fs: { allow: [repoRoot] } },
  resolve: { alias: { '@root': repoRoot } },
  define: { 'import.meta.env.VITE_VARIANT': JSON.stringify(variant) },
  build: { target: 'esnext', assetsInlineLimit: 0 },
});
