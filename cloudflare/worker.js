import { DurableObject } from 'cloudflare:workers';
import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
import { createProtocol } from './protocol.mjs';
class Socket extends EventEmitter {
  constructor(socket) {
    super(); this.socket = socket;
    socket.addEventListener('message', event => {
      if (typeof event.data !== 'string' || new TextEncoder().encode(event.data).length > 4096) return socket.close(1008, 'Frame too large');
      this.emit('message', Buffer.from(event.data));
    });
    socket.addEventListener('close', () => this.emit('close'));
    socket.addEventListener('error', error => this.emit('error', error));
  }
  get readyState() { return this.socket.readyState; }
  send(message) { this.socket.send(message); }
  close(code, reason) { this.socket.close(code, reason); }
}
export class CaboHub extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.protocol = createProtocol(); }
  async fetch(request) {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response('Forbidden', { status: 403 });
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept(); this.protocol.connect(new Socket(server));
    return new Response(null, { status: 101, webSocket: client });
  }
}
export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === '/ws') return env.CABO_HUB.getByName('lobby').fetch(request);
    return env.ASSETS.fetch(request);
  }
};
