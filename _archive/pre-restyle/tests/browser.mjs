import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import { WebSocket } from 'ws';
import { startServer } from '../server.mjs';
import { createGame, reduce } from '../engine.mjs';

const root = path.resolve(import.meta.dirname, '..'), shots = path.join(root, 'shots');
await mkdir(shots, { recursive: true });
const profile = path.join(shots, `chrome-test-${Date.now()}`), tmp = path.join(shots, 'tmp'); await mkdir(tmp, { recursive: true });
const app = startServer({ port: 0 }); await once(app.server, 'listening'); const origin = `http://127.0.0.1:${app.server.address().port}`;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless','--use-mock-keychain','--password-store=basic', '--no-sandbox', '--no-first-run', '--disable-default-apps', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-breakpad', '--disable-crash-reporter', '--disable-crashpad-for-testing', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { env: { ...process.env, TMPDIR: tmp, HOME: path.join(shots, 'chrome-home') }, stdio: ['ignore', 'ignore', 'pipe'] });
let logs = ''; chrome.stderr.on('data', data => { logs += data.toString(); });
const errors = [], report = { screenshots: [], checks: [], errors };
async function wait(fn, timeout = 15000) { const start = Date.now(); while (Date.now() - start < timeout) { const result = await fn(); if (result) return result; await new Promise(r => setTimeout(r, 75)); } throw new Error('Browser verification timed out.'); }
let socket;
try {
  const portText = await wait(async () => { try { return await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'); } catch { return false; } }, 20000);
  const port = Number(portText.split('\n')[0]); const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl); await once(socket, 'open');
  let id = 0; const pending = new Map();
  socket.on('message', data => { const m = JSON.parse(data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ': ' + (m.params.exceptionDetails.exception?.description || '')); else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text); });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); socket.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  await call('Runtime.enable'); await call('Log.enable'); await call('Page.enable'); await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  async function screenshot(name) { await new Promise(r => setTimeout(r, 450)); const data = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); const file = path.join(shots, `${name}.png`); await writeFile(file, Buffer.from(data.data, 'base64')); report.screenshots.push(file); console.log(`Captured ${name}`); }
  await call('Page.navigate', { url: `${origin}/?test=1` }); await wait(() => evaluate('!!window.__CALLIT__'));
  await wait(() => evaluate('window.__CALLIT__.scene.available || document.body.classList.contains("fallback")'));
  report.checks.push({ webgl: await evaluate('window.__CALLIT__.scene.available === true'), threeRevision: await evaluate('window.__CALLIT__.scene.renderer?.info ? "renderer initialized" : "fallback"') });
  await screenshot('01-lobby');
  let seed = 1;
  for (; seed < 1000; seed++) { let s = createGame({ seed, maxRounds: 4 }); for (const p of s.players) { s = reduce(s, p, { type: 'initialPeek', slots: [0, 1] }); s = reduce(s, p, { type: 'ready' }); } if (s.active === 'p0' && [7, 8, 9, 10].includes(s.deck.at(-1).value)) break; }
  await evaluate(`window.__CALLIT__.startSolo(${seed})`); await evaluate('window.__CALLIT__.act({type:"initialPeek",slots:[0,1]})'); await evaluate('window.__CALLIT__.act({type:"ready"})'); await wait(() => evaluate('window.__CALLIT__.getView().phase === "turn" && window.__CALLIT__.getView().active === "p0"'));
  await evaluate('window.__CALLIT__.act({type:"draw",source:"deck"})'); await screenshot('02-table-mid-turn');
  await evaluate('window.__CALLIT__.act({type:"discard",usePower:true})'); await evaluate('window.__CALLIT__.act({type:"power",slot:2})'); await screenshot('03-character-power');
  report.checks.push({ privatePower: await evaluate('({phase:__CALLIT__.getView().phase,power:__CALLIT__.getView().power,rank:__CALLIT__.getView().peek.value})') });
  await evaluate('window.__CALLIT__.act({type:"ack"})'); await wait(() => evaluate('window.__CALLIT__.getView().phase === "turn" && window.__CALLIT__.getView().active === "p0"'));
  await evaluate('window.__CALLIT__.act({type:"call"})'); await wait(() => evaluate('["roundEnd","gameEnd"].includes(window.__CALLIT__.getView().phase)')); await screenshot('04-round-end');
  report.checks.push({ resultVisible: await evaluate('!document.getElementById("results").hidden'), controls: await evaluate('[...document.querySelectorAll("button")].filter(b=>!b.disabled && b.getClientRects().length).map(b=>({label:b.textContent.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})).filter(b=>b.width<44 || b.height<44)') });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await screenshot('05-mobile-round-end');
  report.checks.push({ mobileOverflow: await evaluate('document.documentElement.scrollWidth > innerWidth') });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `${origin}/?test=1&fallback=1` }); await wait(() => evaluate('!!window.__CALLIT__')); await evaluate('window.__CALLIT__.startSolo(10)'); await screenshot('06-fallback-table');
  report.checks.push({ fallbackPlayable: await evaluate('document.body.classList.contains("fallback") && document.querySelectorAll(".card-slot").length===8') });
  await call('Page.navigate', { url: 'https://www.inspora.design/' }); await new Promise(r => setTimeout(r, 6000)); await screenshot('inspiration-inspora');
  const inspora = await evaluate('({title:document.title,font:getComputedStyle(document.body).fontFamily,background:getComputedStyle(document.body).backgroundColor,scrollHeight:document.documentElement.scrollHeight,links:[...document.querySelectorAll("a")].slice(0,14).map(a=>a.textContent.trim())})');
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 800, y: 450 }); await call('Runtime.evaluate', { expression: 'window.scrollBy(0,450)' }); await new Promise(r => setTimeout(r, 500)); report.checks.push({ inspora });
  console.log(JSON.stringify(report, null, 2));
} catch (e) { report.failure = e.stack; console.error(e.stack); process.exitCode = 1; }
finally { socket?.close(); chrome.kill('SIGTERM'); await app.close(); await writeFile(path.join(shots, 'chrome-verification.log'), logs); await writeFile(path.join(shots, 'browser-report.json'), JSON.stringify(report, null, 2)); }
