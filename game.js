// ===== game.js — พื้นหลายระดับ + ทางลาด + ชนหน้าผา/ของ + มอนสเตอร์มีชีวิต =====
const B = BABYLON;
const $ = id => document.getElementById(id);
const log = m => { const l = $('log'); l.style.display = 'block'; l.textContent += m + '\n'; };
// ระบบ HP อยู่ใน src/health.js (+ src/events.js) — ถ้าลืมใส่ <script> เกมยังเปิดได้ แต่จะไม่มีระบบ HP
const _HP = (typeof Health !== 'undefined' ? Health : null) || (log('ไม่พบ src/health.js — ตรวจ <script> ใน index.html (ต้องมาก่อน game.js)'), null);
const Cb = (typeof Combat !== 'undefined' ? Combat : null) || (log('ไม่พบ src/combat.js — ตรวจ <script> ใน index.html (ต้องมาก่อน game.js)'), null);
const Hx = _HP || { init() {}, register() {}, update() {}, damage() {} };

const engine = new B.Engine($('c'), false, { stencil: false });
engine.setHardwareScalingLevel(CFG.scale || 1);   // ลดพิกเซลที่ต้องวาด
const scene = new B.Scene(engine);

scene.clearColor = new B.Color4(0.38, 0.27, 0.39, 1);
scene.skipPointerMovePicking = true;
scene.autoClearDepthAndStencil = true;

// Create the procedural sunset sky.
try {
  if (typeof SunsetSky !== 'undefined') {
    SunsetSky.create(
      scene,
      B,
      typeof LIGHTING_CONFIG !== 'undefined'
        ? LIGHTING_CONFIG
        : {}
    );
  }
} catch (err) {
  console.warn('[sunset-sky] Could not create sky.', err);
}

// ===== จอ: แนวนอน + เต็มจอ =====
// ปรับที่ CFG.display ใน config.js:  landscape บังคับแนวนอน / fullscreen 'auto' (เข้าเต็มจอเองตอนแตะครั้งแรก) | 'button' (ปุ่มกด/กด F) | false
const DSP = Object.assign({ landscape: true, fullscreen: 'auto', lockOrientation: true, button: true }, CFG.display || {});
const Display = (() => {
  const root = document.documentElement, api = { blocked: false };
  // แคนวาสเต็มหน้าต่าง ไม่เลื่อน ไม่ซูม (ใช้ dvh กันแถบ URL บนมือถือบังจอ)
  const st = document.createElement('style');
  st.textContent = 'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;overscroll-behavior:none;touch-action:none}'
    + '#c{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100dvh;display:block;touch-action:none;outline:none}';
  document.head.appendChild(st);
  const meta = (n, c) => { let m = document.querySelector('meta[name="' + n + '"]'); if (!m) { m = document.createElement('meta'); m.name = n; document.head.appendChild(m); } m.content = c; };
  meta('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  meta('mobile-web-app-capable', 'yes'); meta('apple-mobile-web-app-capable', 'yes'); meta('theme-color', '#000000');   // เพิ่มลงหน้าโฮมแล้วเปิดเต็มจอได้ (iPhone)

  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const coarse = matchMedia('(pointer:coarse)').matches;                 // จอสัมผัส
  const lock = () => { if (DSP.lockOrientation && DSP.landscape && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); };   // ล็อกได้เฉพาะ Android/Chrome ตอนเต็มจอ
  async function enter() {
    if (!canFs || fsEl()) return;
    try { await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen()); } catch (e) { return; }
    lock();
  }
  const leave = () => { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f) f.call(document); };
  api.toggle = () => fsEl() ? leave() : enter();

  // ปุ่มเต็มจอมุมขวาบน
  let btn = null;
  if (DSP.button && DSP.fullscreen !== false && canFs) {
    btn = document.createElement('div'); btn.textContent = '⛶';
    btn.style.cssText = 'position:fixed;right:10px;top:10px;width:40px;height:40px;box-sizing:border-box;background:#000;border:2px solid #fff;border-radius:6px;color:#fff;font:700 22px sans-serif;display:flex;align-items:center;justify-content:center;z-index:30;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none';
    btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); api.toggle(); });
    document.body.appendChild(btn);
  }
  addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat && DSP.fullscreen !== false) api.toggle(); });
  if (DSP.fullscreen === 'auto' && canFs) {                              // ขอเต็มจอครั้งเดียวตอนแตะ/กดครั้งแรก (เบราว์เซอร์บังคับให้ต้องมีการแตะก่อน)
    const first = () => { removeEventListener('pointerup', first); removeEventListener('keydown', first); enter(); };
    addEventListener('pointerup', first); addEventListener('keydown', first);
  }

  // มือถือแนวตั้ง → คลุมจอด้วยข้อความให้หมุนเครื่อง และพักเกมไว้
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000;color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:100;font:700 18px sans-serif;text-align:center;padding:24px';
  ov.innerHTML = '<div style="font-size:54px;transform:rotate(90deg)">📱</div><div>กรุณาหมุนอุปกรณ์เป็นแนวนอน</div><div style="font:400 13px sans-serif;opacity:.7">Please rotate your device to landscape</div>';
  document.body.appendChild(ov);

  function layout() {
    engine.resize();
    if (btn) btn.textContent = fsEl() ? '✕' : '⛶';
    api.blocked = !!(DSP.landscape && coarse && innerHeight > innerWidth);
    ov.style.display = api.blocked ? 'flex' : 'none';
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 150));   // ค่าขนาดจอยังไม่อัปเดตทันทีตอนหมุน
  document.addEventListener('fullscreenchange', layout); document.addEventListener('webkitfullscreenchange', layout);
  if (window.visualViewport) visualViewport.addEventListener('resize', layout);
  layout();
  return api;
})();
// ---------- แสง: ปรับไฟเดิมผ่าน src/lighting.js ----------
// ไม่ได้ใส่แท็ก <script src="src/lighting.js"> ใน index.html → ใช้แสงเดิมก่อน แล้วโหลดไฟล์ให้เองทีหลัง (ระบบแสงจะปรับไฟเดิม ไม่สร้างซ้ำ)
let Lt = typeof Lighting !== 'undefined' ? Lighting : null, ltPending = false;
const ltQueue = [];   // โมเดลที่ spawn ก่อนระบบแสงพร้อม — ลงทะเบียนทอดเงาทีหลัง
function attachLighting() {   // ต่อพื้นรับเงา + ลงทะเบียนโมเดลที่ค้างอยู่
  if (!Lt) return;
  if (typeof LIGHTING_CONFIG === 'undefined' || (LIGHTING_CONFIG.receivers || {}).terrain !== false) Lt.addReceiver(ter);
  ltQueue.splice(0).forEach(a => Lt.register(...a));
}
if (Lt) Lt.init(scene, { B, engine, log });
else {
  new B.HemisphericLight('h', new B.Vector3(0.3, 1, -0.2), scene).intensity = 0.95;
  const sun = new B.DirectionalLight('s', new B.Vector3(-0.4, -1, 0.5), scene); sun.intensity = 0.55;
  ltPending = true;
  const s = document.createElement('script'); s.src = 'src/lighting.js';
  s.onload = () => { Lt = Lighting; ltPending = false; Lt.init(scene, { B, engine, log }); attachLighting(); console.info('[lighting] โหลด src/lighting.js ให้อัตโนมัติ — แนะนำเพิ่ม <script src="src/lighting.js"></script> ใน index.html'); };
  s.onerror = () => { ltPending = false; ltQueue.length = 0; log('โหลด src/lighting.js ไม่ได้ (404?) — ใช้แสงเดิม ไม่มีเงา ตรวจว่าไฟล์อยู่ที่ src/lighting.js'); };
  document.head.appendChild(s);
}

