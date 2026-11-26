import * as THREE from 'three';

export const CAST = [
  ['Nib', '#dfe9c8', 'pebble'], ['Mote', '#edb878', 'round'], ['Tuck', '#97bec9', 'box'], ['Kiki', '#dfaa9e', 'round'],
  ['Loom', '#b0b4d5', 'box'], ['Peb', '#b5c89d', 'pebble'], ['Fenn', '#e5b55f', 'round'], ['Blink', '#92c7b8', 'peek'],
  ['Glint', '#a4d5cb', 'peek'], ['Scout', '#d9a483', 'spy'], ['Snoop', '#e8be91', 'spy'], ['Tangle', '#b0acd9', 'swap'],
  ['Orbit', '#c3b8e5', 'swap'], ['Rook', '#b47b68', 'box']
];
const gsap = window.gsap;
const GEOMETRY = {
  ball: new THREE.SphereGeometry(1, 10, 7), box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 5), gem: new THREE.OctahedronGeometry(1),
  ring: new THREE.TorusGeometry(1, .17, 5, 12)
};
const materials = new Map();
function material(color) { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .86, metalness: 0, flatShading: true })); return materials.get(color); }
function part(group, kind, color, position, scale) {
  const m = new THREE.Mesh(GEOMETRY[kind], material(color)); m.position.set(...position); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}
