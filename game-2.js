// ===== game.js — Phase 1: เกาะ + กล้อง ROV + จอยสติ๊ก + see-through =====
const B = BABYLON;
const $ = id => document.getElementById(id);
const log = m => { const l = $('log'); l.style.display = 'block'; l.textContent += m + '\n'; };

const engine = new B.Engine($('c'), false, { stencil: false });
const scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.44, 0.72, 0.91, 1);
new B.HemisphericLight('h', new B.Vector3(0.3, 1, -0.2), scene).intensity = 0.95;
const sun = new B.DirectionalLight('s', new B.Vector3(-0.4, -1, 0.5), scene); sun.intensity = 0.55;

// ---------- กล้อง (มุมสูงเฉียง จากทิศใต้ มองไปทางเหนือ) ----------
const cam = new B.FreeCamera('cam', new B.Vector3(0, 10, -9), scene);
cam.fov = CFG.cam.fov; cam.minZ = 0.5; cam.maxZ = 400;
const focus = new B.Vector3(0, 1, 0);
const pitch = CFG.cam.pitch * Math.PI / 180;
function updateCam(target, snap) {
  focus.copyFromFloats(
    snap ? target.x : focus.x + (target.x - focus.x) * 0.15, 1,
    snap ? target.z : focus.z + (target.z - focus.z) * 0.15);
  cam.position.set(focus.x, CFG.cam.dist * Math.sin(pitch), focus.z - CFG.cam.dist * Math.cos(pitch));
  cam.setTarget(focus);
}

// ---------- พื้น/ทะเล ----------
const mat = hex => { const m = new B.StandardMaterial('m', scene); m.diffuseColor = B.Color3.FromHexString(hex); m.specularColor = B.Color3.Black(); return m; };
function box(w, h, d, x, y, z, hex) {
  const m = B.MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, scene);
  m.position.set(x, y, z); m.material = mat(hex); m.isPickable = false; m.freezeWorldMatrix(); return m;
}
const sea = B.MeshBuilder.CreateGround('sea', { width: 400, height: 400 }, scene);
sea.position.y = -1; sea.material = mat('#3d9bd6'); sea.isPickable = false;
box(CFG.half * 2 + 4, 1, CFG.half * 2 + 4, 0, -0.5, 0, '#e8d49a');          // ฐานเกาะ
box(4, 0.06, CFG.half * 2, 0, 0.03, 0, '#c9a96b');                          // ทางเดิน
box(CFG.half * 2, 0.06, 4, 0, 0.03, 0, '#c9a96b');
ZONES.forEach(z => box(22, 0.1, 22, z.x, 0.05, z.z, z.color));
// วงแท่นบอส + วงหุ่นซ้อม
[[20, 14, '#c0392b'], [-20, -14, '#e67e22']].forEach(([x, z, c]) => {
  const d = B.MeshBuilder.CreateDisc('ring', { radius: 3, tessellation: 32 }, scene);
  d.rotation.x = Math.PI / 2; d.position.set(x, 0.13, z); d.material = mat(c); d.isPickable = false;
});