// ---------- กล้อง ----------
const cam = new B.FreeCamera('cam', new B.Vector3(0, 10, -9), scene);
cam.fov = CFG.cam.fov; cam.minZ = 0.5; cam.maxZ = CFG.farClip || 500;
const focus = new B.Vector3(0, 1, 0), pitch = CFG.cam.pitch * Math.PI / 180;
function updateCam(t, snap) {
  const k = snap ? 1 : 0.15;
  focus.x += (t.x - focus.x) * k; focus.z += (t.z - focus.z) * k; focus.y += (t.y + 1 - focus.y) * k;
  cam.position.set(focus.x, focus.y + CFG.cam.dist * Math.sin(pitch), focus.z - CFG.cam.dist * Math.cos(pitch));
  cam.setTarget(focus);
}

// ---------- แผนที่ → ความสูง ----------
const CELL = CFG.cell, COLS = MAP[0].length, ROWS = MAP.length, X0 = -COLS * CELL / 2, ZN = ROWS * CELL / 2;
const LV = CFG.lv || { ',': 0, g: 2, h: 4, A: 4, p: 0 };   // ระดับพื้น (ทราย 0 / หญ้า 3 / ที่ราบสูง 6 — ตั้งใน config.js)  // p = สะพานท่าเรือ (เดินได้ ไม่วาดพื้น)
const COL = { ',': '#e8d49a', g: '#79c24f', h: '#6fae45', A: '#e2c88a', p: '#9a6b3a' };
const RAMP = { '^': [0, 1], v: [0, -1], '>': [1, 0], '<': [-1, 0] };
const chAt = (c, i) => (c < 0 || i < 0 || c >= COLS || i >= ROWS) ? '.' : MAP[i][c];
// '=' = สะพานข้ามน้ำ: ความสูงเท่าฝั่งที่ติดกัน (ห้ามวางสะพานสองช่องติดกัน)
function flatH(c, i) { const ch = chAt(c, i); if (ch === '=') return flatH(c - 1, i) ?? flatH(c, i - 1) ?? 0; return LV[ch] ?? null; }
function rampBase(c, i) { const d = RAMP[chAt(c, i)]; return flatH(c - d[0], i + d[1]) ?? 0; }
// ความสูงมุม [NW, NE, SE, SW]
function corners(c, i) {
  const f = flatH(c, i); if (f !== null) return [f, f, f, f];
  const d = RAMP[chAt(c, i)]; if (!d) return [-1.5, -1.5, -1.5, -1.5];
  const b = rampBase(c, i), t = b + CFG.step;
  if (d[1] === 1) return [t, t, b, b];
  if (d[1] === -1) return [b, b, t, t];
  return d[0] === 1 ? [b, t, t, b] : [t, b, b, t];
}
function heightAt(x, z) {
  const u = (x - X0) / CELL, v = (ZN - z) / CELL, c = Math.floor(u), i = Math.floor(v);
  const h = corners(c, i), fx = u - c, fz = 1 - (v - i);
  const n = h[0] + (h[1] - h[0]) * fx, s = h[3] + (h[2] - h[3]) * fx;
  return s + (n - s) * fz;
}

// ทางเดิน: ช่องที่ศูนย์กลางห่างเส้นทางไม่เกิน 2.5 หน่วยจะถูกระบายสีดิน
function onPath(x, z) {
  return PATHS.some(pl => {
    for (let k = 0; k < pl.length - 1; k++) {
      const [ax, az] = pl[k], [bx, bz] = pl[k + 1], dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / ((dx * dx + dz * dz) || 1)));
      if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < (CFG.pathW || 2.5)) return true;
    }
    return false;
  });
}
// รั้วล้อมขอบหน้าผา/ริมน้ำ ของพื้นสูงทุกช่อง (ยกเว้นหาดทราย ท่าเรือ สะพาน และทางลาด)
function perimeterFence() {
  const out = [], NB = [[0, -1, 3, 2], [0, 1, 0, 1], [-1, 0, 1, 2], [1, 0, 0, 3]];
  for (let i = 0; i < ROWS; i++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[i][c];
    if (!(ch in LV) || ch === ',' || ch === 'p') continue;
    const h = flatH(c, i), x0 = X0 + c * CELL, z0 = ZN - (i + 1) * CELL;
    NB.forEach(([dc, di, ia, ib], k) => {
      const n = corners(c + dc, i + di);
      if (n[ia] >= h - 0.05 && n[ib] >= h - 0.05) return;
      if ((c + i) % (CFG.fenceStep || 1)) return;   // เว้นบางช่อง ลดจำนวนรั้ว
      const pos = [[x0 + 2, z0 + CELL - 0.4, 0], [x0 + 2, z0 + 0.4, 0], [x0 + 0.4, z0 + 2, Math.PI / 2], [x0 + CELL - 0.4, z0 + 2, Math.PI / 2]][k];
      out.push(['fenceE', pos[0], pos[1], pos[2]]);
    });
  }
  return out;
}

// ---------- สร้างพื้นเป็นเมชเดียว ----------
const P = [], N = [], C = [], I = [];
function quad(a, b, c, d, n, col) {
  const k = P.length / 3;
  [a, b, c, d].forEach(v => { P.push(v[0], v[1], v[2]); N.push(n[0], n[1], n[2]); C.push(col.r, col.g, col.b, 1); });
  I.push(k, k + 1, k + 2, k, k + 2, k + 3);
}
let sideCol;
function side(p, q, ha, hb, na, nb, n) {
  if ((ha - na) + (hb - nb) <= 0.01) return;
  const ba = Math.min(ha, na), bb = Math.min(hb, nb);
  quad([p[0], ha, p[1]], [q[0], hb, q[1]], [q[0], bb, q[1]], [p[0], ba, p[1]], n, sideCol);
}
for (let i = 0; i < ROWS; i++) for (let c = 0; c < COLS; c++) {
  const ch = MAP[i][c]; if (ch === '.' || ch === '=') continue;
  const h = corners(c, i), x0 = X0 + c * CELL, x1 = x0 + CELL, z1 = ZN - i * CELL, z0 = z1 - CELL;
  const shade = 0.95 + 0.06 * ((c + i) & 1) + 0.05 * Math.sin(c * 0.23) * Math.cos(i * 0.19);   // ลายหย่อมสีเบา ๆ ให้พื้นกว้างไม่จืด
  const top = B.Color3.FromHexString(RAMP[ch] ? '#a89b84' : (flatH(c, i) !== null && ch !== 'p' && onPath(x0 + CELL / 2, z0 + CELL / 2)) ? '#cfa66a' : COL[ch]).scale(shade);
  const sx = ((h[1] + h[2]) - (h[0] + h[3])) / 2 / CELL, sz = ((h[0] + h[1]) - (h[2] + h[3])) / 2 / CELL;
  const nl = Math.hypot(sx, 1, sz);
  quad([x0, h[0], z1], [x1, h[1], z1], [x1, h[2], z0], [x0, h[3], z0], [-sx / nl, 1 / nl, -sz / nl], top);
  sideCol = B.Color3.FromHexString(ch === ',' ? '#bfa86f' : ch === 'p' ? '#6e4a26' : '#848d97');
  const nb = (dc, di) => corners(c + dc, i + di);
  side([x0, z1], [x1, z1], h[0], h[1], nb(0, -1)[3], nb(0, -1)[2], [0, 0, 1]);
  side([x0, z0], [x1, z0], h[3], h[2], nb(0, 1)[0], nb(0, 1)[1], [0, 0, -1]);
  side([x0, z1], [x0, z0], h[0], h[3], nb(-1, 0)[1], nb(-1, 0)[2], [-1, 0, 0]);
  side([x1, z1], [x1, z0], h[1], h[2], nb(1, 0)[0], nb(1, 0)[3], [1, 0, 0]);
}
const vd = new B.VertexData(); vd.positions = P; vd.indices = I; vd.normals = N; vd.colors = C;
const ter = new B.Mesh('terrain', scene); vd.applyToMesh(ter);
const tm = new B.StandardMaterial('tm', scene); tm.specularColor = B.Color3.Black(); tm.backFaceCulling = false;
ter.material = tm; ter.isPickable = false; ter.freezeWorldMatrix();
attachLighting();   // พื้นรับเงา (+ลงทะเบียนโมเดลที่ spawn ไปก่อนหน้า)

