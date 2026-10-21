// ===== game.js — พื้นหลายระดับ + ทางลาด + ชนหน้าผา/ของ + มอนสเตอร์มีชีวิต =====
const B = BABYLON;
const $ = id => document.getElementById(id);
const log = m => { const l = $('log'); l.style.display = 'block'; l.textContent += m + '\n'; };

const engine = new B.Engine($('c'), false, { stencil: false });
const scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.44, 0.72, 0.91, 1);
new B.HemisphericLight('h', new B.Vector3(0.3, 1, -0.2), scene).intensity = 0.95;
const sun = new B.DirectionalLight('s', new B.Vector3(-0.4, -1, 0.5), scene); sun.intensity = 0.55;

// ---------- กล้อง ----------
const cam = new B.FreeCamera('cam', new B.Vector3(0, 10, -9), scene);
cam.fov = CFG.cam.fov; cam.minZ = 0.5; cam.maxZ = 500;
const focus = new B.Vector3(0, 1, 0), pitch = CFG.cam.pitch * Math.PI / 180;
function updateCam(t, snap) {
  const k = snap ? 1 : 0.15;
  focus.x += (t.x - focus.x) * k; focus.z += (t.z - focus.z) * k; focus.y += (t.y + 1 - focus.y) * k;
  cam.position.set(focus.x, focus.y + CFG.cam.dist * Math.sin(pitch), focus.z - CFG.cam.dist * Math.cos(pitch));
  cam.setTarget(focus);
}

// ---------- แผนที่ → ความสูง ----------
const CELL = CFG.cell, COLS = MAP[0].length, ROWS = MAP.length, X0 = -COLS * CELL / 2, ZN = ROWS * CELL / 2;
const LV = { ',': 0, g: 2, h: 4, A: 4, p: 0 };  // p = สะพานท่าเรือ (เดินได้ ไม่วาดพื้น)
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
      if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < 2.5) return true;
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
  const shade = 0.95 + 0.08 * ((c + i) & 1);
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

