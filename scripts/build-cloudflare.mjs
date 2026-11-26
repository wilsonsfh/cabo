import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = root + '.cloudflare/site';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(root + 'client', output, { recursive: true });
await cp(root + 'engine.mjs', output + '/engine.mjs');