const mat = hex => { const m = new B.StandardMaterial('m', scene); m.diffuseColor = B.Color3.FromHexString(hex); m.specularColor = B.Color3.Black(); return m; };
const sea = B.MeshBuilder.CreateGround('sea', { width: CFG.seaSize || 600, height: CFG.seaSize || 600 }, scene);
sea.position.y = -1; sea.material = mat('#3d9bd6'); sea.isPickable = false;
(typeof RINGS !== 'undefined' ? RINGS : [[-46, 34, '#c0392b', 3.5], [44, 0, '#e67e22', 3.5]]).forEach(([x, z, c, rad]) => {
  const d = B.MeshBuilder.CreateDisc('ring', { radius: rad || 3.5, tessellation: 48 }, scene);
  d.rotation.x = Math.PI / 2; d.position.set(x, heightAt(x, z) + 0.06, z); d.material = mat(c); d.isPickable = false;
});

// ---------- การชน ----------
const COLL = [];
const hitProp = (x, z) => COLL.some(c => (x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + 0.45) ** 2);
// บนสะพาน '=' เดินได้เฉพาะแนวกลาง (ไม่เดินออกข้างสะพานตกน้ำ)
function onBridge(x, z) {
  const c = Math.floor((x - X0) / CELL), i = Math.floor((ZN - z) / CELL);
  if (chAt(c, i) !== '=') return true;
  const ew = chAt(c - 1, i) !== '.' && chAt(c + 1, i) !== '.';
  return (ew ? Math.abs(z - (ZN - i * CELL - 2)) : Math.abs(x - (X0 + c * CELL + 2))) < 1.5;
}
function tryMove(p, nx, nz) {
  const gy = heightAt(p.x, p.z);
  const ok = (x, z) => { const h = heightAt(x, z); return h > -1 && Math.abs(h - gy) < 0.7 && !hitProp(x, z) && onBridge(x, z); };
  if (ok(nx, p.z)) p.x = nx;
  if (ok(p.x, nz)) p.z = nz;
}
function interior(x, z) {
  const c = Math.floor((x - X0) / CELL), i = Math.floor((ZN - z) / CELL), f = flatH(c, i);
  if (f === null) return false;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (flatH(c + a, i + b) !== f) return false;
  return true;
}
// พื้นที่ห้ามสุ่มของตกแต่ง (KEEPOUT ใน config.js) — กันต้นไม้/หินรกสนามต่อสู้ ถนน และท่าเรือ
const inKeepout = (x, z) => typeof KEEPOUT !== 'undefined' && KEEPOUT.some(k => x > k[0] && z > k[1] && x < k[2] && z < k[3]);
function expandScatter() {
  const out = [], pts = [[0, 0], ...PLACE.map(p => [p[1], p[2]])];
  SCATTER.forEach(([k, n, x1, z1, x2, z2, seed]) => {
    let s = seed * 9973 + 1; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    let got = 0, tries = 0;
    while (got < n && tries++ < n * 40) {
      const x = x1 + (x2 - x1) * rnd(), z = z1 + (z2 - z1) * rnd();
      if (!interior(x, z) || inKeepout(x, z) || onPath(x, z) || pts.some(q => (q[0] - x) ** 2 + (q[1] - z) ** 2 < 12)) continue;
      pts.push([x, z]); out.push([k, x, z, rnd() * 6.28]); got++;
    }
  });
  return out;
}

