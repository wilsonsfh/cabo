import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startServer } from '../server.mjs';
const root = path.resolve(import.meta.dirname, '..'), shots = path.join(root, 'shots'), profile = path.join(shots, `chrome-multiplayer-${Date.now()}`);
await mkdir(profile, { recursive: true });
const app = startServer({ port: 0 }); await once(app.server, 'listening'); const origin = `http://127.0.0.1:${app.server.address().port}`;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless','--use-mock-keychain','--password-store=basic', '--no-sandbox', '--no-first-run', '--disable-background-networking', '--disable-sync', '--disable-breakpad', '--disable-crash-reporter', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { env: { ...process.env, TMPDIR: path.join(shots, 'tmp'), HOME: path.join(shots, 'chrome-home') }, stdio: ['ignore', 'ignore', 'pipe'] });
let log = ''; chrome.stderr.on('data', d => { log += d; }); const sockets = [], errors = [];
async function wait(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 40)); } throw new Error('Timed out'); }
async function target(port) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(origin + '/?test=1')}`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); sockets.push(ws); await once(ws, 'open'); let seq = 0; const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params); });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evalJS = async expression => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
  await call('Runtime.enable'); await call('Page.enable'); await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await wait(() => evalJS('!!window.__CALLIT__'));
  await evalJS('(async()=>{const {createBot}=await import("/engine.mjs");window.testBot=createBot(88)})()');
  return { call, evalJS };
}
try {
  const port = Number((await wait(async () => { try { return await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'); } catch { return false; } })).split('\n')[0]);
  const a = await target(port), b = await target(port);
  await a.evalJS('document.getElementById("name").value="Wilson";document.getElementById("create").click()'); const code = await wait(() => a.evalJS('__CALLIT__.getRoom()?.code'));
  await b.evalJS(`document.getElementById('name').value='A friend';document.getElementById('room-code').value='${code}';document.getElementById('join').click()`);
  await wait(() => a.evalJS('__CALLIT__.getRoom()?.connected.length === 2')); await a.evalJS('document.getElementById("start-match").click()'); await wait(() => b.evalJS('!!__CALLIT__.getView()'));
  let steps = 0, captured = false;
  while (steps++ < 2000) {
    const av = await a.evalJS('__CALLIT__.getView()'); if (av.phase === 'gameEnd') break;
    const bv = await b.evalJS('__CALLIT__.getView()'); if (av.version !== bv.version) { await new Promise(r => setTimeout(r, 40)); continue; }
    await a.evalJS('testBot.observe(__CALLIT__.getView())'); await b.evalJS('testBot.observe(__CALLIT__.getView())');
    const actor = av.phase === 'setup' ? !av.setup.ready ? a : b : av.phase === 'roundEnd' ? !av.roundReady.includes('p0') ? a : b : av.active === 'p0' ? a : b;
    await actor.evalJS('__CALLIT__.act(testBot.action(__CALLIT__.getView()))');
    if (!captured && av.phase === 'turn') {
      const shot = await a.call('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(shots, '07-networked-table.png'), Buffer.from(shot.data, 'base64')); captured = true;
    }
    await new Promise(r => setTimeout(r, 45));
  }
  const av = await a.evalJS('__CALLIT__.getView()'), bv = await b.evalJS('__CALLIT__.getView()');
  assert.equal(av.phase, 'gameEnd'); assert.deepEqual(av.result, bv.result); assert.equal(av.history.length, 4);
  const shot = await a.call('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(shots, '08-networked-game-end.png'), Buffer.from(shot.data, 'base64'));
  await a.evalJS('document.querySelector("#result-action button").click()'); await b.evalJS('document.querySelector("#result-action button").click()'); await wait(() => a.evalJS('__CALLIT__.getView().phase === "setup"'));
  assert.equal(errors.length, 0);
  console.log(JSON.stringify({ passed: true, twoIndependentTabs: true, fullRounds: av.history.length, steps, sharedResult: av.result, unanimousRematch: true, errors }, null, 2));
} finally { sockets.forEach(s => s.close()); chrome.kill('SIGTERM'); await app.close(); await writeFile(path.join(shots, 'browser-multiplayer-chrome.log'), log); }
