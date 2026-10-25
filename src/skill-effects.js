// ===== src/skill-effects.js — เอฟเฟกต์ 3D ของสกิลพิเศษ Z/X (ภาพล้วน: ไม่คำนวณดาเมจ ไม่ยุ่ง AI) =====
// ต้องใส่ <script src="src/skill-effects.js"></script> ก่อน src/combat.js — combat.js เป็นคนสั่งเล่นผ่าน API ด้านล่าง
//
//   SkillFX.init(scene, opts)                    สร้างพูลเมช/วัสดุ/GlowLayer ครั้งเดียว (combat.js เรียกให้)
//   SkillFX.update(dt)                           เรียกทุกเฟรม
//   SkillFX.dashBoom(x,y,z, dirX,dirZ, scale)    Z: วงแหวนเสียงแตก (sonic-boom) + เส้นแรงดัน 1 ชุด ณ จุดที่พุ่งผ่าน
//   SkillFX.barrage({x,y,z,duration,rate,radius,lenMin,lenMax,flare}) → { setCenter, stop, cancel }
//                                                รัวเส้นฟันขาว/เงินตัดกันรอบจุดศูนย์กลาง (Z 0.75 วิ / X 3 วิ)
//   SkillFX.hitSpark(x,y,z, n)                   ประกายตอนโดนฟัน 1 ทิก
//   SkillFX.lockRing(x,y,z, dur, size)           วงล็อกเป้าที่พื้น
//   SkillFX.finisher({x,y,z}, {impactDelay})     X: เสาพลังขาวตกจากฟ้า + เศษแหลม + วงกระแทกพื้น + สั่นจอเบาๆ
//   SkillFX.beam({x,y,z,yaw,length,speed,width})  ดาบ Z: ลำแสงยาวพร้อมวงแหวนเกลียวฟ้า-ม่วง (ภาพอ้างอิง Piercing Beam)
//   SkillFX.explosion(x,y,z, radius)             ดาบ Z: ระเบิดทรงกลมขาว + วงหมุนวน + แรงกระแทก (ภาพอ้างอิงระเบิด)
//   SkillFX.crescent({x,y,z,yaw,range,speed,startRadius,height})  ดาบ X: คลื่นเสี้ยวพระจันทร์ 3 ชั้นกวาด 180° ด้านหน้า
//   SkillFX.cancelAll() / SkillFX.dispose()      ล้างเอฟเฟกต์ที่เล่นอยู่ / ทิ้งทุกอย่าง
//
// ทุกอย่างเป็นพูลขนาดคงที่ (ไม่สร้างเมชใหม่ระหว่างเล่น) — พูลเต็มก็แค่ข้ามเอฟเฟกต์ชิ้นนั้น ไม่ล้น/ไม่แลค
const SkillFX = (() => {
  'use strict';
  let B = null, scene = null, ok = false, glow = null, shakeObs = null, disposeObs = null, dust = null, dustPos = null;
  let O = {};
  const mat = {}, tex = {}, tpl = {};
  const P = { ring: [], streak: [], slash: [], spark: [], shard: [], flare: [] };
  const barrages = [];
  const pil = { on: false, t: 0, x: 0, y: 0, z: 0, delay: 0.12, hold: 0.22, fade: 0.55, h: 44, hit: false, core: null, shell: null, halo: null };
  const bm = { on: false, t: 0, x: 0, y: 0, z: 0, dx: 0, dz: 1, yaw: 0, L: 20, speed: 100, w: 1.5, ringT: 0, tipT: 0, core: null, mid: null, outer: null };
  const ex = { on: false, t: 0, x: 0, y: 0, z: 0, R: 5, core: null, shell: null };
  const cw = { on: false, t: 0, x: 0, y: 0, z: 0, yaw: 0, range: 40, speed: 30, r0: 1.2, h: 6.5, dustT: 0, waves: [] };
  const shk = { amp: 0, t: 0, dur: 0.3 };
  const camR = { x: 1, y: 0, z: 0 }, camU = { x: 0, y: 1, z: 0 };
  let tmpV = null, tmpR = null, tmpU = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const easeOut = k => 1 - (1 - k) * (1 - k);
  const easeOut3 = k => 1 - Math.pow(1 - clamp01(k), 3);
  const take = pool => { for (let i = 0; i < pool.length; i++) if (!pool[i].on) return pool[i]; return null; };   // พูลเต็ม → null (ข้าม)
  const noop = { setCenter() {}, stop() {}, cancel() {} };

  // ---------- สร้างของ (ครั้งเดียว) ----------
  function makeTex(name, size, draw) {
    const t = new B.DynamicTexture(name, size, scene, true), c = t.getContext();
    c.fillStyle = '#000'; c.fillRect(0, 0, size, size); draw(c, size); t.update(); return t;   // พื้นดำ + ลายขาว → ใช้กับ additive (ดำ = ไม่เห็น)
  }
  function buildTextures() {
    tex.soft = makeTex('fxSoft', 128, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, '#000');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    tex.star = makeTex('fxStar', 128, (c, s) => {                      // ประกายสี่แฉกคมๆ + แกนสว่าง
      const m = s / 2, g = c.createRadialGradient(m, m, 0, m, m, m * 0.42);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#000'); c.fillStyle = g; c.fillRect(0, 0, s, s);
      c.fillStyle = '#fff';
      [[0, 1], [1, 0]].forEach(([a, b]) => {
        c.beginPath(); c.moveTo(m + a * (m - 2), m + b * (m - 2)); c.lineTo(m + b * s * 0.035, m + a * s * 0.035);
        c.lineTo(m - a * (m - 2), m - b * (m - 2)); c.lineTo(m - b * s * 0.035, m - a * s * 0.035); c.closePath(); c.fill();
      });
    });
  }
  function addMat(name, r, g, b, texture) {
    const m = new B.StandardMaterial(name, scene);
    m.disableLighting = true; m.backFaceCulling = false; m.diffuseColor = B.Color3.Black(); m.specularColor = B.Color3.Black();
    m.emissiveColor = texture ? B.Color3.Black() : new B.Color3(r, g, b);
    if (texture) m.emissiveTexture = texture;
    m.alphaMode = B.Engine.ALPHA_ADD;                                  // เรืองแสงแบบบวกสี
    m.alpha = 0.999;                                                   // < 1 เพื่อให้ถูกวาดแบบโปร่งใส (visibility ของแต่ละเมชคุมความสว่างได้)
    m.disableDepthWrite = true; m.fogEnabled = false;
    return m;
  }
  function buildMaterials() {
    mat.white = addMat('fxWhite', 1, 1, 1);
    mat.silver = addMat('fxSilver', 0.72, 0.86, 1);                    // เงินอมฟ้า ใช้เป็นฮาโล/ชั้นนอก
    mat.cyan = addMat('fxCyan', 0.3, 0.9, 1); mat.violet = addMat('fxViolet', 0.8, 0.45, 1);
    mat.blue = addMat('fxBlue', 0.35, 0.6, 1); mat.ice = addMat('fxIce', 0.82, 0.96, 1);
    mat.star = addMat('fxStarM', 1, 1, 1, tex.star);
    mat.soft = addMat('fxSoftM', 1, 1, 1, tex.soft);
  }
  function buildGlow() {
    const existing = scene.effectLayers && scene.effectLayers.find(l => l.getClassName && l.getClassName() === 'GlowLayer');
    if (existing || O.glow === false) return;                          // ฉากมี GlowLayer อยู่แล้ว → ใช้ของเดิม (วัสดุเรืองแสงของเราจะถูกเก็บเอง)
    glow = new B.GlowLayer('skillGlow', scene, { mainTextureRatio: 0.4, blurKernelSize: 32 });
    glow.intensity = O.glowIntensity; glow.isEnabled = false;          // ปิดไว้จนกว่าจะมีเอฟเฟกต์ — ไม่เสียเฟรมตอนไม่ได้ใช้สกิล
  }
  function prep(m, material) {
    m.material = material; m.isPickable = false; m.isVisible = false; m.alwaysSelectAsActiveMesh = true; m.receiveShadows = false;
    if (glow) glow.addIncludedOnlyMesh(m);                             // Glow เฉพาะเมชเอฟเฟกต์ ไม่ทำให้ทั้งฉากเบลอ/แพง
    return m;
  }
  function buildCrescent() {   // เสี้ยวพระจันทร์: โค้งครึ่งวงกลม 180° ในแนวราบ (x=sinθ, z=cosθ) สูงตรงกลาง เรียวแหลมถึงพื้นที่ปลาย — ขอบบน/ล่างสว่าง ตรงกลางโปร่ง
    const N = 48, pos = [], col = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, th = (u - 0.5) * Math.PI, sx = Math.sin(th), cz = Math.cos(th), sn = Math.sin(Math.PI * u);
      const up = Math.pow(sn, 0.55), lo = up * (1 - 0.62 * sn);
      pos.push(sx, up, cz, sx, (up + lo) / 2, cz, sx, lo, cz);
      col.push(1, 1, 1, 1, 1, 1, 1, 0.16, 1, 1, 1, 0.9);
    }
    for (let i = 0; i < N; i++) for (let r = 0; r < 2; r++) { const a = i * 3 + r, b = (i + 1) * 3 + r; idx.push(a, b, b + 1, a, b + 1, a + 1); }
    const m = new B.Mesh('fxCrescentT', scene), vd = new B.VertexData();
    vd.positions = pos; vd.indices = idx; vd.colors = col; vd.applyToMesh(m); m.hasVertexAlpha = true; return m;
  }
  const clone = (t, name) => { const m = t.clone(name); m.isVisible = false; if (glow) glow.addIncludedOnlyMesh(m); return m; };   // โคลนใช้เรขาคณิต/วัสดุร่วมกับต้นแบบ
  function buildPools() {
    const M = B.MeshBuilder;
    tpl.ring = prep(M.CreateTorus('fxRingT', { diameter: 1, thickness: 0.03, tessellation: 56 }, scene), mat.white);
    tpl.box = prep(M.CreateBox('fxBoxT', { size: 1 }, scene), mat.white);
    tpl.quad = prep(M.CreatePlane('fxQuadT', { size: 1 }, scene), mat.star);
    tpl.shard = prep(M.CreateCylinder('fxShardT', { height: 1, diameterTop: 0, diameterBottom: 0.2, tessellation: 4 }, scene), mat.white);
    for (let i = 0; i < (O.maxRings || 30); i++) P.ring.push({ on: false, mesh: clone(tpl.ring, 'fxRing' + i) });
    for (let i = 0; i < (O.maxStreaks || 24); i++) P.streak.push({ on: false, mesh: clone(tpl.box, 'fxStreak' + i) });
    for (let i = 0; i < (O.maxSlashes || 26); i++) {
      const core = clone(tpl.box, 'fxSlash' + i), halo = clone(tpl.box, 'fxSlashH' + i);
      halo.material = mat.silver; halo.parent = core; halo.scaling.set(3.4, 3.4, 1); halo.isVisible = false;
      P.slash.push({ on: false, mesh: core, halo });
    }
    for (let i = 0; i < (O.maxSparks || 110); i++) { const m = clone(tpl.quad, 'fxSpark' + i); m.billboardMode = B.Mesh.BILLBOARDMODE_ALL; P.spark.push({ on: false, mesh: m }); }
    for (let i = 0; i < 6; i++) { const m = clone(tpl.quad, 'fxFlare' + i); m.billboardMode = B.Mesh.BILLBOARDMODE_ALL; m.material = mat.soft; P.flare.push({ on: false, mesh: m }); }
    for (let i = 0; i < (O.maxShards || 20); i++) P.shard.push({ on: false, mesh: clone(tpl.shard, 'fxShard' + i) });
    [P.ring, P.streak, P.spark, P.flare, P.shard].forEach(a => a.forEach(e => { e.mesh.isVisible = false; }));
    P.slash.forEach(e => { e.mesh.isVisible = false; e.halo.isVisible = false; });
    // ลำแสง (แกนขาว / ปลอกฟ้า / ฮาโลม่วง), ทรงกลมระเบิด 2 ชั้น, คลื่นเสี้ยวพระจันทร์ 3 ชั้น
    const cylB = (n, m2) => prep(M.CreateCylinder(n, { height: 1, diameter: 1, tessellation: 14 }, scene), m2);
    bm.core = cylB('fxBeamCore', mat.white); bm.mid = cylB('fxBeamMid', mat.cyan); bm.outer = cylB('fxBeamOut', mat.violet);
    tpl.sphere = prep(M.CreateSphere('fxSphereT', { diameter: 1, segments: 18 }, scene), mat.white);
    ex.core = clone(tpl.sphere, 'fxExCore'); ex.shell = clone(tpl.sphere, 'fxExShell'); ex.shell.material = mat.ice;
    tpl.crescent = prep(buildCrescent(), mat.ice);
    [[mat.ice, 0, 1, 0.95], [mat.cyan, 0.09, 0.82, 0.85], [mat.blue, 0.18, 0.62, 0.75]].forEach(([mt, delay, hMul, v0], i) => {
      const m = clone(tpl.crescent, 'fxWave' + i); m.material = mt; m.hasVertexAlpha = true; cw.waves.push({ mesh: m, delay, hMul, v0 });
    });
    // เสาพลังฟินิชเชอร์ 3 ชั้น (แกน / เปลือก / ฮาโล) — กระบอกเปิดปลาย ไม่มีฝา
    const cyl = (n, m2) => prep(M.CreateCylinder(n, { height: 1, diameter: 1, tessellation: 28, cap: B.Mesh.NO_CAP }, scene), m2);
    pil.core = cyl('fxPilCore', mat.white); pil.shell = cyl('fxPilShell', mat.silver); pil.halo = cyl('fxPilHalo', mat.silver);
  }
  function buildDust() {                                                // ระบบอนุภาคฝุ่น/หมอกขาวที่พื้น (1 ระบบ ใช้ซ้ำ) — ล้มเหลวก็ข้าม
    try {
      dustPos = new B.Vector3();
      const ps = new B.ParticleSystem('skillDust', 200, scene);
      ps.particleTexture = tex.soft; ps.emitter = dustPos;
      ps.minEmitBox = new B.Vector3(-0.7, 0, -0.7); ps.maxEmitBox = new B.Vector3(0.7, 0.15, 0.7);
      ps.direction1 = new B.Vector3(-1, 0.4, -1); ps.direction2 = new B.Vector3(1, 1.6, 1);
      ps.minEmitPower = 2; ps.maxEmitPower = 7; ps.minLifeTime = 0.3; ps.maxLifeTime = 0.8;
      ps.minSize = 0.6; ps.maxSize = 1.9;
      ps.color1 = new B.Color4(1, 1, 1, 0.55); ps.color2 = new B.Color4(0.8, 0.9, 1, 0.4); ps.colorDead = new B.Color4(1, 1, 1, 0);
      ps.gravity = new B.Vector3(0, -2.5, 0); ps.emitRate = 0; ps.blendMode = B.ParticleSystem.BLENDMODE_ADD;
      ps.start(); dust = ps;
    } catch (e) { dust = null; console.warn('[skill-fx] dust particles unavailable', e); }
  }
  function dustAt(x, y, z, n) { if (!dust) return; dustPos.set(x, y, z); dust.manualEmitCount = Math.max(0, dust.manualEmitCount) + n; }

  function init(sc, opts) {
    if (ok && scene === sc) return true;
    if (typeof BABYLON === 'undefined' || !sc) return false;
    dispose();
    B = BABYLON; scene = sc;
    O = Object.assign({ glow: true, glowIntensity: 1.0, shake: true }, opts || {});
    try {
      tmpV = new B.Vector3(); tmpR = new B.Vector3(); tmpU = new B.Vector3();
      buildTextures(); buildMaterials(); buildGlow(); buildPools(); buildDust();
      shakeObs = scene.onBeforeRenderObservable.add(applyShake);
      disposeObs = scene.onDisposeObservable.add(() => { ok = false; });
      ok = true;
    } catch (e) { console.warn('[skill-fx] init failed — สกิลยังใช้ได้แต่ไม่มีภาพ', e); try { dispose(); } catch (_) {} ok = false; }
    return ok;
  }

  // ---------- ตัวสร้างชิ้นเอฟเฟกต์ ----------
  function ringSpawn(o) {
    const e = take(P.ring); if (!e) return null;
    const m = e.mesh;
    e.on = true; e.t = 0; e.life = o.life || 0.4; e.s0 = o.s0; e.s1 = o.s1; e.v = o.v == null ? 1 : o.v;
    e.vx = o.vx || 0; e.vy = o.vy || 0; e.vz = o.vz || 0; e.pulse = o.pulse || 0; e.hold = o.hold || 0;
    m.material = o.mat || mat.white; m.position.set(o.x, o.y, o.z);
    if (o.flat) m.rotation.set(o.tilt || 0, 0, (o.tilt || 0) * 0.6); else m.rotation.set(Math.PI / 2, o.yaw || 0, 0);   // แกนวงแหวนชี้ตามทิศพุ่ง
    m.scaling.setAll(o.s0); m.visibility = e.v; m.isVisible = true;
    return e;
  }
  function streakSpawn(x, y, z, yaw, len, speed, life, thick) {
    const e = take(P.streak); if (!e) return;
    const m = e.mesh; e.on = true; e.t = 0; e.life = life; e.len = len; e.vx = Math.sin(yaw) * speed; e.vz = Math.cos(yaw) * speed;
    m.position.set(x, y, z); m.rotation.set(0, yaw, 0); m.scaling.set(thick, thick, len); m.visibility = 1; m.isVisible = true;
  }
  function slashSpawn(cx, cy, cz, o) {
    const e = take(P.slash); if (!e) return;
    let dx, dy, dz;
    if (Math.random() < 0.72) {                                        // ส่วนใหญ่ฟันในระนาบหน้าจอ → เห็นเป็นเส้นตัดกันเหมือนภาพอ้างอิง
      const a = Math.random() * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
      dx = camR.x * ca + camU.x * sa; dy = camR.y * ca + camU.y * sa; dz = camR.z * ca + camU.z * sa;
    } else { dx = rnd(-1, 1); dy = rnd(-1, 1); dz = rnd(-1, 1); }
    const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    const px = cx + rnd(-1, 1) * o.radius, py = cy + rnd(-1, 1) * o.radius * 0.7, pz = cz + rnd(-1, 1) * o.radius;
    const m = e.mesh;
    m.position.set(px, py, pz); tmpV.set(px + dx, py + dy, pz + dz); m.lookAt(tmpV);
    e.on = true; e.t = 0; e.life = rnd(0.11, 0.2); e.len = rnd(o.lenMin, o.lenMax); e.thick = rnd(0.045, 0.085);
    m.scaling.set(e.thick, e.thick, 0.01); m.visibility = 1; m.isVisible = true; e.halo.visibility = 0.4; e.halo.isVisible = true;
  }
  function sparkSpawn(x, y, z, vx, vy, vz, size, life, grav) {
    const e = take(P.spark); if (!e) return;
    const m = e.mesh; e.on = true; e.t = 0; e.life = life; e.vx = vx; e.vy = vy; e.vz = vz; e.size = size; e.grav = grav || 0;
    m.position.set(x, y, z); m.scaling.setAll(size); m.visibility = 1; m.isVisible = true;
  }
  function burstSparks(x, y, z, n, speed, size, life, grav, up) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), u = rnd(-0.3, 1) * (up || 0.6), s = rnd(0.4, 1) * speed;
      sparkSpawn(x, y, z, Math.cos(a) * s, u * s, Math.sin(a) * s, rnd(0.5, 1) * size, rnd(0.6, 1) * life, grav);
    }
  }
  function shardSpawn(x, y, z, vx, vy, vz, len, life) {
    const e = take(P.shard); if (!e) return;
    const m = e.mesh; e.on = true; e.t = 0; e.life = life; e.vx = vx; e.vy = vy; e.vz = vz; e.len = len;
    e.sx = rnd(-14, 14); e.sz = rnd(-14, 14);
    m.position.set(x, y, z); m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); m.scaling.set(1, len, 1); m.visibility = 1; m.isVisible = true;
  }
  function flareSpawn(x, y, z, s0, s1, life, v) {
    const e = take(P.flare); if (!e) return;
    const m = e.mesh; e.on = true; e.t = 0; e.life = life; e.s0 = s0; e.s1 = s1; e.v = v;
    m.position.set(x, y, z); m.scaling.setAll(s0); m.visibility = v; m.isVisible = true;
  }

  // ---------- API ----------
  function dashBoom(x, y, z, dx, dz, scale) {                          // Z: วงแหวนใหญ่หลายชั้น + เส้นแรงดัน + ประกายพื้น
    if (!ok) return;
    const s = scale || 1, yaw = Math.atan2(dx, dz), big = rnd(5.6, 7.4) * s, mid = big * 0.58;
    const cy = y + big * 0.3, spd = 7 * s;
    ringSpawn({ x, y: cy, z, yaw, s0: big * 0.35, s1: big, life: 0.42, v: 1, vx: dx * spd, vz: dz * spd, mat: mat.white });
    ringSpawn({ x: x + dx * 0.5, y: y + mid * 0.3, z: z + dz * 0.5, yaw, s0: mid * 0.3, s1: mid, life: 0.34, v: 0.9, vx: dx * spd * 1.3, vz: dz * spd * 1.3, mat: mat.silver });
    const rx = dz, rz = -dx;                                           // เวกเตอร์ขวาของทิศพุ่ง
    for (let i = 0; i < 3; i++) {
      const a = rnd(0, 6.283), r = rnd(0.5, 1.8) * s, side = Math.cos(a) * r, up = 0.9 + Math.sin(a) * r * 0.6;
      streakSpawn(x + rx * side, y + Math.max(0.15, up), z + rz * side, yaw, rnd(3.5, 6.5) * s, rnd(26, 38), 0.24, 0.05);
    }
    burstSparks(x, y + 0.3, z, 4, 6, 0.28, 0.4, -6, 0.3);
    const f = P.shard.length ? 2 : 0;                                  // เศษแหลมเตี้ยๆ ไหลไปข้างหลัง/ข้างตัว เหมือนสันฝุ่นขาวในภาพอ้างอิง
    for (let i = 0; i < f; i++) shardSpawn(x, y + 0.2, z, -dx * rnd(2, 6) + rx * rnd(-5, 5), rnd(2, 5), -dz * rnd(2, 6) + rz * rnd(-5, 5), rnd(0.5, 1.1), 0.45);
    dustAt(x, y, z, 6);
  }
  function barrage(o) {
    if (!ok) return noop;
    const h = { c: { x: o.x, y: o.y, z: o.z }, t: 0, dur: o.duration || 1, rate: o.rate || 80, acc: 0, radius: o.radius || 1, lenMin: o.lenMin || 4, lenMax: o.lenMax || 9, flare: o.flare || 1, flT: 0, stopped: false, alive: true };
    barrages.push(h);
    flareSpawn(h.c.x, h.c.y, h.c.z, 1.2 * h.flare, 4.2 * h.flare, 0.28, 1);
    ringSpawn({ x: h.c.x, y: h.c.y - 0.9, z: h.c.z, flat: true, s0: 1.5, s1: 6.5 * h.flare, life: 0.35, v: 0.9, mat: mat.silver });
    for (let i = 0; i < 8; i++) slashSpawn(h.c.x, h.c.y, h.c.z, h);   // เปิดด้วยเส้นฟันชุดแรกทันที
    dustAt(h.c.x, h.c.y - 0.8, h.c.z, 10);
    return { setCenter(x, y, z) { h.c.x = x; h.c.y = y; h.c.z = z; }, stop() { h.stopped = true; }, cancel() { h.alive = false; } };
  }
  function hitSpark(x, y, z, n) {
    if (!ok) return;
    flareSpawn(x, y, z, 0.8, 2.2, 0.16, 0.9);
    burstSparks(x, y, z, Math.min(n || 4, 12), 7, 0.3, 0.35, -7, 0.8);
  }
  function lockRing(x, y, z, dur, size) {
    if (!ok) return;
    ringSpawn({ x, y, z, flat: true, s0: size * 1.6, s1: size, life: Math.max(0.3, dur), v: 0.85, hold: 0.8, pulse: 0.05, mat: mat.silver });
    ringSpawn({ x, y: y + 0.02, z, flat: true, s0: size * 0.6, s1: size * 0.75, life: Math.max(0.3, dur), v: 0.6, hold: 0.8, pulse: 0.08, mat: mat.white });
  }
  function finisher(pos, o) {                                           // X: เสาพลังตกจากฟ้า (ภาพอ้างอิงที่ 3)
    if (!ok) return;
    o = o || {};
    pil.on = true; pil.t = 0; pil.hit = false; pil.x = pos.x; pil.y = pos.y; pil.z = pos.z;
    pil.delay = Math.max(0.05, o.impactDelay || 0.12); pil.hold = 0.22; pil.fade = 0.55;
    ringSpawn({ x: pos.x, y: pos.y + 0.1, z: pos.z, flat: true, s0: 11, s1: 2, life: pil.delay + 0.04, v: 0.7, mat: mat.silver });   // วงรวมพลังหดเข้า ก่อนตก
  }
  function impactBurst() {
    const x = pil.x, y = pil.y, z = pil.z;
    ringSpawn({ x, y: y + 0.12, z, flat: true, s0: 2, s1: 17, life: 0.6, v: 1, mat: mat.white });
    ringSpawn({ x, y: y + 0.16, z, flat: true, s0: 1.5, s1: 10.5, life: 0.45, v: 0.9, mat: mat.silver });
    ringSpawn({ x, y: y + 0.2, z, flat: true, s0: 1, s1: 6, life: 0.32, v: 1, mat: mat.white });
    flareSpawn(x, y + 0.7, z, 3, 12, 0.4, 1);
    flareSpawn(x, y + 3, z, 2, 7, 0.3, 0.9);
    for (let i = 0; i < 14; i++) {                                      // เศษแหลมกระเด็นออก
      const a = rnd(0, 6.283), s = rnd(5, 13);
      shardSpawn(x, y + 0.3, z, Math.cos(a) * s, rnd(5, 12), Math.sin(a) * s, rnd(0.7, 1.8), rnd(0.55, 0.9));
    }
    burstSparks(x, y + 0.4, z, 26, 13, 0.4, 0.75, -9, 1);
    dustAt(x, y + 0.2, z, 40);
    if (O.shake !== false) { shk.amp = 0.4; shk.t = shk.dur = 0.45; }
  }

  function beam(o) {                                                   // ดาบ Z: ลำแสงพุ่งยาวจากดาบ — วงแหวนฟ้า/ม่วงหมุนเกลียวรอบแกน
    if (!ok) return;
    Object.assign(bm, { on: true, t: 0, x: o.x, y: o.y, z: o.z, yaw: o.yaw, dx: Math.sin(o.yaw), dz: Math.cos(o.yaw), L: o.length, speed: o.speed, w: o.width, ringT: 0, tipT: 0 });
    [bm.core, bm.mid, bm.outer].forEach(m => { m.rotation.set(Math.PI / 2, o.yaw, 0); m.isVisible = true; });
    flareSpawn(o.x, o.y, o.z, 1.5, 5, 0.3, 1);
    ringSpawn({ x: o.x + bm.dx * 0.6, y: o.y, z: o.z + bm.dz * 0.6, yaw: o.yaw, s0: 0.8, s1: 4.2, life: 0.35, v: 1, vx: bm.dx * 8, vz: bm.dz * 8, mat: mat.cyan });
    burstSparks(o.x, o.y, o.z, 10, 8, 0.3, 0.3, 0, 0.8);
    if (O.shake !== false && shk.t <= 0) { shk.amp = 0.12; shk.t = shk.dur = 0.25; }
  }
  function explosion(x, y, z, R) {                                     // ดาบ Z: ทรงกลมแสงขาวขยายเร็ว + วงหมุนวนหลายระดับ + เศษ/ฝุ่น
    if (!ok) return;
    Object.assign(ex, { on: true, t: 0, x, y, z, R });
    ex.core.isVisible = true; ex.shell.isVisible = true;
    ringSpawn({ x, y: y + 0.25, z, flat: true, s0: 2, s1: R * 3.4, life: 0.65, v: 1, mat: mat.cyan });
    ringSpawn({ x, y: y + 0.3, z, flat: true, s0: 1.5, s1: R * 2.3, life: 0.5, v: 1, mat: mat.white });
    [[0.9, 2.8, 0.8, mat.ice, 0.06], [2.3, 2.2, 0.7, mat.cyan, -0.05], [3.8, 1.6, 0.6, mat.white, 0.04]].forEach(([h, k, life, mt, tilt]) =>
      ringSpawn({ x, y: y + h * (R / 5.5), z, flat: true, tilt, s0: R * 0.7, s1: R * k, life, v: 0.9, mat: mt }));
    flareSpawn(x, y + R * 0.6, z, R * 1.4, R * 4.5, 0.45, 1);
    for (let i = 0; i < 12; i++) { const a = rnd(0, 6.283), sp = rnd(6, 14); shardSpawn(x, y + 0.4, z, Math.cos(a) * sp, rnd(6, 13), Math.sin(a) * sp, rnd(0.7, 1.7), rnd(0.55, 0.9)); }
    burstSparks(x, y + 0.5, z, 30, 14, 0.4, 0.8, -8, 1);
    dustAt(x, y + 0.2, z, 45);
    if (O.shake !== false) { shk.amp = 0.35; shk.t = shk.dur = 0.5; }
  }
  function crescent(o) {                                               // ดาบ X: คลื่นเสี้ยวพระจันทร์ 3 ชั้นไล่กันออกไป กวาดครอบ 180° ด้านหน้า
    if (!ok) return;
    Object.assign(cw, { on: true, t: 0, x: o.x, y: o.y + 0.05, z: o.z, yaw: o.yaw, range: o.range, speed: o.speed, r0: o.startRadius || 1.2, h: o.height || 6.5, dustT: 0 });
    cw.waves.forEach(w => { w.mesh.isVisible = false; });
    flareSpawn(o.x + Math.sin(o.yaw) * 1.5, o.y + 1.2, o.z + Math.cos(o.yaw) * 1.5, 1.5, 6, 0.3, 1);
    ringSpawn({ x: o.x, y: o.y + 0.15, z: o.z, flat: true, s0: 2, s1: 9, life: 0.4, v: 0.9, mat: mat.ice });
    if (O.shake !== false) { shk.amp = 0.2; shk.t = shk.dur = 0.35; }
  }

  function cancelAll() {
    for (const k in P) P[k].forEach(e => { e.on = false; e.mesh.isVisible = false; if (e.halo) e.halo.isVisible = false; });
    barrages.length = 0; pil.on = false; bm.on = ex.on = cw.on = false;
    [bm.core, bm.mid, bm.outer, ex.core, ex.shell].forEach(m => { if (m) m.isVisible = false; }); cw.waves.forEach(w => { w.mesh.isVisible = false; });
    if (pil.core) [pil.core, pil.shell, pil.halo].forEach(m => { m.isVisible = false; });
    if (glow) glow.isEnabled = false;
    shk.t = 0;
  }

  // ---------- อัปเดตทุกเฟรม ----------
  function camBasis() {
    const cam = scene.activeCamera; if (!cam) return;
    try {
      cam.getDirectionToRef(B.Axis.X, tmpR); cam.getDirectionToRef(B.Axis.Y, tmpU);
      camR.x = tmpR.x; camR.y = tmpR.y; camR.z = tmpR.z; camU.x = tmpU.x; camU.y = tmpU.y; camU.z = tmpU.z;
    } catch (e) { /* ใช้ค่าเดิม */ }
  }
  function updPools(dt) {
    let n = 0;
    for (const e of P.ring) if (e.on) {
      n++; e.t += dt; const k = e.t / e.life, m = e.mesh;
      if (k >= 1) { e.on = false; m.isVisible = false; continue; }
      let s = e.s0 + (e.s1 - e.s0) * easeOut(k); if (e.pulse) s *= 1 + e.pulse * Math.sin(e.t * 20);
      m.scaling.setAll(s); m.position.x += e.vx * dt; m.position.y += e.vy * dt; m.position.z += e.vz * dt;
      m.visibility = e.v * (e.hold && k < e.hold ? 1 : e.hold ? 1 - (k - e.hold) / (1 - e.hold) : Math.pow(1 - k, 1.4));
    }
    for (const e of P.streak) if (e.on) {
      n++; e.t += dt; const k = e.t / e.life, m = e.mesh;
      if (k >= 1) { e.on = false; m.isVisible = false; continue; }
      m.position.x += e.vx * dt; m.position.z += e.vz * dt; m.visibility = 1 - k * k;
    }
    for (const e of P.slash) if (e.on) {
      n++; e.t += dt; const k = e.t / e.life, m = e.mesh;
      if (k >= 1) { e.on = false; m.isVisible = false; e.halo.isVisible = false; continue; }
      const grow = easeOut3(k / 0.3), v = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;   // ลากเส้นออกเร็ว แล้วจางลง
      m.scaling.z = e.len * grow; m.visibility = v; e.halo.visibility = 0.4 * v;
    }
    for (const e of P.spark) if (e.on) {
      n++; e.t += dt; const k = e.t / e.life, m = e.mesh;
      if (k >= 1) { e.on = false; m.isVisible = false; continue; }
      e.vy += e.grav * dt; m.position.x += e.vx * dt; m.position.y += e.vy * dt; m.position.z += e.vz * dt;
      m.scaling.setAll(e.size * (1 - k * 0.6)); m.visibility = 1 - k;
    }
    for (const e of P.shard) if (e.on) {
      n++; e.t += dt; const k = e.t / e.life, m = e.mesh;
      if (k >= 1) { e.on = false; m.isVisible = false; continue; }
      e.vy -= 22 * dt; m.position.x += e.vx * dt; m.position.y += e.vy * dt; m.position.z += e.vz * dt;
      m.rotation.x += e.sx * dt; m.rotation.z += e.sz * dt; m.visibility = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    }
    for (const e of P.flare) if (e.on) {
      n++; e.t += dt; const k = e.t / e.life, m = e.mesh;
      if (k >= 1) { e.on = false; m.isVisible = false; continue; }
      m.scaling.setAll(e.s0 + (e.s1 - e.s0) * easeOut(k)); m.visibility = e.v * (1 - k);
    }
    return n;
  }
  function updBarrages(dt) {
    for (let i = barrages.length - 1; i >= 0; i--) {
      const h = barrages[i]; h.t += dt;
      if (!h.alive || h.stopped || h.t >= h.dur) { barrages.splice(i, 1); continue; }   // หยุดสร้างเส้นใหม่ — เส้นที่เหลือจางเอง (fade-out)
      h.acc += h.rate * dt; let n = Math.min(8, Math.floor(h.acc)); h.acc -= Math.floor(h.acc);
      while (n-- > 0) slashSpawn(h.c.x, h.c.y, h.c.z, h);
      if ((h.flT -= dt) <= 0) { h.flT = 0.07; flareSpawn(h.c.x + rnd(-0.3, 0.3), h.c.y + rnd(-0.3, 0.3), h.c.z + rnd(-0.3, 0.3), rnd(1.4, 2.2) * h.flare, rnd(2.4, 3.6) * h.flare, 0.12, 0.9); burstSparks(h.c.x, h.c.y, h.c.z, 2, 9, 0.26, 0.3, 0, 0.7); }
    }
  }
  function updPillar(dt) {
    if (!pil.on) return;
    pil.t += dt;
    const T0 = pil.delay, H = pil.h, gy = pil.y;
    let w, a, bottom;                                                   // w = ความกว้าง (0–1), a = ความสว่าง, bottom = ขอบล่างของเสา
    if (pil.t < T0) { const k = pil.t / T0; bottom = gy + H * (1 - k * k); w = 0.14; a = 0.65; }   // ช่วงตก: เสาบางพุ่งลงมาเร็วๆ
    else {
      if (!pil.hit) { pil.hit = true; impactBurst(); }
      const kk = pil.t - T0, widen = easeOut3(kk / 0.07), d = clamp01((kk - pil.hold) / pil.fade);
      bottom = gy; w = (0.14 + 0.86 * widen) * (1 - 0.8 * d * d); a = 1 - d * d;
      if (d >= 1) { pil.on = false; [pil.core, pil.shell, pil.halo].forEach(m => { m.isVisible = false; }); return; }
    }
    const cy = bottom + H / 2, f = (m, dia, vis) => { m.position.set(pil.x, cy, pil.z); m.scaling.set(dia * w, H, dia * w); m.visibility = vis * a; m.isVisible = vis * a > 0.01; };
    f(pil.core, 2.2, 1); f(pil.shell, 3.9, 0.55); f(pil.halo, 6.2, 0.2);   // แกนขาวจัด + เปลือกเงิน + ฮาโลบางๆ (ไม่เต็มจอ)
  }
  function setCyl(m, dia, len, cx, cy, cz, vis) { m.position.set(cx, cy, cz); m.scaling.set(dia, Math.max(0.01, len), dia); m.visibility = vis; }
  function updBeam(dt) {
    if (!bm.on) return 0;
    bm.t += dt;
    const full = bm.L / bm.speed, HOLD = 0.32, FADE = 0.35, age = bm.t - full;
    if (age > HOLD + FADE) { bm.on = false; [bm.core, bm.mid, bm.outer].forEach(m => { m.isVisible = false; }); return 0; }
    const k = age > HOLD ? clamp01((age - HOLD) / FADE) : 0, a = 1 - k * k, wv = 1 - 0.7 * k, pulse = 1 + 0.12 * Math.sin(bm.t * 60);
    const len = Math.min(bm.L, bm.speed * bm.t), cx = bm.x + bm.dx * len / 2, cz = bm.z + bm.dz * len / 2;
    setCyl(bm.core, 0.35 * bm.w * wv * pulse, len, cx, bm.y, cz, a);
    setCyl(bm.mid, 0.9 * bm.w * wv, len, cx, bm.y, cz, 0.55 * a);
    setCyl(bm.outer, 1.7 * bm.w * wv, len, cx, bm.y, cz, 0.22 * a);
    const rx = bm.dz, rz = -bm.dx;                                      // ขวาของแนวลำแสง
    for (let i = 0; i < 4; i++) {                                       // เกลียว 2 เส้นหมุนรอบแกน (จุดประกายสั้นๆ ต่อเนื่อง)
      const u = rnd(0, len), ang = u * 0.7 - bm.t * 38 + (i & 1) * Math.PI, r = bm.w * rnd(0.9, 1.5) * wv;
      sparkSpawn(bm.x + bm.dx * u + rx * Math.cos(ang) * r, bm.y + Math.sin(ang) * r, bm.z + bm.dz * u + rz * Math.cos(ang) * r, bm.dx * 6, 0, bm.dz * 6, 0.38, 0.14, 0);
    }
    if (age < HOLD && (bm.ringT -= dt) <= 0) {                          // วงแหวนขยายตามแนวลำแสง
      bm.ringT = 0.03; const u = rnd(0.05, 1) * len, mt = [mat.cyan, mat.violet, mat.white, mat.blue][(Math.random() * 4) | 0];
      ringSpawn({ x: bm.x + bm.dx * u, y: bm.y, z: bm.z + bm.dz * u, yaw: bm.yaw, s0: 1.2, s1: rnd(3.5, 6.2), life: 0.38, v: 0.9, vx: bm.dx * 10, vz: bm.dz * 10, mat: mt });
    }
    if ((bm.tipT -= dt) <= 0 && len < bm.L + 0.1) { bm.tipT = 0.05; flareSpawn(bm.x + bm.dx * len, bm.y, bm.z + bm.dz * len, 1.4, 3.6, 0.15, 1); }
    return 1;
  }
  function updEx(dt) {
    if (!ex.on) return 0;
    ex.t += dt; const t = ex.t;
    if (t > 0.85) { ex.on = false; ex.core.isVisible = ex.shell.isVisible = false; return 0; }
    const s = ex.R * easeOut3(t / 0.16), f = clamp01((t - 0.3) / 0.55), cy = ex.y + s * 0.7;
    ex.core.position.set(ex.x, cy, ex.z); ex.core.scaling.setAll(Math.max(0.01, 1.6 * s)); ex.core.visibility = 0.92 * (1 - Math.pow(f, 1.5));
    ex.shell.position.set(ex.x, cy, ex.z); ex.shell.scaling.setAll(Math.max(0.01, 2.1 * s)); ex.shell.visibility = 0.38 * (1 - f);
    return 1;
  }
  function updWaves(dt) {
    if (!cw.on) return 0;
    cw.t += dt; let live = 0;
    for (const w of cw.waves) {
      const tt = cw.t - w.delay, m = w.mesh;
      if (tt < 0) { live++; continue; }
      const r = cw.r0 + cw.speed * tt;
      if (r >= cw.range) { m.isVisible = false; continue; }
      live++;
      const hh = cw.h * w.hMul * (0.55 + 0.45 * easeOut(Math.min(1, tt / 0.25))) * (1 + 0.5 * r / cw.range);   // สูงขึ้นเมื่อไกลออกไป
      const fout = r > cw.range * 0.7 ? 1 - (r - cw.range * 0.7) / (cw.range * 0.3) : 1;
      m.position.set(cw.x, cw.y, cw.z); m.rotation.y = cw.yaw; m.scaling.set(r, hh, r);
      m.visibility = w.v0 * Math.min(1, tt / 0.06) * Math.max(0, fout); m.isVisible = true;
    }
    const tt = cw.t - cw.waves[0].delay;                                // ประกาย/ฝุ่น/เศษตามแนวหน้าคลื่น
    if (tt >= 0) {
      const r = cw.r0 + cw.speed * tt;
      if (r < cw.range) {
        for (let i = 0; i < 4; i++) { const a = cw.yaw + rnd(-1.45, 1.45), sx = Math.sin(a), cz = Math.cos(a); sparkSpawn(cw.x + sx * r, cw.y + rnd(0.1, 2.2), cw.z + cz * r, sx * 9, rnd(1, 4), cz * 9, rnd(0.3, 0.55), 0.3, -6); }
        if ((cw.dustT -= dt) <= 0) { cw.dustT = 0.06; const a = cw.yaw + rnd(-1.4, 1.4); dustAt(cw.x + Math.sin(a) * r, cw.y + 0.2, cw.z + Math.cos(a) * r, 3);
          const b = cw.yaw + rnd(-1.3, 1.3); shardSpawn(cw.x + Math.sin(b) * r, cw.y + 0.3, cw.z + Math.cos(b) * r, Math.sin(b) * 8, rnd(4, 9), Math.cos(b) * 8, rnd(0.6, 1.4), 0.5); }
      }
    }
    if (!live) cw.on = false;
    return live ? 1 : 0;
  }
  function applyShake() {
    if (shk.t <= 0 || O.shake === false || !scene) return;
    const cam = scene.activeCamera; if (!cam) return;
    const q = shk.t / shk.dur, a = shk.amp * q;
    cam.position.x += rnd(-a, a); cam.position.y += rnd(-a, a) * 0.7;
    shk.t -= Math.max(0.001, scene.getEngine().getDeltaTime() / 1000);   // updateCam ตั้งตำแหน่งใหม่ทุกเฟรม → ไม่สะสม
  }
  function update(dt) {
    if (!ok || !scene || scene.isDisposed) return;
    dt = Math.min(dt, 0.05);
    camBasis(); updBarrages(dt); updPillar(dt);
    const n = updPools(dt) + updBeam(dt) + updEx(dt) + updWaves(dt);
    if (glow) glow.isEnabled = n > 0 || pil.on || barrages.length > 0;
  }

  function dispose() {
    try {
      if (scene && !scene.isDisposed) {
        if (shakeObs) scene.onBeforeRenderObservable.remove(shakeObs);
        if (disposeObs) scene.onDisposeObservable.remove(disposeObs);
        for (const k in P) P[k].forEach(e => { if (e.halo) e.halo.dispose(); e.mesh.dispose(); });
        cw.waves.forEach(w => w.mesh.dispose());
        [pil.core, pil.shell, pil.halo, bm.core, bm.mid, bm.outer, ex.core, ex.shell, tpl.ring, tpl.box, tpl.quad, tpl.shard, tpl.sphere, tpl.crescent].forEach(m => m && m.dispose());
        Object.values(mat).forEach(m => m.dispose()); Object.values(tex).forEach(t => t.dispose());
        if (dust) dust.dispose();
        if (glow) glow.dispose();
      }
    } catch (e) { console.warn('[skill-fx] dispose', e); }
    for (const k in P) P[k].length = 0;
    barrages.length = 0; pil.on = bm.on = ex.on = cw.on = false; pil.core = pil.shell = pil.halo = bm.core = bm.mid = bm.outer = ex.core = ex.shell = null; cw.waves.length = 0;
    glow = dust = dustPos = shakeObs = disposeObs = null; ok = false; scene = null;
    Object.keys(mat).forEach(k => delete mat[k]); Object.keys(tex).forEach(k => delete tex[k]); Object.keys(tpl).forEach(k => delete tpl[k]);
  }

  return { init, update, dashBoom, barrage, hitSpark, lockRing, finisher, beam, explosion, crescent, cancelAll, dispose, get ready() { return ok; } };
})();
