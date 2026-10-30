// Cross-platform preview command, without changing the other reels' default variant.
import { fileURLToPath } from 'node:url';
const proc = Bun.spawn(['bunx', 'vite', ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, VITE_VARIANT: process.env.VITE_VARIANT ?? 'possibilities' },
  stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
});
process.exit(await proc.exited);
