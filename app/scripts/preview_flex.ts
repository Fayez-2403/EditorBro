// Preview Motion Flex (Claude cut) on http://localhost:54173: `bun run dev:flex` (the 29 s reel), or set
// VITE_VARIANT=flex_full first for the process intro + reel. Other variants keep their own defaults.
import { fileURLToPath } from 'node:url';
const proc = Bun.spawn(['bunx', 'vite', ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, VITE_VARIANT: process.env.VITE_VARIANT ?? 'flex' },
  stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
});
process.exit(await proc.exited);