// ---------- โหลดโมเดล ----------
// GLB ของ Kenney/KayKit อ้างหา 'Textures/colormap.png' แต่ไฟล์จริงวางข้างๆ .glb → เปลี่ยน path ให้
const fixTex = u => u.replace(/\/Textures\//i, '/');
try { B.Tools.PreprocessUrl = fixTex; } catch (e) {}
B.SceneLoader.OnPluginActivatedObservable.add(l => { if ('preprocessUrlAsync' in l || l.name === 'gltf') l.preprocessUrlAsync = u => Promise.resolve(fixTex(u)); });
const cache = {};
function load(path) {
  if (!cache[path]) cache[path] = tryLoad(path);
  return cache[path];
}
// ลองชื่อไฟล์หลายแบบ (ตัวเล็ก / ตัวแรกใหญ่ / ทุกคำขึ้นต้นใหญ่) กันพลาดเรื่องตัวพิมพ์บน Vercel
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

let animDebugged = false;
const props = []; // สำหรับระบบโปร่งใสเมื่อบังกล้อง
let animConts = [];

async function spawn(key, x, z, heading = 0, tag) {
  const p = PREFABS[key], c = await load(p.f);
  const wrap = new B.TransformNode('w', scene);
  wrap.position.set(x, 0.1, z);
  wrap.rotation.y = heading + CFG.faceOffset;
  const out = { wrap, tag, play() {} };
  if (!c) { // ไฟล์ไม่มี → กล่องสีชมพูแทน
    const m = B.MeshBuilder.CreateBox('ph', { size: 1.5 }, scene);
    m.position.y = 0.75; m.parent = wrap; m.material = mat('#ff40c0'); m.isPickable = false; return out;
  }
  const inst = c.instantiateModelsToScene(n => n, false, { doNotInstantiate: true });
  const root = inst.rootNodes[0];
  root.parent = wrap; root.scaling.scaleInPlace(p.s || 1);
  const meshes = root.getChildMeshes();
  if (p.char) {
    meshes.forEach(m => { m.isPickable = false; });
    setupAnims(root, out);
  } else {
    const prop = { meshes, v: 1 };
    meshes.forEach(m => { m.metadata = { prop }; });
    props.push(prop);
  }
  return out;
}

// ย้ายแอนิเมชันจากไฟล์ Rig_* มาใช้กับตัวละคร (จับคู่ด้วยชื่อ node)
function setupAnims(root, out) {
  const map = {};
  root.getChildTransformNodes(false).concat(root.getChildMeshes()).forEach(n => { map[n.name] = n; });
  const groups = [];
  animConts.forEach(ac => ac && ac.animationGroups.forEach(g => {
    const cl = g.clone('c_' + g.name, t => map[t.name] || null);
    cl.stop(); groups.push(cl);
  }));
  const find = rx => groups.find(g => rx.test(g.name));
  const A = { idle: find(/idle_a/i) || find(/idle/i), move: find(/running_a/i) || find(/walking_a/i) || find(/run|walk/i) };
  if (!animDebugged && (!A.idle || !A.move)) {
    animDebugged = true;
    log('แอนิเมชัน: พบ ' + groups.length + ' ท่า, idle=' + !!A.idle + ', move=' + !!A.move +
      '\n  ตัวอย่างชื่อ: ' + groups.slice(0, 6).map(g => g.name).join(', '));
  }
  let cur = null;
  out.play = k => {
    if (cur === k || !A[k]) return;
    if (cur && A[cur]) A[cur].stop();
    A[k].start(true); cur = k;
  };
  out.play('idle');
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
  let mx = joy.x + (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  let mz = joy.y + (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const l = Math.hypot(mx, mz);
  if (l > 1) { mx /= l; mz /= l; }
  const p = player.wrap.position;
  if (l > 0.1) {
    p.x = B.Scalar.Clamp(p.x + mx * CFG.speed * dt, -CFG.half, CFG.half);
    p.z = B.Scalar.Clamp(p.z + mz * CFG.speed * dt, -CFG.half, CFG.half);
    const target = Math.atan2(mx, mz);
    let diff = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
    heading += diff * Math.min(1, dt * 14);
    player.wrap.rotation.y = heading + CFG.faceOffset;
    player.play('move');
  } else player.play('idle');
  updateCam(p);
  fadeProps(p);
  const z = ZONES.find(z => Math.abs(p.x - z.x) < 11 && Math.abs(p.z - z.z) < 11);
  $('zone').textContent = z ? z.name : 'ลานกลางเกาะ';
}

// ---------- ของบังกล้อง → โปร่งใส ----------
const _head = new B.Vector3();
function fadeProps(p) {
  _head.copyFromFloats(p.x, 1.2, p.z);
  const dir = _head.subtract(cam.position), len = dir.length();
  const ray = new B.Ray(cam.position, dir.normalize(), len);
  const hit = new Set(scene.multiPickWithRay(ray, m => m.metadata && m.metadata.prop).map(h => h.pickedMesh.metadata.prop));
  props.forEach(pr => {
    const t = hit.has(pr) ? 0.2 : 1;
    if (pr.v === t) return;
    pr.v += (t - pr.v) * 0.2;
    if (Math.abs(pr.v - t) < 0.02) pr.v = t;
    pr.meshes.forEach(m => { m.visibility = pr.v; });
  });
}

// ---------- เริ่มเกม ----------
(async () => {
  animConts = await Promise.all(CFG.anims.map(load));
  player = await spawn('knight', 0, -4, 0);
  updateCam(player.wrap.position, true);
  engine.runRenderLoop(() => { update(); scene.render(); });
  $('load').style.display = 'none';
  await Promise.all(PLACE.map(a => spawn(...a)));
})().catch(e => { log('ERROR: ' + e.message); $('load').style.display = 'none'; });
addEventListener('resize', () => engine.resize());