function creature(value) {
  const [name, color, kind] = CAST[value], g = new THREE.Group(); g.userData.name = name;
  part(g, kind === 'box' ? 'box' : kind === 'pebble' ? 'gem' : 'ball', color, [0, .30, 0], kind === 'box' ? [.56, .49, .42] : [.31, .33, .25]);
  part(g, 'ball', color, [-.16, .07, .12], [.12, .09, .16]); part(g, 'ball', color, [.16, .07, .12], [.12, .09, .16]);
  for (const x of [-.115, .115]) {
    part(g, 'ball', '#f6f1db', [x, .35, .22], [.08, .1, .045]); part(g, 'ball', '#243243', [x, .35, .26], [.035, .052, .025]);
  }
  part(g, 'box', '#243243', [0, .20, .251], [.09, .025, .015]);
  const left = part(g, 'ball', color, [-.32, .3, 0], [.1, .17, .1]); left.rotation.z = -.45;
  const right = part(g, 'ball', color, [.32, .3, 0], [.1, .17, .1]); right.rotation.z = .45;
  if (kind === 'peek') {
    for (const x of [-.16, .16]) { part(g, 'cone', color, [x, .69, -.02], [.07, .26, .07]); part(g, 'ball', '#f5cf65', [x, .83, -.02], [.08, .08, .08]); }
    const lens = part(g, 'ring', '#245c9b', [.28, .46, .27], [.13, .13, .13]); lens.rotation.y = -.2;
  } else if (kind === 'spy') {
    part(g, 'box', '#243243', [.30, .43, .27], [.19, .11, .25]); part(g, 'ball', '#f5cf65', [.30, .43, .42], [.09, .09, .02]);
    const fin = part(g, 'cone', color, [0, .68, -.08], [.18, .24, .10]); fin.rotation.z = .25;
  } else if (kind === 'swap') {
    const ring = part(g, 'ring', '#f5cf65', [0, .7, 0], [.28, .13, .28]); ring.rotation.x = Math.PI / 2;
    left.scale.y = right.scale.y = .24; left.rotation.z = -.85; right.rotation.z = .85;
    part(g, 'gem', '#f5cf65', [-.38, .45, .12], [.07, .07, .07]); part(g, 'gem', '#f5cf65', [.38, .45, .12], [.07, .07, .07]);
  } else if (value % 2 === 0) {
    const ear = part(g, 'cone', color, [-.18, .62, -.05], [.12, .24, .1]); ear.rotation.z = -.4;
    part(g, 'cone', color, [.18, .62, -.05], [.12, .24, .1]).rotation.z = .4;
  } else part(g, 'gem', '#f5cf65', [0, .67, -.02], [.07, .14, .07]);
  return g;
}
const textureCache = new Map();
function cardTexture(value) {
  const key = value === null ? 'back' : value;
  if (textureCache.has(key)) return textureCache.get(key);
  const c = document.createElement('canvas'); c.width = 256; c.height = 352; const x = c.getContext('2d');
  x.fillStyle = value === null ? '#243d60' : '#faf4df'; x.fillRect(0, 0, 256, 352);
  x.strokeStyle = value === null ? '#65809a' : '#d8cdb3'; x.lineWidth = 5; x.strokeRect(12, 12, 232, 328);
  if (value === null) {
    x.fillStyle = '#f5cf65'; x.beginPath(); x.moveTo(128, 87); x.lineTo(197, 172); x.lineTo(128, 257); x.lineTo(59, 172); x.closePath(); x.fill();
    x.fillStyle = '#243d60'; x.fillRect(100, 154, 14, 20); x.fillRect(142, 154, 14, 20); x.fillRect(113, 196, 30, 7);
    x.fillStyle = '#bed0d9'; x.font = 'bold 17px monospace'; x.textAlign = 'center'; x.fillText('CABO', 128, 305);
  } else {
    x.fillStyle = '#243243'; x.font = '900 57px sans-serif'; x.textAlign = 'left'; x.fillText(String(value), 25, 70);
    x.fillStyle = CAST[value][1]; x.fillRect(32, 97, 192, 170);
    x.fillStyle = '#243243'; x.font = 'bold 24px sans-serif'; x.textAlign = 'center'; x.fillText(CAST[value][0].toUpperCase(), 128, 308);
    const power = value >= 7 && value <= 12 ? value <= 8 ? 'PEEK' : value <= 10 ? 'SPY' : 'SWAP' : 'POINTS';
    x.font = 'bold 13px monospace'; x.fillText(power, 128, 331);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; textureCache.set(key, t); return t;
}
function cardObject(value) {
  const g = new THREE.Group();
  const side = material('#d8cdb3'), face = new THREE.MeshStandardMaterial({ map: cardTexture(value), roughness: .9 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.94, .065, 1.30), [side, side, face, side, side, side]);
  mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
  if (value !== null) { const char = creature(value); char.position.y = .04; char.scale.setScalar(.78); g.add(char); g.userData.character = char; }
  return g;
}
export class IslandScene {
  constructor({ canvas, onPick, onProject, reduced = false, forceFallback = false }) {
    this.canvas = canvas; this.onPick = onPick; this.onProject = onProject; this.reduced = reduced; this.cards = new Map(); this.pickables = []; this.mode = 'lobby'; this.version = -1; this.dirty = false; this.frame = null; this.hover = null;
    try {
      if (forceFallback) throw new Error('Fallback requested');
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(1); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
      this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(36, 1, .1, 80);
      this.scene.add(new THREE.HemisphereLight('#fff7df', '#80939a', 2.3));
      const sun = new THREE.DirectionalLight('#ffe7bd', 3.2); sun.position.set(-4, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -8; sun.shadow.camera.right = sun.shadow.camera.top = 8; sun.shadow.normalBias = .04; sun.shadow.bias = -.0001; this.scene.add(sun);
      const fill = new THREE.DirectionalLight('#b6d7ee', .8); fill.position.set(4, 3, -5); this.scene.add(fill);
      this.island = new THREE.Group(); this.scene.add(this.island); this.buildIsland();
      this.ray = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
      canvas.addEventListener('pointermove', e => this.pointerMove(e)); canvas.addEventListener('pointerleave', () => this.setHover(null));
      canvas.addEventListener('pointerdown', e => { if (e.isPrimary === false) return; const key = this.pick(e); if (key) this.onPick(key); });
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.fallback(); });
      window.addEventListener('resize', () => this.resize()); document.addEventListener('visibilitychange', () => { if (!document.hidden) this.requestRender(); });
      this.idle = setInterval(() => {
        if (document.hidden || this.reduced || this.mode !== 'lobby') return;
        const time = performance.now() / 1000; this.decorations.forEach((g, i) => { g.rotation.y = Math.sin(time * .5 + i) * .07; }); this.requestRender();
      }, 200);
      this.resize(); this.showLobby();
    } catch (e) { console.warn('3D unavailable; accessible card table remains playable.', e.message); this.fallback(); }
  }
  fallback() { this.available = false; document.body.classList.add('fallback'); document.getElementById('fallback').hidden = false; this.canvas.hidden = true; }
  buildIsland() {
    const land = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 3.65, .95, 10), material('#c99370')); land.position.y = -.48; land.receiveShadow = true; land.castShadow = true; this.island.add(land);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(4.78, 4.78, .20, 10), material('#f1d99c')); lip.position.y = .04; lip.receiveShadow = true; this.island.add(lip);
    const tabletop = new THREE.Mesh(new THREE.CylinderGeometry(4.51, 4.51, .13, 10), material('#789c88')); tabletop.position.y = .20; tabletop.receiveShadow = true; this.island.add(tabletop);
    this.boardY = .30;
    const recess = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.05, .014, 10), material('#648873')); recess.position.y = .272; recess.receiveShadow = true; this.island.add(recess);
    const cloudMat = material('#f7f7ed');
    for (const [x, z, scale] of [[-6, -1, 1], [5.7, -3, .7], [3, 5, .5], [-4.5, 4, .65]]) {
      const cloud = new THREE.Group(); cloud.position.set(x, -.9, z); cloud.scale.setScalar(scale); this.scene.add(cloud);
      for (let i = 0; i < 3; i++) { const puff = new THREE.Mesh(GEOMETRY.ball, cloudMat); puff.scale.set(.8, .3 + i * .03, .5); puff.position.x = (i - 1) * .55; cloud.add(puff); }
    }
    for (const [x, z, rotation] of [[-4.0, -2.2, -.5], [4.05, -1.8, .6], [-3.8, 2.65, 1.2], [3.8, 2.5, -1]]) {
      const shrub = new THREE.Group(); shrub.position.set(x, .29, z); shrub.rotation.y = rotation;
      part(shrub, 'box', '#ac7756', [0, .12, 0], [.35, .25, .35]); part(shrub, 'gem', '#426c63', [0, .52, 0], [.5, .65, .4]); part(shrub, 'gem', '#a5bf94', [.2, .57, .03], [.3, .45, .3]); this.island.add(shrub);
    }
    const stones = new THREE.InstancedMesh(GEOMETRY.gem, material('#ead6a9'), 18), dummy = new THREE.Object3D();
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; dummy.position.set(Math.cos(a) * 4.2, .31, Math.sin(a) * 4.2); dummy.scale.set(.10, .08, .14); dummy.rotation.y = a; dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix); } this.island.add(stones);
    this.decorations = [];
    for (const [value, x, z] of [[7, -1.35, 0], [9, 0, -.15], [12, 1.35, .10]]) { const g = creature(value); g.position.set(x, .36, z); g.scale.setScalar(1.8); g.rotation.y = -.1 + x * .08; this.island.add(g); this.decorations.push(g); }
    const sign = cardObject(null); sign.position.set(0, .34, 1.7); sign.rotation.y = -.15; this.island.add(sign); this.lobbyCard = sign;
  }
  resize() {
    if (!this.renderer) return;
    this.width = this.canvas.clientWidth || innerWidth; this.height = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(Math.round(this.width / 1.35), Math.round(this.height / 1.35), false); this.camera.aspect = this.width / this.height; this.camera.updateProjectionMatrix(); this.positionCamera(); this.requestRender();
  }
  positionCamera() {
    const compact = this.width < 760;
    if (this.mode === 'lobby') {
      if (compact) { this.camera.position.set(0, 16, 18); this.camera.lookAt(0, 3.4, 0); }
      else { this.camera.position.set(-3.6, 10.8, 13.5); this.camera.lookAt(-3.6, .3, 0); }
    } else {
      const ended = compact && ['roundEnd', 'gameEnd'].includes(this.view?.phase);
      this.camera.position.set(0, compact ? ended ? 21 : 17.8 : 11.8, compact ? ended ? 20 : 17 : 13.4);
      this.camera.lookAt(0, compact ? ended ? -3 : .9 : .1, 0);
    }
    this.camera.updateMatrixWorld();
  }
  requestRender() { if (!this.renderer || document.hidden || this.frame) return; this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); }); }
  render() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera); const points = {};
    for (const [key, group] of this.cards) if (key.startsWith('hand:')) {
      const v = group.position.clone(); v.z += .78; v.y += .08; v.project(this.camera); points[key] = { x: (v.x + 1) * this.width / 2, y: (1 - v.y) * this.height / 2 };
    }
    this.onProject(points); this.available = true;
  }
  showLobby() { this.mode = 'lobby'; if (!this.renderer) return; this.decorations.forEach(g => { g.visible = true; }); this.lobbyCard.visible = true; this.cards.forEach(g => { g.visible = false; }); this.positionCamera(); this.requestRender(); }
  update(view, { instant = false, selected = [] } = {}) {
    this.mode = 'game'; this.view = view; this.selected = selected; if (!this.renderer) return;
    this.decorations.forEach(g => { g.visible = false; }); this.lobbyCard.visible = false; this.positionCamera();
    const self = view.viewer, other = view.players.find(p => p !== self); const entries = [];
    for (const [owner, z] of [[other, -1.83], [self, 1.83]]) {
      const hand = view.hands[owner];
      hand.forEach(c => entries.push({ key: `hand:${owner}:${c.slot}`, value: c.value, x: (c.slot - 1.5) * 1.26, z, selected: selected.includes(`${owner}:${c.slot}`) }));
    }
    entries.push({ key: 'deck', value: null, x: -.95, z: 0 });
    if (view.discard) entries.push({ key: 'discard', value: view.discard.value, x: .50, z: 0 });
    if (view.held) entries.push({ key: 'held', value: view.held.value, x: 2.2, z: 0 });
    const keep = new Set(entries.map(e => e.key));
    for (const [key, g] of this.cards) if (!keep.has(key)) { this.destroyCard(g); this.cards.delete(key); }
    this.pickables = [];
    const animate = !instant && !this.reduced && this.version !== view.version;
    const ended = ['roundEnd', 'gameEnd'].includes(view.phase);
    for (const entry of entries) {
      let g = this.cards.get(entry.key); const changed = !g || g.userData.value !== entry.value;
      if (changed) {
        if (g) this.destroyCard(g);
        g = cardObject(entry.value); g.userData = { ...g.userData, key: entry.key, value: entry.value }; this.island.add(g); this.cards.set(entry.key, g);
      }
      g.visible = true; g.position.x = entry.x; g.position.z = entry.z; g.position.y = this.boardY + (entry.selected ? .14 : 0); g.rotation.y = 0;
      gsap.killTweensOf(g.position);
      g.traverse(o => { if (o.isMesh) { o.userData.pickKey = entry.key; this.pickables.push(o); } });
      if (animate && entry.key === 'held') {
        g.position.x = view.held.source === 'deck' ? -.95 : .50;
        gsap.to(g.position, { x: entry.x, duration: .22, ease: 'power3.out', overwrite: true, onUpdate: () => this.requestRender() });
      }
      if (changed && animate && entry.value !== null) {
        const char = g.userData.character;
        if (char) {
          char.position.y = .01; char.scale.set(.80, .71, .80);
          const delay = ended ? [0, .05, .09, .12][Number(entry.key.split(':')[2]) % 4] || 0 : 0;
          gsap.timeline({ onUpdate: () => this.requestRender(), delay }).to(char.position, { y: .04, duration: .18, ease: 'power3.out' }, 0).to(char.scale, { x: .78, y: .78, z: .78, duration: .18, ease: 'back.out(1.2)' }, 0);
        }
      }
    }
    if (animate && view.lastEvent.type === 'swap') {
      const pair = view.lastEvent.targets.map(t => this.cards.get(`hand:${t.owner}:${t.slot}`));
      if (pair.every(Boolean)) {
        const destinations = pair.map(g => g.position.clone());
        pair.forEach((g, i) => { g.position.copy(destinations[1 - i]); gsap.to(g.position, { x: destinations[i].x, y: destinations[i].y, z: destinations[i].z, duration: .24, ease: 'power2.inOut', overwrite: true, onUpdate: () => this.requestRender() }); });
      }
    }
    if (animate && ['ability', 'peek', 'spy'].includes(view.lastEvent.type)) {
      const character = this.cards.get('discard')?.userData.character;
      if (character) { gsap.killTweensOf(character.rotation); gsap.timeline({ onUpdate: () => this.requestRender() }).to(character.rotation, { x: -.18, y: view.lastEvent.ability === 'spy' || view.lastEvent.type === 'spy' ? .35 : -.15, duration: .12, ease: 'power3.out' }).to(character.rotation, { x: 0, y: 0, duration: .12, ease: 'power3.out' }); }
    }
    const newCall = this.version !== view.version && view.lastEvent.type === 'call'; this.version = view.version;
    if (newCall && !instant && !this.reduced) this.burst(); this.requestRender();
  }
  destroyCard(g) {
    g.traverse(o => { gsap.killTweensOf(o.position); gsap.killTweensOf(o.rotation); gsap.killTweensOf(o.scale); });
    this.island.remove(g); const mesh = g.children[0]; mesh.geometry.dispose(); if (Array.isArray(mesh.material)) mesh.material[2].dispose();
  }
  burst() {
    if (this.burstTimeline) { this.burstTimeline.progress(1).kill(); }
    const sparks = new THREE.InstancedMesh(GEOMETRY.gem, material('#f5cf65'), 12); sparks.position.y = .6; this.island.add(sparks); const t = { progress: 0 }, dummy = new THREE.Object3D();
    this.burstTimeline = gsap.timeline({ onUpdate: () => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const r = 1 + t.progress * 2; dummy.position.set(Math.cos(a) * r, Math.sin(t.progress * Math.PI) * .8, Math.sin(a) * r); dummy.scale.setScalar(.08 * (1 - t.progress * .7)); dummy.rotation.y = t.progress * 3; dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix); } sparks.instanceMatrix.needsUpdate = true; this.requestRender(); }, onComplete: () => { this.island.remove(sparks); this.requestRender(); } });
    this.burstTimeline.to(t, { progress: 1, duration: .32, ease: 'power2.out' });
  }
  pick(e) {
    if (!this.renderer || !this.pickables.length) return null;
    const r = this.canvas.getBoundingClientRect(); this.pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray.intersectObjects(this.pickables, false)[0]?.object.userData.pickKey ?? null;
  }
  pointerMove(e) { if (!matchMedia('(hover:hover) and (pointer:fine)').matches || this.reduced) return; this.setHover(this.pick(e)); }
  setHover(key) {
    if (this.hover === key) return;
    if (this.hover && this.cards.has(this.hover)) {
      const g = this.cards.get(this.hover); gsap.to(g.position, { y: this.boardY, duration: .12, ease: 'power3.out', overwrite: true, onUpdate: () => this.requestRender() }); gsap.to(g.rotation, { z: 0, duration: .12, overwrite: true, onUpdate: () => this.requestRender() });
    }
    this.hover = key; this.canvas.style.cursor = key ? 'pointer' : 'default';
    if (key && this.cards.has(key) && !this.reduced) { const g = this.cards.get(key); gsap.to(g.position, { y: this.boardY + .09, duration: .16, ease: 'power3.out', overwrite: true, onUpdate: () => this.requestRender() }); gsap.to(g.rotation, { z: -.025, duration: .16, overwrite: true, onUpdate: () => this.requestRender() }); }
  }
  setReduced(value) { this.reduced = value; if (value) { this.setHover(null); this.burstTimeline?.progress(1).kill(); this.cards.forEach(g => g.traverse(o => { gsap.killTweensOf(o.position); gsap.killTweensOf(o.scale); })); } this.requestRender(); }
}