// ---------- โหลดโมเดล ----------
const fixTex = u => u.replace(/\/Textures\//i, '/');
try { B.Tools.PreprocessUrl = fixTex; } catch (e) {}
B.SceneLoader.OnPluginActivatedObservable.add(l => { if ('preprocessUrlAsync' in l || l.name === 'gltf') l.preprocessUrlAsync = u => Promise.resolve(fixTex(u)); });

const cache = {};
function load(path) { if (!cache[path]) cache[path] = tryLoad(path); return cache[path]; }
async function tryLoad(path) {
  const i = path.lastIndexOf('/') + 1, rawDir = CFG.base + path.slice(0, i), f = path.slice(i);
  // ลองชื่อโฟลเดอร์หลายแบบ (monster/monsters, Big/big ฯลฯ) เผื่อเครื่องหรือเว็บแยกตัวพิมพ์
  const dirs = [];
  for (const d of [rawDir, rawDir.replace(/\/monster(s?)\//i, '/monster$1/'), rawDir.replace(/\/monsters?\//i, '/Monster/')]) {
    for (const v of [d, d.replace(/\/(blob|big|flying)\//i, m => '/' + m.slice(1, 2).toUpperCase() + m.slice(2).toLowerCase())])
      if (!dirs.includes(v)) dirs.push(v);
  }
  const names = [...new Set([f, f[0].toUpperCase() + f.slice(1), f.replace(/(^|[_-])([a-z])/g, (m, a, b) => a + b.toUpperCase())])];
  let err = '';
  for (const dir of dirs) for (const n of names) {
    try { return await B.SceneLoader.LoadAssetContainerAsync(dir, n, scene); }
    catch (e) { err = (e && (e.message || e.reason || e)) + ''; }
  }
  log('โหลดไม่ได้: ' + rawDir + f + '\n  ลองแล้ว: ' + dirs.join(', ') + '\n  สาเหตุ: ' + err.slice(0, 150));
  return null;
}

let animDebugged = false, animConts = [];
const props = [];
const mobs = [];   // ← มอนสเตอร์ (tag 'mob'/'dummy') ที่มีชีวิต
Hx.init({ B, scene, engine, cam, canvas: $('c'), heightAt, mobs });

async function spawn(key, x, z, heading = 0, tag, dy = 0) {
  const p = PREFABS[key];
  if (p.flat) { const ch = chAt(Math.floor((x - X0) / CELL), Math.floor((ZN - z) / CELL)); if (!(ch in LV) || ch === 'p') return null; }
  const c = await load(p.f);
  const wrap = new B.TransformNode('w', scene);
  wrap.position.set(x, Math.max(heightAt(x, z), -1.1) + dy + (p.dy || 0), z);
  const fo = CFG.faceOffset + (p.fo || 0);
  wrap.rotation.y = heading + fo;
  const out = { wrap, tag, key, fo, play() {}, pause() {}, resume() {} };
  out.home = { x, z };          // จุดเกิด — ใช้เป็นเส้นสำหรับเดินกลับ
  out.homeRot = heading;        // ทิศหันหน้าเดิม
  out.heading = heading;
  out.state = 'idle';
  // ลงทะเบียนมอนสเตอร์ (dummy ใช้ค่า MOB_AI.dummy เสมอ, mob ใช้ค่าตาม prefab rogue/barbarian)
  if (tag === 'mob' || tag === 'dummy') {
    const ai = MOB_AI[tag === 'dummy' ? 'dummy' : key];
    if (ai) { out.ai = ai; out.hp = ai.hp; out.hpMax = ai.hp; mobs.push(out); Hx.register(out); }
  }
  if (p.r) COLL.push([x, z, p.r]);
  if (!c) {
    const m = B.MeshBuilder.CreateBox('ph', { size: 1.5 }, scene);
    m.position.y = 0.75; m.parent = wrap; m.material = mat('#ff40c0'); m.isPickable = false; return out;
  }
  const inst = c.instantiateModelsToScene(n => n, false, p.inst ? {} : { doNotInstantiate: true });
  const root = inst.rootNodes[0];
  root.parent = wrap; root.scaling.scaleInPlace(p.s || 1);
  const meshes = root.getChildMeshes();
  if (p.char) { meshes.forEach(m => { m.isPickable = false; }); setupAnims(root, out); }
  else if (p.mon) {   // มอนสเตอร์/NPC เห็ด: แอนิเมชันมากับไฟล์ .gltf เอง
    meshes.forEach(m => { m.isPickable = false; });
    root.position.y += p.hover || 0;
    setupMonAnims(inst, out, key);
  }
  else if (p.inst) {   // ของซ้ำเยอะ (รั้ว): ใช้ instance เบาเครื่อง ไม่โปร่งใส
    wrap.computeWorldMatrix(true);
    meshes.forEach(m => { m.isPickable = false; m.computeWorldMatrix(true); m.freezeWorldMatrix(); });
  } else {
    const prop = { meshes, v: 1 };
    meshes.forEach(m => { m.metadata = { prop }; });
    props.push(prop);
    wrap.computeWorldMatrix(true);
    meshes.forEach(m => { m.computeWorldMatrix(true); m.freezeWorldMatrix(); });
  }
  if (Lt) Lt.register(root, key, p); else if (ltPending) ltQueue.push([root, key, p]);   // ตัวละคร/มอน/โมเดลสำคัญทอดเงา (โมเดลที่โหลดทีหลังก็ถูกลงทะเบียนตอน spawn)
  return out;
}
const monLogged = new Set();
function setupMonAnims(inst, out, key) {
  const g = inst.animationGroups || [];
  g.forEach(a => a.stop());
  const find = rx => g.find(a => rx.test(a.name));
  const notIdle = /death|die|hit|attack|bite|punch|jump|dance|run|walk|fly|dash|duck|spin|wave|yes|no$/i;
  const A = { idle: find(/idle/i) || g.find(a => !notIdle.test(a.name)), move: find(/walk/i) || find(/run/i) || find(/fast_fly/i) || find(/fly/i) };   // ไม่มีท่า idle → ใช้ท่าสงบๆ ท่าแรกแทน
  g.forEach(a => { if (a !== A.idle && a !== A.move) a.dispose(); });   // ทิ้งท่าที่ไม่ใช้ ประหยัดเครื่อง
  if ((!A.idle || !A.move) && !monLogged.has(key) && monLogged.add(key)) log('แอนิเมชัน ' + key + ': idle=' + !!A.idle + ' move=' + !!A.move + '\n  ชื่อ: ' + g.map(a => a.name).join(', '));
  let cur = null;
  out.play = k => { if (cur === k || !A[k]) return; if (cur && A[cur]) A[cur].stop(); const a = A[k];
    if (k === 'idle') a.start(true, 0.9 + Math.random() * 0.2, a.from + Math.random() * (a.to - a.from), a.to);   // idle เริ่มคนละจังหวะ
    else a.start(true); cur = k; };
  out.pause = () => { if (cur && A[cur]) A[cur].pause(); };
  out.resume = () => { if (cur && A[cur]) A[cur].play(true); };
  out.play('idle');
}
// ===================== ระบบแอนิเมชันผู้เล่น (data-driven) =====================
// เพิ่มท่า/สถานะใหม่ = เพิ่ม 1 บรรทัดใน ANIM_STATES (หรือใส่ใน CFG.animSystem.states ที่ config.js) ไม่ต้องแก้โค้ดส่วนอื่น
//   clip      : ชื่อท่า (regex หรือลิสต์ regex เรียงตามลำดับความสำคัญ) — ค้นจากทุกไฟล์ใน CFG.anims
//   loop      : true = เล่นวน (ท่าเคลื่อนไหว) / ไม่ใส่ = เล่นครั้งเดียว (ท่า action)
//   speed     : ความเร็วเล่นท่า (1 = ปกติ)
//   randomStart: เริ่มคนละจังหวะ   lockMove: ระหว่างเล่นเดินไม่ได้   hold: เล่นจบแล้วค้างท่าสุดท้าย (เช่น ตาย)
// ไม่ใส่ท่า Jump_* ตามที่กำหนด (ไม่มีระบบกระโดด) — ถ้าต้องการในอนาคต ให้เพิ่ม state ใหม่ได้เลย
const ANIM_CFG = Object.assign({ blend: 0.1, debugKeys: false }, CFG.animSystem || {});
const ANIM_STATES = Object.assign({
  // --- ท่าเคลื่อนที่ (เลือกอัตโนมัติจากสถานะตัวละคร) ---
  idle:         { clip: [/^Idle_A$/i, /idle/i], loop: true, randomStart: true },
  walk:         { clip: [/^Walking_A$/i, /walk/i], loop: true },
  run:          { clip: [/^Running_A$/i, /run/i], loop: true },
  // --- Dash: มีท่า Dodge (อยู่ใน Rig_Medium_MovementAdvanced.glb ถ้ามี) ใช้ท่านั้น ไม่มีใช้ dashFallback ---
  dash:         { clip: [/dodge_forward/i, /dodge|roll|evade|sidestep/i] },
  dashFallback: { clip: [/^Running_B$/i, /run/i], loop: true, speed: 2 },
  // --- ท่า action จาก Rig_Medium_General (เรียกใช้ด้วย player.anim.act('ชื่อ')) ---
  idleAlt:      { clip: [/^Idle_B$/i], loop: true, randomStart: true },
  hit:          { clip: [/^Hit_A$/i] },
  hitAlt:       { clip: [/^Hit_B$/i] },
  death:        { clip: [/^Death_A$/i], lockMove: true, hold: true },
  deathAlt:     { clip: [/^Death_B$/i], lockMove: true, hold: true },
  interact:     { clip: [/^Interact$/i], lockMove: true },
  pickup:       { clip: [/^PickUp$/i], lockMove: true },
  throw:        { clip: [/^Throw$/i], lockMove: true },
  useItem:      { clip: [/^Use_Item$/i], lockMove: true },
  spawnGround:  { clip: [/^Spawn_Ground$/i], lockMove: true },
  spawnAir:     { clip: [/^Spawn_Air$/i], lockMove: true }
}, (typeof Combat !== 'undefined' && Combat.animStates) || {}, ANIM_CFG.states || {});   // ท่าต่อสู้มาจาก src/combat.js
const LOCO_FALLBACK = { walk: 'run', run: 'walk' };   // ไม่มีท่านี้ → ใช้ท่าใกล้เคียง
const ANIM_DEBUG_ORDER = ['hit', 'death', 'interact', 'pickup', 'throw', 'useItem', 'spawnGround', 'spawnAir', 'idleAlt'];   // ปุ่ม 1-9 (เมื่อเปิด debugKeys)

function setupAnims(root, out) {
  const map = {};
  root.getChildTransformNodes(false).concat(root.getChildMeshes()).forEach(n => { map[n.name] = n; });
  const groups = [];
  animConts.forEach(ac => ac && ac.animationGroups.forEach(g => {
    const cl = g.clone('c_' + g.name, t => map[t.name] || null); cl.stop(); groups.push(cl);
  }));
  groups.forEach(g => g.targetedAnimations.forEach(t => { t.animation.enableBlending = true; t.animation.blendingSpeed = ANIM_CFG.blend; }));   // ผสมท่าให้เปลี่ยนนุ่ม
  if (!window._clipList) { window._clipList = 1; console.info('[anims] ท่าที่โหลดได้ ' + groups.length + ' ท่า:', groups.map(g => g.name.replace(/^c_/, '')).join(', ')); }

  // จับคู่ state → AnimationGroup
  const states = {};
  for (const k in ANIM_STATES) {
    const d = ANIM_STATES[k]; let g = null, idx = -1;
    [].concat(d.clip).some((rx, i) => { g = groups.find(x => rx.test(x.name.replace(/^c_/, ''))); idx = i; return !!g; });   // เทียบกับชื่อคลิปเดิม (ตัด 'c_' ที่ใส่ตอน clone) ไม่งั้น regex แบบ ^ชื่อ$ จะไม่เจอ
    if (g) states[k] = Object.assign({}, d, { g, idx });
  }
  // ท่าต่อสู้ที่ต้องใช้ท่าสำรอง (ชื่อตรงไม่เจอ) → แจ้งบนจอครั้งเดียว จะได้รู้ว่าไฟล์ท่าไม่ถูกโหลด/ชื่อคลิปไม่ตรง
  const weakAtk = Object.keys(ANIM_STATES).filter(k => /^atk(?!2h|Dual)/.test(k) && (!states[k] || states[k].idx > 0));
  if (weakAtk.length && !window._atkWarned && (window._atkWarned = 1))
    log('ท่าฟันบางท่าไม่พบคลิปชื่อตรง: ' + weakAtk.join(', ') + '\n  ตรวจว่าโหลด weapon/Rig_Medium_CombatMelee.glb ใน CFG.anims แล้ว (ต้องอยู่ที่ assets/weapon/)');
  if (!animDebugged && (!states.idle || !(states.walk || states.run))) {
    animDebugged = true;
    log('แอนิเมชัน: พบ ' + groups.length + ' ท่า, idle=' + !!states.idle + ', walk=' + !!states.walk + ', run=' + !!states.run + '\n  ชื่อ: ' + groups.slice(0, 6).map(g => g.name).join(', '));
  }

  let cur = null, act = null;   // cur = state ที่เล่นอยู่, act = ท่า action ที่กำลังเล่น {st, left, done}
  const fpsOf = g => (g.targetedAnimations[0] && g.targetedAnimations[0].animation.framePerSecond) || 30;
  function begin(name, speed, to) {
    const st = states[name]; if (!st) return null;
    if (cur && states[cur]) states[cur].g.stop();
    const g = st.g; let sp = speed || st.speed || 1;
    if (st.randomStart) sp *= 0.9 + Math.random() * 0.2;
    g.start(!!st.loop, sp, g.from, to || g.to);
    if (st.randomStart) g.goToFrame(g.from + Math.random() * (g.to - g.from));
    cur = name; return { st, sp };
  }
  const api = {
    state: () => cur,
    has: n => !!states[n],
    exact: n => !!(states[n] && states[n].idx === 0),   // true = เจอคลิปชื่อตรงจริง (ไม่ใช่ท่าสำรอง) — สกิลใช้เลือกท่าฟันจริงก่อนท่าสำรอง
    list: () => Object.keys(states),
    busy: () => !!(act && act.st.lockMove),
    // ท่าเคลื่อนที่ — เรียกทุกเฟรม ไม่ขัดจังหวะท่า action ที่กำลังเล่น
    loco(n) {
      if (act) { if (act.done && act.st.hold && !(player && player.dead)) { act = null; cur = null; } else return; }   // ท่าค้าง (ตาย) ปล่อยเมื่อ player.dead เป็น false
      if (!states[n]) n = LOCO_FALLBACK[n];
      if (n && cur !== n) begin(n);
    },
    // ท่า action เล่นครั้งเดียว เช่น act('interact') / act('throw') / act('hit')
    // act('ชื่อ') หรือ act('ชื่อ', { duration: วินาที }) — duration = บีบ/ยืดท่าให้เล่นจบในเวลานั้น
    act(n, o) {
      const st = states[n]; if (!st) return false;
      act = null;
      if (st.loop) { begin(n); return true; }
      const g = st.g, len = (g.to - g.from) / fpsOf(g);
      const r = begin(n, o && o.duration ? len / o.duration : 0);
      act = { st, left: len / r.sp, done: false }; return true;
    },
    reset() { if (cur && states[cur]) states[cur].g.stop(); act = null; cur = null; },
    tick(dt) { if (act && !act.done && (act.left -= dt) <= 0) { if (act.st.hold) act.done = true; else { act = null; cur = null; } } },
    // Dash: คืน 'real' (ท่า Dodge จริง) | 'fallback' (ท่าสำรอง) | false
    dash(dur) {
      act = null;
      if (states.dash) {
        const g = states.dash.g, fps = fpsOf(g), len = (g.to - g.from) / fps, r = Math.min(2.5, len / dur);
        begin('dash', r, Math.min(g.to, g.from + r * dur * fps)); return 'real';
      }
      return begin('dashFallback') ? 'fallback' : false;
    }
  };
  out.anim = api;
  out.getSlot = n => map[n] || null;   // จุดจับของ เช่น 'handslot.r' (ใช้ติดอาวุธ)
  out.findSlot = rx => { const k = Object.keys(map).find(n => rx.test(n)); return k ? map[k] : null; };   // หาจุดจับด้วย regex (ขวานคู่: ใช้เมื่อชื่อ 'handslot.l' ไม่ตรง)
  console.info('[anims] จุดจับมือที่พบบนตัวละคร:', Object.keys(map).filter(n => /hand|slot/i.test(n)));   // ไว้ตรวจว่า handslot.l / handslot.r มีจริง
  out.dash = api.dash;
  // รองรับโค้ดเดิม/health.js ที่เรียก player.play('idle'|'move'|ชื่อ state ใดก็ได้)
  out.play = k => { if (k === 'move') return api.loco('walk'); const st = states[k]; return st && st.loop ? api.loco(k) : api.act(k); };
  api.loco('idle');
}

// ---------- สมองมอนสเตอร์: idle → ตามผู้เล่น → หลุด leash → เดินกลับจุดเกิด ----------
function updateMobs(dt) {
  const p = player.wrap.position;
  for (const m of mobs) {
    if (m.dead) { m.kb = null; if (m.stunT) { m.stunT = 0; m.stunned = false; } continue; }   // กำลังตาย/รอเกิดใหม่ (ดู src/health.js) — ล้างสตันด้วย
    if (m.stunT > 0) {                                 // สตัน (จากสกิล Z/X ใน combat.js): หยุดเดิน/AI/แอนิเมชันจนครบเวลา
      m.stunT -= dt;
      if (!m.stunned) { m.stunned = true; m.pause(); }
      if (m.stunT > 0) continue;
    }
    if (m.stunned) { m.stunned = false; m.stunT = 0; if (m.far) m.pause(); else m.resume(); }   // หมดสตัน → เดินต่อจากเดิม
    const w = m.wrap.position, ai = m.ai;
    if (m.kb) {                                        // แรงผลักสั้นๆ จากสกิล (procedural) — ไม่สตัน ไม่เปลี่ยนแอนิเมชัน AI เดินต่อตามปกติ
      const k = m.kb, ez = u => 1 - (1 - u) * (1 - u), t1 = Math.min(k.dur, k.t + dt), d = k.dist * (ez(t1 / k.dur) - ez(k.t / k.dur));
      tryMove(w, w.x + k.vx * d, w.z + k.vz * d); k.t = t1; if (t1 >= k.dur) m.kb = null;
    }
    const dp = Math.hypot(p.x - w.x, p.z - w.z);       // ระยะห่างผู้เล่น
    const dh = Math.hypot(m.home.x - w.x, m.home.z - w.z); // ระยะห่างจากจุดเกิด
    const far = dp > (CFG.farFreeze || 80);            // ไกลเกิน → หยุดแอนิเมชัน ไม่คำนวณ
    if (far !== !!m.far) { m.far = far; far ? m.pause() : m.resume(); }
    if (far && m.state === 'idle') continue;
    // เปลี่ยนสถานะ
    if (m.state !== 'return' && dp <= ai.aggro && dh < ai.leash && !player.dead) m.state = 'chase';
    else if (m.state === 'chase' && (dp > ai.aggro * 1.2 || dh >= ai.leash || player.dead)) m.state = 'return';
    // คำนวณทิศเดิน
    let vx = 0, vz = 0;
    if (m.state === 'chase') {
      if (dp > (ai.reach || 1.4)) { vx = (p.x - w.x) / dp; vz = (p.z - w.z) / dp; }   // ตามจนใกล้สุด ~1.4 หน่วย (บอสไกลกว่า) แล้วหยุด
    } else if (m.state === 'return') {
      if (dh < 0.5) {          // ถึงบ้าน → หันหน้าเหมือนเดิม ยืน idle
        m.state = 'idle';
        w.y = heightAt(w.x, w.z);
        m.heading = out_heading(m);
        continue;
      }
      vx = (m.home.x - w.x) / dh; vz = (m.home.z - w.z) / dh;
    }
    // เคลื่อนที่ + หันหน้า + เล่นแอนิเมชัน
    if (vx || vz) {
      const sp = ai.speed || MOB_AI.speed;
      tryMove(w, w.x + vx * sp * dt, w.z + vz * sp * dt);
      const target = Math.atan2(vx, vz), diff = Math.atan2(Math.sin(target - m.heading), Math.cos(target - m.heading));
      m.heading += diff * Math.min(1, dt * MOB_AI.turn);
      m.wrap.rotation.y = m.heading + m.fo;
      m.play('move');
    } else {
      m.play(m.state === 'chase' ? 'move' : 'idle');
    }
    w.y = heightAt(w.x, w.z);
  }
}
function out_heading(m) {  // ค่อย ๆ หันหน้ากลับทิศเดิมตอนถึงจุดเกิด (ตั้งตรงทันทีแบบง่าย)
  m.wrap.rotation.y = m.homeRot + m.fo;
  return m.homeRot;
}

// ---------- ผู้เล่น + อินพุต ----------
const joy = { x: 0, y: 0 }, keys = {};
const jz = $('joy'), kn = $('knob'); let jid = null;
function joyMove(e) {
  const r = jz.getBoundingClientRect(), R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
  kn.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / R; joy.y = -dy / R;
}
jz.addEventListener('pointerdown', e => { jid = e.pointerId; jz.setPointerCapture(jid); joyMove(e); });
jz.addEventListener('pointermove', e => { if (e.pointerId === jid) joyMove(e); });
['pointerup', 'pointercancel'].forEach(t => jz.addEventListener(t, e => {
  if (e.pointerId === jid) { jid = null; joy.x = joy.y = 0; kn.style.transform = ''; }
}));
addEventListener('keydown', e => keys[e.key.toLowerCase()] = 1);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);
const heldCodes = new Set();   // ปุ่มที่กดค้างอยู่ (ตาม e.code) — ใช้กับปุ่มวิ่งที่ตั้งค่าได้
addEventListener('keydown', e => heldCodes.add(e.code));
addEventListener('keyup', e => heldCodes.delete(e.code));
addEventListener('blur', () => heldCodes.clear());
const isHeld = codes => codes.some(c => heldCodes.has(c));

let player, heading = 0, fc = 0;

// ===== Stamina + Dash =====
// ปรับค่าได้ 3 ทาง: (1) ใส่ CFG.stamina / CFG.dash ใน config.js  (2) แก้ค่าเริ่มต้นด้านล่าง  (3) ตอนเกมรันผ่านคอนโซล เช่น Stamina.cfg.max = 150
const SC = Object.assign({
  max: 100,          // Stamina สูงสุด
  regen: 28,         // ฟื้นต่อวินาที
  regenDelay: 0.9,   // หน่วงกี่วินาทีหลังใช้ ก่อนเริ่มฟื้น
  dashCost: 25,      // Stamina ที่ Dash กินต่อครั้ง (100 → Dash ต่อเนื่องได้ 4 ครั้ง)
  hud: { left: 16, top: 52, width: 190, height: 12 }   // ตำแหน่งแถบ (px) — ขยับหลบแถบ HP ได้
}, CFG.stamina || {});
const DC = Object.assign({
  distance: 5.5,     // ระยะพุ่ง (หน่วยโลก; 1 ช่อง = CFG.cell)
  duration: 0.2,     // เวลาพุ่ง (วินาที)
  delay: 0.25,       // หน่วงก่อน Dash ครั้งถัดไป (วินาที นับจากพุ่งจบ)
  keys: ['Space'],   // ปุ่ม Dash บนคีย์บอร์ด (e.code) — Shift ใช้สำหรับวิ่งแล้ว
  buffer: 0.15,      // กดล่วงหน้าได้กี่วินาที (ไม่ต้องกดจังหวะเป๊ะ)
  iframe: 0.16,      // อมตะช่วงต้นของ Dash (player.invuln — ให้ health.js เช็กได้)
  fovKick: 4,        // กล้องซูมออกตอนพุ่ง (องศา) ใส่ 0 เพื่อปิด
  lean: 0.3          // เอนตัวไปข้างหน้า (เรเดียน) เมื่อไม่มีท่า Dodge ใส่ 0 เพื่อปิด
}, CFG.dash || {});
const RC = Object.assign({
  mult: 1.5,                              // วิ่งเร็วกว่าเดินปกติ (CFG.speed) 50%
  keys: ['ShiftLeft', 'ShiftRight'],      // กดค้างเพื่อวิ่ง (คีย์บอร์ด)
  button: true,                           // แสดงปุ่ม RUN (กดสลับเปิด/ปิด) สำหรับมือถือ
  staminaPerSec: 0                        // วิ่งกิน Stamina ต่อวินาที (0 = ไม่กิน; ตั้ง >0 เมื่อหมดจะเดินแทน)
}, CFG.run || {});
const stam = { value: SC.max, since: 9, flash: 0 };
const dash = { lean: 0, on: false, e: 0, dx: 0, dz: 0, cd: 0, buf: 0, trail: 0, fov: 0,
  dist: 0, dur: 0, iframe: 0, onStep: null, onEnd: null };   // dist/dur/iframe/onStep/onEnd = ค่าของ Dash รอบนี้ (Dash ปกติใช้ DC, สกิลส่งค่ามาเอง)
window.Stamina = { cfg: SC, dash: DC, state: stam,
  setMax: m => { SC.max = Math.max(1, Math.round(m)); stam.value = Math.min(SC.max, stam.value); },
  add: n => { stam.value = Math.max(0, Math.min(SC.max, stam.value + n)); }, refill: () => { stam.value = SC.max; },
  spend: n => { if (stam.value < n) { stam.flash = 0.3; return false; } stam.value -= n; stam.since = 0; return true; } };   // ให้ระบบอื่น (combat.js) หัก Stamina

// --- HUD (สร้างด้วยโค้ด ไม่ต้องแก้ index.html) ---
const el = (css, parent) => { const d = document.createElement('div'); d.style.cssText = css; (parent || document.body).appendChild(d); return d; };
const sBar = el(`position:fixed;left:${SC.hud.left}px;top:${SC.hud.top}px;width:${SC.hud.width}px;height:${SC.hud.height}px;background:rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.8);border-radius:9px;overflow:hidden;z-index:20;pointer-events:none`);
const sFill = el('height:100%;width:100%;background:linear-gradient(#ffe97a,#f0a315)', sBar);
const sTick = el('position:absolute;top:0;width:2px;height:100%;background:rgba(255,255,255,.85)', sBar);   // ขีดบอกต้นทุน 1 Dash
const dBtn = el('position:fixed;right:26px;bottom:34px;width:86px;height:86px;border-radius:50%;background:rgba(255,255,255,.22);border:3px solid rgba(255,255,255,.85);color:#fff;font:700 15px sans-serif;display:flex;align-items:center;justify-content:center;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 3px #000');
dBtn.textContent = 'DASH';
const pressDash = () => {
  if (typeof StatUI !== 'undefined' && StatUI.isOpen()) return;
  dash.buf = DC.buffer;
};
dBtn.addEventListener('pointerdown', e => { e.preventDefault(); pressDash(); });
addEventListener('keydown', e => { if (DC.keys.includes(e.code)) { e.preventDefault(); if (!e.repeat) pressDash(); } });
let runToggle = false;
if (RC.button) {
  const rBtn = el('position:fixed;right:40px;bottom:134px;width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.22);border:3px solid rgba(255,255,255,.85);color:#fff;font:700 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 3px #000');
  rBtn.textContent = 'RUN';
  rBtn.addEventListener('pointerdown', e => { e.preventDefault(); runToggle = !runToggle; rBtn.style.background = runToggle ? 'rgba(255,200,60,.65)' : 'rgba(255,255,255,.22)'; });
}
if (ANIM_CFG.debugKeys) addEventListener('keydown', e => {   // ทดสอบท่า: 1-9 เล่นท่า action, 0 รีเซ็ต
  if (!player || !player.anim || !/^Digit[0-9]$/.test(e.code)) return;
  const n = +e.code.slice(5); if (n === 0) player.anim.reset(); else if (ANIM_DEBUG_ORDER[n - 1]) player.anim.act(ANIM_DEBUG_ORDER[n - 1]);
});

// --- เอฟเฟกต์ฝุ่น (พูลคงที่ ไม่สร้างของใหม่ระหว่างเล่น) ---
const puffs = Array.from({ length: 10 }, () => {
  const m = B.MeshBuilder.CreateSphere('puff', { diameter: 1, segments: 6 }, scene);
  m.material = mat('#ffffff'); m.material.emissiveColor = new B.Color3(1, 1, 1); m.isPickable = false; m.isVisible = false;
  return { m, t: 0, life: 0.35 };
});
function puff(x, y, z) { const q = puffs.find(q => q.t <= 0) || puffs[0]; q.t = q.life; q.m.position.set(x, y + 0.2, z); q.m.isVisible = true; }
function updatePuffs(dt) {
  for (const q of puffs) if (q.t > 0) {
    q.t -= dt; const k = 1 - Math.max(q.t, 0) / q.life;
    q.m.scaling.setAll(0.4 + k * 1.1); q.m.visibility = 0.5 * (1 - k);
    if (q.t <= 0) q.m.isVisible = false;
  }
}

function updateStamina(dt) {
  stam.since += dt;
  if (!dash.on && stam.since >= SC.regenDelay) stam.value = Math.min(SC.max, stam.value + SC.regen * dt);
  stam.value = Math.min(stam.value, SC.max);
  if (stam.flash > 0) stam.flash -= dt;
  sFill.style.width = (stam.value / SC.max * 100) + '%';
  sFill.style.background = stam.flash > 0 ? '#e5484d' : stam.value < SC.dashCost ? 'linear-gradient(#ffb36b,#e0701f)' : 'linear-gradient(#ffe97a,#f0a315)';
  sTick.style.left = Math.min(100, SC.dashCost / SC.max * 100) + '%';
  const ready = dash.cd <= 0 && stam.value >= SC.dashCost;
  dBtn.style.opacity = ready ? 1 : 0.45;
}

function startDash(mx, mz, l, o) {   // o = ตัวเลือกสำหรับสกิล { distance, duration, iframe, free, onStep, onEnd } — ไม่ส่ง = Dash ปกติ
  let dx, dz;
  if (l > 0.1) { dx = mx / l; dz = mz / l; } else { dx = Math.sin(heading); dz = Math.cos(heading); }   // ไม่ได้ดันจอย → พุ่งไปทางที่หันหน้าอยู่
  dash.on = true; dash.e = 0; dash.dx = dx; dash.dz = dz; dash.trail = 0; dash.buf = 0;
  const defaultDist = (typeof PlayerStats !== 'undefined' && PlayerStats.get) ? PlayerStats.get('dashDistance') : DC.distance;
  dash.dist = (o && o.distance) || defaultDist; dash.dur = (o && o.duration) || DC.duration;
  dash.iframe = o && o.iframe != null ? o.iframe : DC.iframe; dash.onStep = (o && o.onStep) || null; dash.onEnd = (o && o.onEnd) || null;
  if (!(o && o.free)) { stam.value -= SC.dashCost; stam.since = 0; }   // สกิลหัก Stamina เองใน combat.js → ไม่หักซ้ำ
  heading = Math.atan2(dx, dz); player.wrap.rotation.y = heading + CFG.faceOffset;
  player.invuln = true; player.dashing = true;
  const r = player.dash(dash.dur); dash.lean = r === 'real' ? 0 : DC.lean;   // ใช้ท่าสำรอง → เอนตัวไปข้างหน้าเพื่อให้ดูเป็นการพุ่ง
  const p = player.wrap.position; puff(p.x, p.y, p.z);
}
function endDash() {
  dash.on = false; dash.cd = DC.delay; dash.fov = 0; player.invuln = false; player.dashing = false; player.wrap.rotation.x = 0;
  const f = dash.onEnd; dash.onStep = dash.onEnd = null;
  if (f) { try { f(); } catch (e) { console.error('[dash] onEnd', e); } }
}
function stepDash(dt, p) {
  const T = dash.dur, e0 = dash.e, e1 = Math.min(T, e0 + dt), ease = u => 1 - (1 - u) * (1 - u);   // พุ่งเร็วตอนต้น แล้วชะลอ
  const d = dash.dist * (ease(e1 / T) - ease(e0 / T)), n = Math.max(1, Math.ceil(d / 0.3)), x0 = p.x, z0 = p.z;
  for (let k = 0; k < n; k++) tryMove(p, p.x + dash.dx * d / n, p.z + dash.dz * d / n);   // ก้าวย่อย: ไม่ทะลุของ/หน้าผา/น้ำ
  p.y = heightAt(p.x, p.z);
  dash.e = e1; player.invuln = e1 < dash.iframe;
  if ((dash.trail -= dt) <= 0) { puff(p.x, p.y, p.z); dash.trail = 0.05; }
  dash.fov = DC.fovKick * Math.sin(Math.PI * e1 / T);
  if (dash.lean) player.wrap.rotation.x = dash.lean * Math.sin(Math.PI * e1 / T);   // เอนนุ่ม ๆ เข้า-ออก
  if (dash.onStep) {   // สกิลตามเส้นทางพุ่ง (เช็กศัตรูที่โดนระหว่างทาง) — เรียกพร้อมตำแหน่งก่อน/หลังก้าวนี้
    try { dash.onStep(x0, z0, p.x, p.z, e1 / T); } catch (e) { console.error('[dash] onStep', e); }
    if (!dash.on) return;   // onStep สั่งหยุดพุ่ง (cancelDash) แล้ว
  }
  if (e1 >= T) endDash();
}

// ---------- API สำหรับสกิล (src/combat.js): พุ่งแบบชนของ/หน้าผาเหมือน Dash ปกติ แต่ไม่หัก Stamina ซ้ำ ----------
function skillDash(o) {
  if (!player || player.dead || dash.on) return false;
  startDash(Math.sin(heading), Math.cos(heading), 1, Object.assign({ free: true }, o));
  return true;
}
function cancelDash() { if (dash.on) endDash(); }
function stunMob(m, dur) {   // สตันมอน: หยุดเดิน/แอนิเมชัน dur วินาที (ดู updateMobs) — ตาย/ไม่มีชีวิตแล้วสตันไม่ได้
  if (!m || m.dead || m.phase !== 'alive' || !(dur > 0)) return false;
  m.stunT = Math.max(m.stunT || 0, dur); return true;
}
function knockMob(m, dx, dz, dist, dur) {   // ผลักมอนออกไป dist หน่วยใน dur วินาที (ชนของ/หน้าผาผ่าน tryMove) — ไม่ใช่สตัน
  if (!m || m.dead || m.phase !== 'alive' || !(dist > 0) || !(dur > 0)) return false;
  const l = Math.hypot(dx, dz) || 1; m.kb = { vx: dx / l, vz: dz / l, dist, dur, t: 0 }; return true;
}
function unstunMob(m) { if (m && m.stunT > 0) m.stunT = 0; }   // ปล่อยสตัน (updateMobs จะ resume ให้เอง)

function update() {
  if (!player) return;
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  let mx = joy.x + (keys.d ? 1 : 0) - (keys.a ? 1 : 0), mz = joy.y + (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  const p = player.wrap.position;
  updateStamina(dt);
  if (dash.cd > 0) dash.cd -= dt;
  if (player.dead && dash.on) { dash.on = false; dash.fov = 0; player.invuln = false; player.dashing = false; player.wrap.rotation.x = 0; dash.onStep = dash.onEnd = null; }   // ตายกลางทาง Dash → หยุดทันที
  if (dash.buf > 0) {
    dash.buf -= dt;
    if (!dash.on && dash.cd <= 0 && !player.dead && !(Cb && Cb.specialActive)) {   // กำลังใช้สกิล Z/X → Dash ปกติไม่ติด
      if (stam.value >= SC.dashCost) startDash(mx, mz, l);
      else { stam.flash = 0.3; dash.buf = 0; }          // Stamina ไม่พอ → แถบกะพริบแดง
    }
  }
  const anim = player.anim;
  anim.tick(dt);
  if (dash.on) stepDash(dt, p);
  else if (l > 0.1 && !anim.busy() && !(Cb && Cb.specialActive)) {   // สกิลล็อกตัวผู้เล่นระหว่างใช้
    const running = (isHeld(RC.keys) || runToggle) && (RC.staminaPerSec <= 0 || stam.value > 0);
    if (running && RC.staminaPerSec > 0) { stam.value = Math.max(0, stam.value - RC.staminaPerSec * dt); stam.since = 0; }
    const baseWalk = (typeof PlayerStats !== 'undefined' && PlayerStats.get) ? PlayerStats.get('walkSpeed') : CFG.speed;
    const baseRun = (typeof PlayerStats !== 'undefined' && PlayerStats.get) ? PlayerStats.get('runSpeed') : (CFG.speed * RC.mult);
    const spd = running ? baseRun : baseWalk;
    tryMove(p, p.x + mx * spd * dt, p.z + mz * spd * dt);
    const target = Math.atan2(mx, mz), diff = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
    heading += diff * Math.min(1, dt * 14);
    player.wrap.rotation.y = heading + CFG.faceOffset;
    anim.loco(running ? 'run' : 'walk');
  } else anim.loco('idle');
  if (Cb) Cb.update(dt);
  updatePuffs(dt);
  cam.fov += (CFG.cam.fov + dash.fov * Math.PI / 180 - cam.fov) * Math.min(1, dt * 18);
  p.y = heightAt(p.x, p.z);
  updateMobs(dt);          // ← อัปเดตมอนสเตอร์ทุกเฟรม
  Hx.update(dt);           // ← HP / ท่าตาย / เกิดใหม่ / แถบเลือด
  updateCam(p); if ((fc++ & 3) === 0) fadeProps(p);
  if (Lt) Lt.update(dt, focus);   // กรอบเงาตามกล้อง
  const z = ZONES.find(z => Math.hypot(p.x - z.x, p.z - z.z) < z.r);
  $('zone').textContent = z ? z.name : 'ลานกลางเกาะ';
}

// ---------- ของบังกล้อง → โปร่งใส ----------
const _head = new B.Vector3();
function fadeProps(p) {
  _head.copyFromFloats(p.x, p.y + 1.2, p.z);
  const dir = _head.subtract(cam.position), len = dir.length();
  const ray = new B.Ray(cam.position, dir.normalize(), len);
  const hit = new Set(scene.multiPickWithRay(ray, m => m.metadata && m.metadata.prop).map(h => h.pickedMesh.metadata.prop));
  props.forEach(pr => {
    const t = hit.has(pr) ? 0.2 : 1;
    if (pr.v === t) return;
    pr.v += (t - pr.v) * 0.2; if (Math.abs(pr.v - t) < 0.02) pr.v = t;
    pr.meshes.forEach(m => { m.visibility = pr.v; });
  });
}

// ---------- เริ่มเกม ----------
(async () => {
  if (typeof PlayerStats !== 'undefined') {
    PlayerStats.init(CFG.stats);
  }
  if (typeof StatUI !== 'undefined') {
    StatUI.init();
  }
  animConts = await Promise.all(CFG.anims.map(load));
  player = await spawn('knight', 0, 0, 0);
  if (Hx.bindPlayer) Hx.bindPlayer(player, Object.assign({ spawn: { x: 0, z: 0 }, heightAt }, CFG.player || {}));   // HP ผู้เล่น (src/health.js)
  if (typeof PlayerStats !== 'undefined') {
    PlayerStats.syncGameSystems();
  }
  if (Cb) Cb.init({ getPlayer: () => player, mobs, load, Health: _HP, Stamina: window.Stamina,
    getHeading: () => heading, setHeading: h => { heading = h; player.wrap.rotation.y = h + CFG.faceOffset; }, cfg: CFG.combat || {},
    heightAt, skillDash, cancelDash, stun: stunMob, unstun: unstunMob, knock: knockMob });   // อาวุธ/สกิล (src/combat.js)
  updateCam(player.wrap.position, true);
  engine.runRenderLoop(() => { if (!Display.blocked) update(); scene.render(); });   // แนวตั้งบนมือถือ → พักเกมไว้
  $('load').style.display = 'none';
  const cellProps = [];
  for (let i = 0; i < ROWS; i++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[i][c], x = X0 + c * CELL + CELL / 2, z = ZN - i * CELL - CELL / 2;
    if (ch === 'p') cellProps.push(['dock', x, z, 0]);
    if (ch === '=') cellProps.push(['bridge', x, z, (chAt(c - 1, i) !== '.' && chAt(c + 1, i) !== '.') ? 0 : Math.PI / 2]);
  }
  const all = [...PLACE, ...cellProps, ...perimeterFence(), ...expandScatter()];
  all.sort((a, b) => Math.hypot(a[1], a[2]) - Math.hypot(b[1], b[2]));   // ใกล้จุดเกิดก่อน
  new Set(all.map(a => PREFABS[a[0]].f)).forEach(f => load(f));            // เริ่มโหลดไฟล์โมเดลทุกแบบพร้อมกัน (1 ไฟล์ = โหลดครั้งเดียว)
  for (let k = 0; k < all.length; k += 12) {
    await Promise.all(all.slice(k, k + 12).map(a => spawn(...a)));
    await new Promise(r => setTimeout(r, 0));                              // ปล่อยเฟรมให้เรนเดอร์/ขยับได้
  }
})().catch(e => { log('ERROR: ' + e.message); $('load').style.display = 'none'; });
