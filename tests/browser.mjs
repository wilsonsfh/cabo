import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync('flock', ['-x', '-w', '120', '/tmp/chrome.lock', 'python3', 'tests/stack-browser.py'], { cwd: root, stdio: 'inherit' });
if (result.error) console.error('Sandbox QA requires flock, Python Playwright and /usr/bin/chromium:', result.error.message);
process.exitCode = result.status ?? 1;
