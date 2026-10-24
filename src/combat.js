// ===== src/combat.js — อาวุธ (component) + สกิล + Hotbar + คอมโบ + เอฟเฟกต์เสี้ยวฟัน =====
// ต้องใส่ <script src="src/combat.js"></script> ต่อจาก health.js และก่อน game.js
//
// อาวุธ 1 ชิ้น = 1 component:  model (โมเดลติดมือ) + stats (ดาเมจ/ระยะ/มุมฟัน/ความไว) + combos (ท่าตีเรียงกัน) + skills
// ทุกท่าในคอมโบมีจังหวะของตัวเอง (ให้ต่างกันได้):
//   time   เวลาของการฟัน 1 ครั้ง (วินาที, หารด้วย stats.speed)     hitAt  ดาเมจเข้าที่กี่ % ของท่า (0–1)
//   gap    ระยะคั่น/หน่วงหลังท่าจบ ก่อนท่าถัดไปจะเริ่มได้ (วินาที)  — กดล่วงหน้าได้ ระบบเก็บคิวให้
//   mult   ตัวคูณดาเมจ   range/arc  ทับระยะ/มุมฟันเฉพาะท่า (เช่น แทง = แคบแต่ไกล)   dir  ทิศการฟัน +1 / -1
// ระดับคอมโบ: window = ต่อคอมโบได้ภายในกี่วินาที (นับหลัง gap) / loop = วนต่อเนื่อง / recovery = คูลดาวน์หลังจบท่าสุดท้าย (loop:false)
const Combat = (() => {
  // ---------- ท่าต่อสู้: 1 state ต่อ 1 คลิปใน Rig_Medium_CombatMelee.glb (วางที่ assets/weapon/ แล้วใส่ใน CFG.anims) ----------
  // ไม่มีไฟล์ → ใช้ท่า Attack อื่น แล้ว Throw/Use_Item จาก Rig_Medium_General แทน
  const atk = (clip, fb) => ({ clip: [new RegExp('^' + clip + '$', 'i'), /Attack/i, fb], lockMove: true });
  const ANIM_STATES = {
    atkDiagonal:   atk('Melee_1H_Attack_Slice_Diagonal', /^Throw$/i),
    atkHorizontal: atk('Melee_1H_Attack_Slice_Horizontal', /^Use_Item$/i),
    atkStab:       atk('Melee_1H_Attack_Stab', /^Throw$/i),
    atkChop:       atk('Melee_1H_Attack_Chop', /^Use_Item$/i),
    atkJumpChop:   atk('Melee_1H_Attack_Jump_Chop', /^Use_Item$/i),
    // ท่าสองมือ / สองดาบ — เตรียมไว้สำหรับอาวุธในอนาคต
    atk2hChop:     atk('Melee_2H_Attack_Chop', /^Use_Item$/i),
    atk2hSlice:    atk('Melee_2H_Attack_Slice', /^Throw$/i),
    atk2hSpin:     atk('Melee_2H_Attack_Spin', /^Throw$/i),
    atk2hSpinning: atk('Melee_2H_Attack_Spinning', /^Throw$/i),
    atk2hStab:     atk('Melee_2H_Attack_Stab', /^Throw$/i),
    atkDualChop:   atk('Melee_Dualwield_Attack_Chop', /^Use_Item$/i),
    atkDualSlice:  atk('Melee_Dualwield_Attack_Slice', /^Throw$/i),
    atkDualStab:   atk('Melee_Dualwield_Attack_Stab', /^Throw$/i)
  };

  // ---------- อาวุธ (component) ----------
  const grip = path => ({ path, slot: 'handslot.r', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 });
  // ลำดับท่าของทั้งสองอาวุธ: ฟันระดับ → จามลง → แทง → … แล้ววนกลับท่าแรก (loop) — แต่ละท่ามีจังหวะ (เวลา/หน่วงก่อนโดน/ระยะคั่น) ไม่เหมือนกัน
  //   เร็ว-หนัก-ฉับ-พัก : ฟันระดับเร็ว → จามลงง้างช้าแต่แรง → แทงฉับไว ไกล → พักหายใจก่อนวนใหม่
  const WEAPONS = {
    dagger: { name: 'Dagger', model: grip('weapon/dagger.gltf'),
      stats: { damage: 10, range: 2.3, arc: 75, speed: 1 },
      fx: { color: [0.55, 0.95, 1], life: 0.2, reach: 1.5, base: 0.3 },
      combos: { light: { loop: true, window: 0.5, steps: [
        { name: 'ฟันระดับ',   clip: 'atkHorizontal', time: 0.38, hitAt: 0.40, gap: 0.04, mult: 1,   dir: 1 },                     // เร็ว ต่อเนื่อง
        { name: 'จามลง',     clip: 'atkChop',       time: 0.55, hitAt: 0.60, gap: 0.12, mult: 1.4, arc: 95, fx: { reach: 1.8 } }, // ง้างนาน แรงขึ้น
        { name: 'แทง',       clip: 'atkStab',       time: 0.36, hitAt: 0.35, gap: 0.05, mult: 1.2, range: 2.9, arc: 40 },          // ฉับไว ไกลขึ้น แคบ
        { name: 'ฟันเฉียงย้อน', clip: 'atkDiagonal', time: 0.46, hitAt: 0.45, gap: 0.22, mult: 1.1, dir: -1 }                       // พักหายใจก่อนวนกลับท่า 1
      ] } },
      skills: ['light', 'heavy'] },
    sword: { name: 'Sword', model: grip('weapon/sword_1handed.gltf'),
      stats: { damage: 30, range: 3.6, arc: 150, speed: 1 },
      fx: { color: [1, 0.95, 0.75], life: 0.26, reach: 1.45, base: 0.3 },
      combos: { light: { loop: true, window: 0.7, steps: [
        { name: 'ฟันระดับ',   clip: 'atkHorizontal', time: 0.62, hitAt: 0.45, gap: 0.10, mult: 1,   dir: 1 },
        { name: 'จามลง',     clip: 'atkChop',       time: 0.90, hitAt: 0.62, gap: 0.20, mult: 1.6, range: 3.8, arc: 100, fx: { reach: 1.9, life: 0.3 } },
        { name: 'แทง',       clip: 'atkStab',       time: 0.58, hitAt: 0.38, gap: 0.08, mult: 1.3, range: 4.6, arc: 45 },
        { name: 'ฟันระดับย้อน', clip: 'atkHorizontal', time: 0.66, hitAt: 0.45, gap: 0.14, mult: 1.1, dir: -1 },
        { name: 'จามหนัก',    clip: 'atkChop',       time: 1.05, hitAt: 0.60, gap: 0.50, mult: 2.0, range: 3.9, arc: 170, fx: { reach: 2.1, life: 0.34 } }   // ท่าปิด แรงสุด พักนานแล้ววนใหม่
      ] } },
      skills: ['light', 'heavy'] }
  };

  // ---------- สกิล ----------
  const SKILLS = {
    light: { name: 'Light attack', combo: ['atkDiagonal'],      // ใช้เมื่ออาวุธไม่มี combos.light ของตัวเอง
      time: 0.5, hitAt: 0.45, dmgMult: 1, cost: 8 },
    heavy: { name: 'Heavy attack', combo: ['atkChop'], time: 1.0, hitAt: 0.55, dmgMult: 2.2, cost: 22, arcMult: 1.3 }
  };

  const DEF_KEYS = { light: ['KeyJ'], heavy: ['KeyK'] };
  const DEF_HOTBAR = ['dagger', 'sword'];
  let ctx = null, cfg = {}, weapons = null, skills = null, hotbar = [], wId = null;
  let cur = null, comboIdx = 0, comboT = 0, comboId = null, gapT = 0, lockT = 0, queue = null, queueT = 0;
  const nodes = {}, tips = {}, loading = {}, slotEls = [];

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp);
  const deepMerge = (a, b) => {                       // ทับค่าทีละชั้น (ไม่ลบค่าที่ไม่ได้ระบุ) — array ถูกแทนทั้งก้อน
    const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    for (const k in (b || {})) o[k] = isObj(o[k]) && isObj(b[k]) ? deepMerge(o[k], b[k]) : b[k];
    return o;
  };

  function init(c) {   // c = { getPlayer, mobs, load, Health, Stamina, getHeading, setHeading, cfg }
    ctx = c; cfg = c.cfg || {};
    weapons = deepMerge(WEAPONS, cfg.weapons); skills = deepMerge(SKILLS, cfg.skills);
    hotbar = (cfg.hotbar || DEF_HOTBAR).filter(id => weapons[id]);
    const keys = Object.assign({}, DEF_KEYS, cfg.keys || {});
    addEventListener('keydown', e => {
      if (e.repeat) return;
      const n = /^Digit([1-9])$/.exec(e.code);          // เลข 1-9 = เลือกช่อง Hotbar
      if (n && hotbar[+n[1] - 1]) { equip(hotbar[+n[1] - 1]); return; }
      for (const id in keys) if (keys[id].includes(e.code)) { e.preventDefault(); use(id); }
    });
    if (cfg.button !== false) {                         // ปุ่ม ATTACK บนจอ (มือถือ) — ซ้ายของ DASH
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;right:126px;bottom:48px;width:72px;height:72px;border-radius:50%;background:rgba(255,120,100,.3);border:3px solid rgba(255,255,255,.85);color:#fff;font:700 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 3px #000';
      b.textContent = 'ATTACK';
      b.addEventListener('pointerdown', e => { e.preventDefault(); use('light'); });
      document.body.appendChild(b);
    }
    buildHotbar();
    equip(cfg.weapon && weapons[cfg.weapon] ? cfg.weapon : hotbar[0] || 'dagger');   // อาวุธเริ่มต้น = ช่อง 1 (dagger)
  }

  function registerWeapon(id, def) { weapons = weapons || {}; weapons[id] = deepMerge(WEAPONS[id] || {}, def); }

  // ---------- Hotbar (ล่างจอ): สี่เหลี่ยมจัตุรัสดำล้วน ตัวอักษรขาว เลขช่องมุมขวาบน / ช่องที่ถืออยู่ขอบสีฟ้า ----------
  function buildHotbar() {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:8px;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none';
    hotbar.forEach((id, i) => {
      const s = document.createElement('div');
      s.style.cssText = 'position:relative;width:66px;height:66px;box-sizing:border-box;background:#000;border:3px solid #3a3a3a;border-radius:4px;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font:700 11px sans-serif;cursor:pointer';
      const num = document.createElement('div');
      num.textContent = i + 1; num.style.cssText = 'position:absolute;top:2px;right:5px;font:700 12px sans-serif;color:#fff';
      const name = document.createElement('div'); name.textContent = weapons[id].name || id;
      s.append(num, name);
      s.addEventListener('pointerdown', e => { e.preventDefault(); equip(id); });
      bar.appendChild(s); slotEls.push(s);
    });
    document.body.appendChild(bar);
  }
  function paintHotbar() {
    hotbar.forEach((id, i) => {
      const on = id === wId, s = slotEls[i]; if (!s) return;
      s.style.borderColor = on ? '#2d8cff' : '#3a3a3a';
      s.style.boxShadow = on ? '0 0 8px #2d8cff' : 'none';
    });
  }

  // ---------- ถืออาวุธ: ติดโมเดลที่มือ (โหลดครั้งเดียว สลับด้วยเปิด/ปิด) ----------
  async function equip(id) {
    const w = weapons[id], p = ctx && ctx.getPlayer();
    if (!w || !p || p.dead || cur) return false;         // กำลังฟัน/ตาย → สลับไม่ได้
    const prev = wId; if (prev === id && nodes[id]) return true;
    wId = id; comboT = 0; comboIdx = 0; gapT = 0; lockT = 0; queue = null; paintHotbar();   // สลับอาวุธ → เริ่มคอมโบใหม่
    if (prev && nodes[prev]) nodes[prev].setEnabled(false);
    if (typeof Events !== 'undefined') Events.emit('weapon:equipped', { id, weapon: w });
    if (nodes[id]) { nodes[id].setEnabled(true); return true; }
    const m = w.model; if (!m || !m.path || loading[id]) return true;   // ไม่มีโมเดล → ฟันได้ แค่ไม่เห็นในมือ
    loading[id] = true;
    try {
      const slot = p.getSlot && p.getSlot(m.slot);
      if (!slot) { console.warn('[combat] ไม่พบจุดจับ ' + m.slot + ' บนตัวละคร'); return false; }
      const cont = await ctx.load(m.path); if (!cont) return false;    // โหลดไม่ได้ → game.js แจ้งใน log เอง
      const inst = cont.instantiateModelsToScene(n => n, false, { doNotInstantiate: true });
      const root = inst.rootNodes[0];
      // root ของ glTF มีการหมุนแปลงแกนอยู่แล้ว → ห่อด้วย grip แล้วปรับ pos/rot/scale ที่ grip แทน
      const T = (typeof BABYLON !== 'undefined' && BABYLON.TransformNode) || root.constructor;
      const g = new T('grip_' + id, root.getScene());
      g.parent = slot; g.position.set(...m.pos); g.rotation.set(...m.rot); g.scaling.setAll(m.scale || 1);
      root.parent = g; root.getChildMeshes().forEach(x => { x.isPickable = false; });
      tips[id] = findTip(g, root);                                    // จุดปลายอาวุธ (ใช้ลากเอฟเฟกต์ฟันตามปลายดาบจริง)
      nodes[id] = g; g.setEnabled(wId === id);
      return true;
    } finally { loading[id] = false; }
  }

  // จุดปลายอาวุธ = มุมกล่องของโมเดลที่ไกลจากมือที่สุด (พิกัดเทียบกับ grip) — ไม่ต้องรู้ว่าดาบชี้แกนไหน
  function findTip(g, root) {
    if (typeof BABYLON === 'undefined') return null;
    const V = BABYLON.Vector3; let best = null, bd = -1;
    try {
      g.computeWorldMatrix(true);
      const inv = g.getWorldMatrix().clone().invert();
      root.getChildMeshes().forEach(m => {
        m.computeWorldMatrix(true);
        const wm = m.getWorldMatrix(), bb = m.getBoundingInfo().boundingBox;
        bb.vectors.forEach(v => { const q = V.TransformCoordinates(V.TransformCoordinates(v, wm), inv), d = q.length(); if (d > bd) { bd = d; best = q; } });
      });
    } catch (e) { console.warn('[combat] หาปลายอาวุธไม่ได้', e); }
    return best;
  }

  // ---------- เอฟเฟกต์เสี้ยวฟัน: แถบเรืองแสงลากตามปลายอาวุธ ปลายแถบเรียวลงจนเป็นรูปเสี้ยวพระจันทร์ ----------
  const FX_N = 20;                      // จำนวนจุดตัวอย่างสูงสุดของแถบ
  let fx = null;                        // { mesh, mat, pos, samples[], life, clock }
  function fxInit() {
    if (fx || typeof BABYLON === 'undefined') return fx;
    const B = BABYLON, p = ctx.getPlayer(); if (!p) return null;
    const scene = p.wrap.getScene(), mesh = new B.Mesh('slashFx', scene), vd = new B.VertexData();
    const pos = new Float32Array(FX_N * 2 * 3), idx = [];
    for (let i = 0; i < FX_N - 1; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    vd.positions = Array.from(pos); vd.indices = idx; vd.applyToMesh(mesh, true);
    const mat = new B.StandardMaterial('slashFxMat', scene);
    mat.disableLighting = true; mat.backFaceCulling = false; mat.diffuseColor = new B.Color3(0, 0, 0); mat.specularColor = new B.Color3(0, 0, 0);
    mat.alphaMode = B.Engine.ALPHA_ADD;                       // เรืองแสง
    mesh.material = mat; mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true; mesh.visibility = 0.9; mesh.setEnabled(false);
    return fx = { mesh, mat, pos, samples: [], life: 0.2, clock: 0, reach: 1.5, base: 0.3, on: false };
  }
  function fxStart(w, st) {
    if (!fxInit()) return;
    const o = Object.assign({}, w.fx || {}, st.fx || {});
    fx.life = o.life || 0.2; fx.reach = o.reach || 1.5; fx.base = o.base == null ? 0.3 : o.base;
    const c = o.color || [1, 1, 1]; fx.mat.emissiveColor = new BABYLON.Color3(c[0], c[1], c[2]);
  }
  function fxSample(p, w, st, prog) {                         // เก็บจุดปลาย/โคนของแถบ 1 จุด ณ ตอนนี้
    const V = BABYLON.Vector3, g = nodes[wId], tip = tips[wId]; let a, b;
    if (g && tip) {                                           // ตามปลายอาวุธจริง
      g.computeWorldMatrix(true); const m = g.getWorldMatrix();
      a = V.TransformCoordinates(tip.scale(fx.reach), m); b = V.TransformCoordinates(tip.scale(fx.base), m);
    } else {                                                  // ไม่มีโมเดล → เสี้ยวสมมติโค้งหน้าตัวละคร
      const arc = (st.arc || w.stats.arc) * Math.PI / 180 * 0.9, R = (st.range || w.stats.range), ang = ctx.getHeading() + (st.dir || 1) * (prog - 0.5) * arc, y = p.wrap.position.y + 1.1;
      a = new V(p.wrap.position.x + Math.sin(ang) * R, y, p.wrap.position.z + Math.cos(ang) * R);
      b = new V(p.wrap.position.x + Math.sin(ang) * R * 0.45, y, p.wrap.position.z + Math.cos(ang) * R * 0.45);
    }
    fx.samples.push({ a, b, t: fx.clock }); if (fx.samples.length > FX_N) fx.samples.shift();
  }
  function fxUpdate(dt) {
    if (!fx) return;
    fx.clock += dt;
    while (fx.samples.length && fx.clock - fx.samples[0].t > fx.life) fx.samples.shift();
    const n = fx.samples.length;
    if (n < 2) { if (fx.on) { fx.mesh.setEnabled(false); fx.on = false; } return; }
    const P = fx.pos;
    for (let i = 0; i < FX_N; i++) {
      const s = fx.samples[Math.max(0, Math.min(n - 1, i - (FX_N - n)))];        // เติมหน้าแถบด้วยจุดเก่าสุด (สามเหลี่ยมแบน มองไม่เห็น)
      const age = Math.min(1, (fx.clock - s.t) / fx.life), k = 1 - age;          // จุดเก่า → โคนแถบหดเข้าหาปลาย = ปลายเรียวเป็นเสี้ยว
      P[i * 6] = s.a.x; P[i * 6 + 1] = s.a.y; P[i * 6 + 2] = s.a.z;
      P[i * 6 + 3] = s.a.x + (s.b.x - s.a.x) * k; P[i * 6 + 4] = s.a.y + (s.b.y - s.a.y) * k; P[i * 6 + 5] = s.a.z + (s.b.z - s.a.z) * k;
    }
    fx.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, P);
    fx.mesh.visibility = 0.95 * Math.max(0.15, 1 - (fx.clock - fx.samples[n - 1].t) / fx.life);   // จางลงหลังฟันจบ
    if (!fx.on) { fx.mesh.setEnabled(true); fx.on = true; }
  }

  // ---------- ใช้สกิล ----------
  function stepOf(w, sk, id) {                                // ท่าที่จะตีรอบนี้ (ขึ้นกับคอมโบของอาวุธ)
    const cb = w.combos && w.combos[id];
    if (cb) {
      const n = cb.steps.length;
      const step = comboT > 0 && comboId === id ? (comboIdx + 1 < n ? comboIdx + 1 : 0) : 0;
      return { cb, step, st: cb.steps[step], n };
    }
    return { cb: { loop: false, window: 0, recovery: 0 }, step: 0, n: 1, st: { clip: sk.combo[0], time: sk.time, hitAt: sk.hitAt, gap: 0, mult: 1 } };
  }
  function use(id) {
    const p = ctx && ctx.getPlayer(); const sk = skills && skills[id], w = weapons && weapons[wId];
    if (!p || !sk || !w || p.dead || p.dashing || !w.skills.includes(id)) return false;
    if (lockT > 0) return false;                                       // คูลดาวน์หลังจบคอมโบ (ดาบยาว)
    if (cur) { queue = id; queueT = 0.3; return false; }               // กำลังฟัน → จองคิวไว้
    if (gapT > 0) { queue = id; queueT = gapT + 0.15; return false; }  // อยู่ในระยะคั่น → รอแล้วเริ่มเองเมื่อครบ
    if (ctx.Stamina && !ctx.Stamina.spend(sk.cost || 0)) return false;  // Stamina ไม่พอ (แถบกะพริบแดง)
    const { cb, step, st, n } = stepOf(w, sk, id);
    comboIdx = step; comboId = id;
    const spd = Math.max(0.1, w.stats.speed || 1);
    const time = (st.time || sk.time) / spd, hitAt = st.hitAt == null ? sk.hitAt : st.hitAt;
    if (cfg.autoAim !== false) {                                       // ช่วยเล็ง: หันหามอนที่ใกล้ที่สุด
      const t = nearest(p, w.stats.range * 1.8, w.stats.arc * 1.5);
      if (t) ctx.setHeading(Math.atan2(t.wrap.position.x - p.wrap.position.x, t.wrap.position.z - p.wrap.position.z));
    }
    if (p.anim) p.anim.act(st.clip, { duration: time });
    fxStart(w, st);
    cur = { id, sk, w, cb, st, last: n > 1 && step === n - 1, time, hitAt, t: 0, did: false, gap: (st.gap || 0) / spd,
      mult: (sk.dmgMult || 1) * (st.mult || 1) };
    comboT = 0; return true;
  }

  const fwd = () => { const h = ctx.getHeading(); return [Math.sin(h), Math.cos(h)]; };
  function inCone(p, m, range, arcDeg) {
    const dx = m.wrap.position.x - p.wrap.position.x, dz = m.wrap.position.z - p.wrap.position.z, d = Math.hypot(dx, dz);
    if (d > range + 0.8) return false;                                 // +0.8 ≈ รัศมีตัวมอน
    if (d < 0.01) return true;
    const [fx_, fz] = fwd();
    return (dx * fx_ + dz * fz) / d >= Math.cos(arcDeg * Math.PI / 360);
  }
  function nearest(p, range, arc) {
    let best = null, bd = 1e9;
    for (const m of ctx.mobs) {
      if (m.phase && m.phase !== 'alive') continue;
      const d = Math.hypot(m.wrap.position.x - p.wrap.position.x, m.wrap.position.z - p.wrap.position.z);
      if (d < bd && inCone(p, m, range, arc)) { bd = d; best = m; }
    }
    return best;
  }
  function strike() {
    const p = ctx.getPlayer(), { sk, w, st } = cur;
    const pw = (ctx.Health && ctx.Health.player && ctx.Health.player.stats && ctx.Health.player.stats.power) || 1;   // สถิติผู้เล่นเก็บที่ health.js
    const dmg = Math.max(1, Math.round(w.stats.damage * cur.mult * pw));
    const range = st.range || w.stats.range, arc = (st.arc || w.stats.arc) * (sk.arcMult || 1);   // แต่ละท่าทับระยะ/มุมได้
    for (const m of ctx.mobs) {
      if (m.phase && m.phase !== 'alive') continue;
      if (!inCone(p, m, range, arc)) continue;
      const dealt = ctx.Health ? ctx.Health.damage(m, dmg, { type: 'player', skill: cur.id, weapon: wId }) : 0;
      if (dealt > 0 && typeof Events !== 'undefined') Events.emit('combat:hit', { mob: m, amount: dealt, skill: cur.id, weapon: wId });
    }
  }

  function update(dt) {
    if (!ctx) return;
    const p = ctx.getPlayer();
    if (lockT > 0) lockT -= dt;
    if (!cur) { if (comboT > 0) comboT -= dt; if (gapT > 0) gapT -= dt; }
    else if (!p || p.dead || p.dashing) { cur = null; queue = null; comboT = 0; comboIdx = 0; gapT = 0; lockT = 0; }   // ตาย/Dash ตัดท่าฟัน
    else {
      cur.t += dt;
      const prog = cur.t / cur.time;
      if (fx && (cur.st.fx && cur.st.fx.from != null ? prog >= cur.st.fx.from : prog >= cur.hitAt - 0.3) && prog <= (cur.st.fx && cur.st.fx.to != null ? cur.st.fx.to : cur.hitAt + 0.25))
        fxSample(p, cur.w, cur.st, Math.max(0, Math.min(1, (prog - (cur.hitAt - 0.3)) / 0.55)));
      if (!cur.did && prog >= cur.hitAt) { cur.did = true; strike(); }
      if (cur.t >= cur.time) {
        const { cb, last, gap } = cur; cur = null;
        if (last && !cb.loop) { comboT = 0; comboIdx = 0; lockT = cb.recovery || 0; gapT = 0; }   // จบคอมโบ → คูลดาวน์ แล้วเริ่มท่า 1 ใหม่
        else { gapT = gap; comboT = gap + (cb.window || 0); }                                      // ระยะคั่นของท่านี้ + เวลาที่ยังต่อคอมโบได้
      }
    }
    fxUpdate(dt);
    if (queue) { queueT -= dt; if (queueT <= 0) queue = null; else if (!cur && gapT <= 0 && lockT <= 0) { const q = queue; queue = null; use(q); } }
  }

  return { init, use, update, equip, registerWeapon, animStates: ANIM_STATES,
    get weapon() { return weapons && weapons[wId]; }, get weaponId() { return wId; },
    get stats() { return weapons && weapons[wId] && weapons[wId].stats; },
    get weapons() { return weapons; }, get skills() { return skills; } };
})();