const mat = hex => { const m = new B.StandardMaterial('m', scene); m.diffuseColor = B.Color3.FromHexString(hex); m.specularColor = B.Color3.Black(); return m; };
const sea = B.MeshBuilder.CreateGround('sea', { width: 600, height: 600 }, scene);
sea.position.y = -1; sea.material = mat('#3d9bd6'); sea.isPickable = false;
[[-46, 34, '#c0392b'], [44, 0, '#e67e22']].forEach(([x, z, c]) => {
  const d = B.MeshBuilder.CreateDisc('ring', { radius: 3.5, tessellation: 32 }, scene);
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
function expandScatter() {
  const out = [], pts = [[0, 0], ...PLACE.map(p => [p[1], p[2]])];
  SCATTER.forEach(([k, n, x1, z1, x2, z2, seed]) => {
    let s = seed * 9973 + 1; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    let got = 0, tries = 0;
    while (got < n && tries++ < n * 40) {
      const x = x1 + (x2 - x1) * rnd(), z = z1 + (z2 - z1) * rnd();
      if (!interior(x, z) || pts.some(q => (q[0] - x) ** 2 + (q[1] - z) ** 2 < 12)) continue;
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
  const i = path.lastIndexOf('/') + 1, dir = CFG.base + path.slice(0, i), f = path.slice(i);
  const names = [...new Set([f, f[0].toUpperCase() + f.slice(1), f.replace(/(^|[_-])([a-z])/g, (m, a, b) => a + b.toUpperCase())])];
  let err = '';
  for (const n of names) {
    try { return await B.SceneLoader.LoadAssetContainerAsync(dir, n, scene); }
    catch (e) { err = (e && (e.message || e.reason || e)) + ''; }
  }
  log('โหลดไม่ได้: ' + dir + f + '\n  สาเหตุ: ' + err.slice(0, 150));
  return null;
}

let animDebugged = false, animConts = [];
const props = [];
const mobs = [];   // ← มอนสเตอร์ (tag 'mob'/'dummy') ที่มีชีวิต

async function spawn(key, x, z, heading = 0, tag, dy = 0) {
  const p = PREFABS[key];
  if (p.flat) { const ch = chAt(Math.floor((x - X0) / CELL), Math.floor((ZN - z) / CELL)); if (!(ch in LV) || ch === 'p') return null; }
  const c = await load(p.f);
  const wrap = new B.TransformNode('w', scene);
  wrap.position.set(x, Math.max(heightAt(x, z), -1.1) + dy + (p.dy || 0), z);
  wrap.rotation.y = heading + CFG.faceOffset;
  const out = { wrap, tag, key, play() {} };
  out.home = { x, z };          // จุดเกิด — ใช้เป็นเส้นสำหรับเดินกลับ
  out.homeRot = heading;        // ทิศหันหน้าเดิม
  out.heading = heading;
  out.state = 'idle';
  // ลงทะเบียนมอนสเตอร์ (dummy ใช้ค่า MOB_AI.dummy เสมอ, mob ใช้ค่าตาม prefab rogue/barbarian)
  if (tag === 'mob' || tag === 'dummy') {
    const ai = MOB_AI[tag === 'dummy' ? 'dummy' : key];
    if (ai) { out.ai = ai; out.hp = ai.hp; out.hpMax = ai.hp; mobs.push(out); }
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
  return out;
}
function setupAnims(root, out) {
  const map = {};
  root.getChildTransformNodes(false).concat(root.getChildMeshes()).forEach(n => { map[n.name] = n; });
  const groups = [];
  animConts.forEach(ac => ac && ac.animationGroups.forEach(g => {
    const cl = g.clone('c_' + g.name, t => map[t.name] || null); cl.stop(); groups.push(cl);
  }));
  const find = rx => groups.find(g => rx.test(g.name));
  const A = { idle: find(/idle_a/i) || find(/idle/i), move: find(/running_a/i) || find(/walking_a/i) || find(/run|walk/i) };
  if (!animDebugged && (!A.idle || !A.move)) {
    animDebugged = true;
    log('แอนิเมชัน: พบ ' + groups.length + ' ท่า, idle=' + !!A.idle + ', move=' + !!A.move + '\n  ชื่อ: ' + groups.slice(0, 6).map(g => g.name).join(', '));
  }
  let cur = null;
  out.play = k => { if (cur === k || !A[k]) return; if (cur && A[cur]) A[cur].stop(); A[k].start(true); cur = k; };
  out.play('idle');
}

// ---------- สมองมอนสเตอร์: idle → ตามผู้เล่น → หลุด leash → เดินกลับจุดเกิด ----------
function updateMobs(dt) {
  const p = player.wrap.position;
  for (const m of mobs) {
    const w = m.wrap.position, ai = m.ai;
    const dp = Math.hypot(p.x - w.x, p.z - w.z);       // ระยะห่างผู้เล่น
    const dh = Math.hypot(m.home.x - w.x, m.home.z - w.z); // ระยะห่างจากจุดเกิด
    // เปลี่ยนสถานะ
    if (m.state !== 'return' && dp <= ai.aggro && dh < ai.leash) m.state = 'chase';
    else if (m.state === 'chase' && (dp > ai.aggro * 1.2 || dh >= ai.leash)) m.state = 'return';
    // คำนวณทิศเดิน
    let vx = 0, vz = 0;
    if (m.state === 'chase') {
      if (dp > 1.4) { vx = (p.x - w.x) / dp; vz = (p.z - w.z) / dp; }   // ตามจนใกล้สุด ~1.4 หน่วยแล้วหยุด
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
      const sp = MOB_AI.speed;
      tryMove(w, w.x + vx * sp * dt, w.z + vz * sp * dt);
      const target = Math.atan2(vx, vz), diff = Math.atan2(Math.sin(target - m.heading), Math.cos(target - m.heading));
      m.heading += diff * Math.min(1, dt * MOB_AI.turn);
      m.wrap.rotation.y = m.heading + CFG.faceOffset;
      m.play('move');
    } else {
      m.play(m.state === 'chase' ? 'move' : 'idle');
    }
    w.y = heightAt(w.x, w.z);
  }
}
function out_heading(m) {  // ค่อย ๆ หันหน้ากลับทิศเดิมตอนถึงจุดเกิด (ตั้งตรงทันทีแบบง่าย)
  m.wrap.rotation.y = m.homeRot + CFG.faceOffset;
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

let player, heading = 0;
function update() {
  if (!player) return;
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  let mx = joy.x + (keys.d ? 1 : 0) - (keys.a ? 1 : 0), mz = joy.y + (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  const p = player.wrap.position;
  if (l > 0.1) {
    tryMove(p, p.x + mx * CFG.speed * dt, p.z + mz * CFG.speed * dt);
    const target = Math.atan2(mx, mz), diff = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
    heading += diff * Math.min(1, dt * 14);
    player.wrap.rotation.y = heading + CFG.faceOffset;
    player.play('move');
  } else player.play('idle');
  p.y = heightAt(p.x, p.z);
  updateMobs(dt);          // ← อัปเดตมอนสเตอร์ทุกเฟรม
  updateCam(p); fadeProps(p);
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
  animConts = await Promise.all(CFG.anims.map(load));
  player = await spawn('knight', 0, 0, 0);
  updateCam(player.wrap.position, true);
  engine.runRenderLoop(() => { update(); scene.render(); });
  $('load').style.display = 'none';
  const cellProps = [];
  for (let i = 0; i < ROWS; i++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[i][c], x = X0 + c * CELL + CELL / 2, z = ZN - i * CELL - CELL / 2;
    if (ch === 'p') cellProps.push(['dock', x, z, 0]);
    if (ch === '=') cellProps.push(['bridge', x, z, (chAt(c - 1, i) !== '.' && chAt(c + 1, i) !== '.') ? 0 : Math.PI / 2]);
  }
  const all = [...PLACE, ...cellProps, ...perimeterFence(), ...expandScatter()];
  await Promise.all(all.map(a => spawn(...a)));
})().catch(e => { log('ERROR: ' + e.message); $('load').style.display = 'none'; });
addEventListener('resize', () => engine.resize());
