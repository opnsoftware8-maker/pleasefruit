// ===== src/combat.js — อาวุธ (component) + สกิล + Hotbar + คอมโบ + เอฟเฟกต์เสี้ยวฟัน =====
// ต้องใส่ <script src="src/combat.js"></script> ต่อจาก health.js และก่อน game.js
// สกิลพิเศษ Z/X: ตรรกะทั้งหมดอยู่ท้ายไฟล์นี้ (หัวข้อ "สกิลพิเศษ") — ภาพอยู่ใน src/skill-effects.js, ปุ่มมือถืออยู่ใน src/skill-ui.js
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
    atkDualStab:   atk('Melee_Dualwield_Attack_Stab', /^Throw$/i),
    // ท่าสำรองของสกิลดาบเมื่อไม่มีท่าฟันดาบจริง — ชื่อคลิปยืนยันแล้วใน assets/characters/Rig_Medium_CombatRanged.glb (ต้องอยู่ใน CFG.anims)
    magicRaise:    { clip: [/^Ranged_Magic_Raise$/i], lockMove: true },
    magicShoot:    { clip: [/^Ranged_Magic_Shoot$/i], lockMove: true }
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
      skills: ['light', 'heavy'],
      special: { z: { type: 'sonicDash' }, x: { type: 'slashBarrage' } } },   // ช่องสกิลพิเศษ Z / X (ตัวเลขอยู่ใน SPECIAL_DEF ด้านล่าง + CFG.combat.weapons.dagger.special)
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
      skills: ['light', 'heavy'],
      special: { z: { type: 'piercingBeam' }, x: { type: 'crescentWave' } } }   // ดาบ: Z = ลำแสงทะลุ + ระเบิด / X = คลื่นเสี้ยวพระจันทร์ (ไม่สตัน)
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
  let sp = null, spKeyHandler = null, uiT = 0, disposed = false;   // sp = สกิล Z/X ที่กำลังใช้อยู่
  const spCd = {}, spCdMax = {};
  let sched = [];                                                   // งานตั้งเวลา (ดาเมจที่ลำแสง/คลื่นไปถึงทีละตัว) — ทำงานต่อแม้ท่าร่ายจบแล้ว                                    // คูลดาวน์แยกตามอาวุธ+ช่อง เช่น spCd['dagger:z']

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
    spKeyHandler = e => {                                // Z / X = สกิลพิเศษ (ตั้งปุ่มได้ที่ CFG.combat.specialKeys)
      if (e.repeat) return;
      const sk = Object.assign({}, SPECIAL_KEYS, cfg.specialKeys || {});
      for (const slot of SPECIAL_SLOTS) if ((sk[slot] || []).includes(e.code)) { e.preventDefault(); useSpecial(slot); }
    };
    addEventListener('keydown', spKeyHandler);
    try {
      const sc = ctx.getPlayer() && ctx.getPlayer().wrap.getScene();
      if (sc && typeof SkillFX !== 'undefined') SkillFX.init(sc, cfg.skillFx);
      if (sc) sc.onDisposeObservable.add(dispose);
      if (typeof SkillUI !== 'undefined' && cfg.skillButtons !== false) SkillUI.init({ press: useSpecial, query: specialInfo });
    } catch (err) { console.warn('[combat] skill fx/ui init', err); }
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
    if (!w || !p || p.dead || cur || sp) return false;   // กำลังฟัน/ใช้สกิล/ตาย → สลับไม่ได้
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
    if (!p || !sk || !w || p.dead || p.dashing || sp || !w.skills.includes(id)) return false;   // sp = กำลังใช้สกิล Z/X
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
    tickSpecials(dt, p);
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
    if (typeof SkillFX !== 'undefined') SkillFX.update(dt);
    if (typeof SkillUI !== 'undefined' && (uiT -= dt) <= 0) { uiT = 0.05; SkillUI.update(specialInfo('z'), specialInfo('x')); }
    if (queue) { queueT -= dt; if (queueT <= 0) queue = null; else if (!cur && gapT <= 0 && lockT <= 0) { const q = queue; queue = null; use(q); } }
  }


  // =====================================================================
  // ===== สกิลพิเศษ Z / X — อาวุธละ 2 ช่อง (CFG.combat.weapons.<id>.special.z / .x) =====
  // combat.js ตัดสินใจทุกอย่าง: คูลดาวน์ / Stamina / เป้าหมาย / ดาเมจ (ผ่าน Health.damage) / ขอสตัน
  // skill-effects.js เล่นภาพอย่างเดียว, game.js ทำการพุ่งแบบชนของ + สตันมอนจริง
  // type: 'sonicDash' (Z: พุ่งเป็นเส้น เจอศัตรูตัวแรกแล้วล็อก+สตัน+รัวฟัน) | 'slashBarrage' (X: รัวฟันรอบตัว 3 วิ + เสาพลังจากฟ้า)
  // =====================================================================
  const SPECIAL_SLOTS = ['z', 'x'];
  const SPECIAL_KEYS = { z: ['KeyZ'], x: ['KeyX'] };
  const SPECIAL_DEF = {
    sonicDash: { name: 'Sonic Dash', cooldown: 6, cost: 40,
      dash: { distance: 12, duration: 0.26, iframe: 0.26 },        // ระยะ/เวลาพุ่ง (ใช้ท่า Dodge Forward เดิม + ระบบชนของ game.js)
      hitRadius: 1.5, aimRange: 14, aimArc: 80, boomSpacing: 1.5,  // hitRadius = รัศมีโดนศัตรูระหว่างทาง / aim* = ช่วยเล็งก่อนพุ่ง / boomSpacing = ระยะห่างวงแหวนเสียงแตก
      barrage: { duration: 0.75, tickInterval: 0.125, tickMult: 0.8, stun: 0.75,   // ล็อก+สตัน 0.75 วิ เป๊ะ, ดาเมจ = stats.damage × tickMult ต่อทิก
        animCycle: 0.19, anim: ['atkHorizontal', 'atkDiagonal', 'atkStab'], fxRate: 110 } },
    slashBarrage: { name: 'Slash Barrage', cooldown: 14, cost: 120,
      range: 8, maxTargets: 6, duration: 3, hitInterval: 0.25, tickMult: 0.5,   // เป้าหมายในรัศมี range (สูงสุด maxTargets) ได้ดาเมจทุก hitInterval
      stun: 3.6,                                                                // สตันตั้งแต่เริ่มสกิล (ต้อง ≥ duration + finisherDelay จึงล็อกครบ)
      finalMult: 6, finalRadius: 5,                                             // ฟินิชเชอร์ 1 ทีดาเมจ = stats.damage × finalMult ทุกตัวในรัศมี finalRadius
      finisherDelay: 0.4, impactDelay: 0.12, finisherTail: 0.6,                 // หลังจบรัว → รอ finisherDelay วิ แล้วเสาพลังตกใส่ (ภาพตกใช้ impactDelay วิ)
      animCycle: 0.38, anim: ['atkChop', 'atkHorizontal', 'atkDiagonal', 'atkChop'],   // ท่าที่มีอยู่แล้ว (จามลง/ฟันระดับ/ฟันเฉียง) วนระหว่างรัว
      animFinish: ['atkJumpChop', 'atkChop'], animFinishTime: 0.75, fxRate: 80 }
  };
  const CAST_DEF = {   // ท่าร่ายของสกิลดาบ: ใช้ท่าฟันดาบจริงถ้าคลิปชื่อตรงมีอยู่ ไม่งั้นใช้ Ranged_Magic_Raise → Ranged_Magic_Shoot
    melee: { time: 0.55, release: 0.3 },                              // release = วินาทีที่ปล่อยสกิล (จังหวะดาบฟาดจริง)
    magic: { raiseTime: 0.4, shootTime: 0.5, releaseAt: 0.6 }          // ปล่อยตอนท่า Shoot เล่นไปราว 40%
  };
  SPECIAL_DEF.piercingBeam = deepMerge(CAST_DEF, { name: 'Piercing Beam', cooldown: 8, cost: 60,
    length: 26, width: 1.5, beamSpeed: 120, beamMult: 3, explosion: { radius: 5.5, mult: 4, delay: 0.06 },
    melee: { anim: ['atkStab', 'atkChop'], time: 0.55, release: 0.3 } });
  SPECIAL_DEF.crescentWave = deepMerge(CAST_DEF, { name: 'Crescent Wave', cooldown: 12, cost: 100,
    range: 40, speed: 30, startRadius: 1.2, arcDeg: 180, mult: 5, height: 6.5, knock: { dist: 2.2, dur: 0.28 },
    melee: { anim: ['atkHorizontal', 'atkDiagonal'], time: 0.62, release: 0.34 } });
  const specialDef = (w, slot) => {
    const o = w && w.special && w.special[slot];
    return o && o.enabled !== false && SPECIAL_DEF[o.type] ? deepMerge(SPECIAL_DEF[o.type], o) : null;
  };
  const SPECIAL_TYPES = { sonicDash: startSonicDash, slashBarrage: startBarrage, piercingBeam: startBeam, crescentWave: startCrescent };

  const hasFX = () => typeof SkillFX !== 'undefined' && SkillFX;
  const alive = m => !!(m && m.wrap && (!m.phase || m.phase === 'alive') && !(m.hp <= 0) && !m.wrap.isDisposed());
  const planar = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const dmgOf = (w, mult) => {
    const pw = (ctx.Health && ctx.Health.player && ctx.Health.player.stats && ctx.Health.player.stats.power) || 1;
    return Math.max(1, Math.round(w.stats.damage * mult * pw));
  };
  const later = (delay, fn) => sched.push({ t: Math.max(0, delay), fn });
  function hurt(m, amount, tag, wid) {                       // ดาเมจจริงผ่าน Health.damage เส้นเดียวกับฟันปกติ
    if (!alive(m) || !ctx.Health) return 0;
    const dealt = ctx.Health.damage(m, amount, { type: 'player', skill: tag, weapon: wid || wId });
    if (dealt > 0 && typeof Events !== 'undefined') Events.emit('combat:hit', { mob: m, amount: dealt, skill: tag, weapon: wid || wId });
    return dealt;
  }
  function mobAt(m) {                                   // ตำแหน่ง/ความสูงตัวมอน (ไว้วางเอฟเฟกต์ที่กลางลำตัว)
    const w = m.wrap.position;
    if (m.fxH === undefined) {
      try { m.wrap.computeWorldMatrix(true); const bb = m.wrap.getHierarchyBoundingVectors(true); m.fxH = Math.min(6, Math.max(0.8, bb.max.y - bb.min.y)); }
      catch (e) { m.fxH = 1.5; }
    }
    return { x: w.x, y: w.y + m.fxH * 0.55, z: w.z, gy: w.y };
  }
  const faceTo = (p, x, z) => ctx.setHeading(Math.atan2(x - p.wrap.position.x, z - p.wrap.position.z));
  function playClip(p, list, dur) {                     // เล่นท่าที่มีอยู่จริงตัวแรกในลิสต์ (ชื่อ state จาก ANIM_STATES ไม่ได้แต่งใหม่)
    const a = p && p.anim; if (!a) return;
    const c = list.find(n => a.has(n)); if (c) a.act(c, { duration: dur });
  }
  const cancelNormal = () => { cur = null; queue = null; gapT = 0; comboT = 0; comboIdx = 0; lockT = 0; };   // สกิลพิเศษตัดท่าฟันปกติทันที

  function specialInfo(slot) {                          // ให้ปุ่มบนจอ (skill-ui.js) อ่านสถานะ
    const w = weapons && weapons[wId], d = specialDef(w, slot), key = slot.toUpperCase();
    if (!d) return { key, empty: true };
    const k = wId + ':' + slot, st = ctx && ctx.Stamina && ctx.Stamina.state;
    return { key, empty: false, name: d.name, cd: spCd[k] || 0, cdMax: spCdMax[k] || d.cooldown || 1, cost: d.cost || 0,
      enough: !st || st.value >= (d.cost || 0), active: !!(sp && sp.slot === slot), busy: !!sp };
  }

  function useSpecial(slot) {
    const p = ctx && ctx.getPlayer(), w = weapons && weapons[wId];
    if (!p || !w || p.dead || sp || p.dashing || disposed) return false;
    const d = specialDef(w, slot); if (!d || !SPECIAL_TYPES[d.type]) return false;
    const key = wId + ':' + slot; if ((spCd[key] || 0) > 0) return false;        // คูลดาวน์
    if (ctx.Stamina && !ctx.Stamina.spend(d.cost || 0)) return false;           // Stamina ไม่พอ (แถบกะพริบแดง) — หักครั้งเดียวที่นี่ที่เดียว
    cancelNormal();
    let ok = false;
    try { ok = SPECIAL_TYPES[d.type](p, w, d, slot); } catch (e) { console.error('[combat] special', e); abortSpecial(); }
    if (!ok) { if (ctx.Stamina) ctx.Stamina.add(d.cost || 0); return false; }    // เริ่มไม่ได้ → คืน Stamina
    spCd[key] = spCdMax[key] = d.cooldown || 0;
    if (typeof Events !== 'undefined') Events.emit('skill:used', { slot, type: d.type, weapon: wId });
    return true;
  }

  function finishSpecial(s) {
    if (sp !== s) return;
    sp = null;
    if (typeof Events !== 'undefined') Events.emit('skill:ended', { slot: s.slot, type: s.d.type, weapon: s.wid });
  }
  function abortSpecial() {                             // ตาย/ถูกตัด/ปิดฉาก → ปล่อยสตันทุกตัว ล้างเอฟเฟกต์
    const s = sp; if (!s) return; sp = null;
    if (s.phase === 'dash' && ctx.cancelDash) ctx.cancelDash();
    const list = s.targets || (s.hit ? [s.hit] : []);
    list.forEach(m => { try { ctx.unstun && ctx.unstun(m); } catch (e) {} });
    if (s.fxh) s.fxh.cancel();
    if (hasFX()) SkillFX.cancelAll();
  }
  function dispose() {                                  // ฉาก/เกมถูกปิด → ล้างทุกอย่างให้เรียบร้อย
    if (disposed) return; disposed = true;
    abortSpecial(); sched = [];
    if (spKeyHandler) removeEventListener('keydown', spKeyHandler);
    if (hasFX()) SkillFX.dispose();
    if (typeof SkillUI !== 'undefined') SkillUI.dispose();
  }

  function tickSpecials(dt, p) {
    for (const k in spCd) if (spCd[k] > 0) spCd[k] = Math.max(0, spCd[k] - dt);
    if (sched.length) {
      sched.forEach(e => { e.t -= dt; });
      const due = sched.filter(e => e.t <= 0); sched = sched.filter(e => e.t > 0);
      if (!disposed) due.forEach(e => { try { e.fn(); } catch (err) { console.error('[combat] scheduled', err); } });
    }
    if (!sp) return;
    if (!p || p.dead || disposed) { abortSpecial(); return; }
    const s = sp;
    try { s.type === 'z' ? updateSonic(s, dt, p) : s.type === 'x' ? updateBarrage(s, dt, p) : updateCast(s, dt, p); }
    catch (e) { console.error('[combat] special update', e); abortSpecial(); }
  }

  // ---------- Z: Forward Sonic Dash ----------
  function segCircle(x0, z0, x1, z1, cx, cz, r) {       // จุดแรก (0–1) ที่เส้นทางก้าวนี้ตัดวงกลมศัตรู — 0 = เริ่มอยู่ในวงแล้ว, null = ไม่โดน
    const dx = x1 - x0, dz = z1 - z0, fx_ = x0 - cx, fz_ = z0 - cz, c = fx_ * fx_ + fz_ * fz_ - r * r;
    if (c <= 0) return 0;
    const a = dx * dx + dz * dz; if (a < 1e-9) return null;
    const b = 2 * (fx_ * dx + fz_ * dz), disc = b * b - 4 * a * c; if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  function startSonicDash(p, w, d) {
    if (cfg.autoAim !== false) {                        // ช่วยเล็ง: หันหามอนใกล้สุดข้างหน้าก่อนพุ่ง
      const t = nearest(p, d.aimRange, d.aimArc);
      if (t) faceTo(p, t.wrap.position.x, t.wrap.position.z);
    }
    const h = ctx.getHeading(), s = { slot: 'z', type: 'z', d, w, wid: wId, phase: 'dash', t: 0, hit: null, dx: Math.sin(h), dz: Math.cos(h), travel: 0, nextBoom: 0, ticks: 0 };
    sp = s;
    const ok = ctx.skillDash({ distance: d.dash.distance, duration: d.dash.duration, iframe: d.dash.iframe,
      onStep: (x0, z0, x1, z1) => sonicStep(s, p, x0, z0, x1, z1), onEnd: () => sonicDashEnd(s, p) });
    if (!ok) { sp = null; return false; }
    return true;
  }
  function sonicStep(s, p, x0, z0, x1, z1) {
    if (sp !== s || s.hit) return;
    const d = s.d, y = p.wrap.position.y;
    s.travel += Math.hypot(x1 - x0, z1 - z0);
    if (hasFX()) while (s.travel >= s.nextBoom) { SkillFX.dashBoom(x1, y, z1, s.dx, s.dz, s.nextBoom === 0 ? 1.25 : 1); s.nextBoom += d.boomSpacing; }
    let best = null, bt = 2;                            // เช็กตลอดเส้นทางของก้าวนี้ (ไม่ใช่แค่จุดสุดท้าย) เอาศัตรูที่ถึงก่อน
    for (const m of ctx.mobs) {
      if (!alive(m)) continue;
      const t = segCircle(x0, z0, x1, z1, m.wrap.position.x, m.wrap.position.z, d.hitRadius);
      if (t !== null && t < bt) { bt = t; best = m; }
    }
    if (best) { s.hit = best; if (ctx.cancelDash) ctx.cancelDash(); }   // หยุดพุ่งที่ศัตรู → game.js เรียก onEnd ต่อ
  }
  function sonicDashEnd(s, p) {
    if (sp !== s || s.phase !== 'dash') return;
    const m = s.hit;
    if (!m || !alive(m)) { finishSpecial(s); return; }  // ไม่โดนใคร → จบการพุ่งปกติ
    const b = s.d.barrage, q = mobAt(m);
    s.phase = 'lock'; s.t = 0; s.ticks = 0; s.maxTicks = Math.floor(b.duration / b.tickInterval + 1e-6); s.animT = 0; s.animI = 0; s.targets = [m];
    faceTo(p, q.x, q.z);
    ctx.stun && ctx.stun(m, b.stun);                    // ล็อก+สตัน 0.75 วิ (game.js หยุดมอนจริง)
    if (hasFX()) {
      s.fxh = SkillFX.barrage({ x: q.x, y: q.y, z: q.z, duration: b.duration, rate: b.fxRate, radius: 0.9, lenMin: 3.5, lenMax: 8, flare: 1.0 });
      SkillFX.lockRing(q.x, q.gy + 0.08, q.z, b.duration, 3.2);
      SkillFX.hitSpark(q.x, q.y, q.z, 10);
    }
  }
  function updateSonic(s, dt, p) {
    s.t += dt;
    if (s.phase === 'dash') { if (s.t > s.d.dash.duration + 0.6) abortSpecial(); return; }   // กันค้าง: พุ่งไม่จบตามเวลา
    const b = s.d.barrage, m = s.hit;
    if (!alive(m)) { endLock(s); return; }              // เป้าตายระหว่างรัว
    if ((s.animT -= dt) <= 0) { s.animT = b.animCycle; playClip(p, [b.anim[s.animI++ % b.anim.length]], b.animCycle); }
    const due = Math.min(Math.floor(s.t / b.tickInterval + 1e-6), s.maxTicks);
    while (s.ticks < due && alive(m)) {
      s.ticks++; hurt(m, dmgOf(s.w, b.tickMult), 'special:z');
      if (hasFX()) { const q = mobAt(m); SkillFX.hitSpark(q.x, q.y, q.z, 3); }
    }
    if (!alive(m) || s.t >= b.duration - 1e-6) endLock(s);
  }
  function endLock(s) {
    if (sp !== s) return;
    ctx.unstun && s.hit && ctx.unstun(s.hit);           // ครบ 0.75 วิ → ปล่อยสตัน แล้วศัตรูเดินต่อ
    if (s.fxh) s.fxh.stop();                            // เอฟเฟกต์ค่อยๆ จางออก
    finishSpecial(s);
  }

  // ---------- X: Three-Second Slash Barrage ----------
  function startBarrage(p, w, d) {
    const pos = p.wrap.position;
    const targets = ctx.mobs.filter(m => alive(m) && m.wrap.isEnabled() && planar(m.wrap.position, pos) <= d.range + 0.8)
      .sort((a, b) => planar(a.wrap.position, pos) - planar(b.wrap.position, pos)).slice(0, d.maxTargets);
    const pr = targets[0];
    let c;
    if (pr) { const q = mobAt(pr); c = { x: q.x, y: q.y, z: q.z, gy: q.gy }; }
    else { const [fx_, fz_] = fwd(), R = Math.min(4, d.range * 0.5), x = pos.x + fx_ * R, z = pos.z + fz_ * R, gy = ctx.heightAt ? ctx.heightAt(x, z) : pos.y; c = { x, y: gy + 1.1, z, gy }; }   // ไม่มีเป้า → ฟาดลงพื้นตรงหน้า (ไม่มีดาเมจ)
    faceTo(p, c.x, c.z);
    targets.forEach(m => ctx.stun && ctx.stun(m, d.stun));
    const s = { slot: 'x', type: 'x', d, w, wid: wId, phase: 'barrage', t: 0, ticks: 0, maxTicks: Math.floor(d.duration / d.hitInterval + 1e-6), targets, c, animT: 0, animI: 0, ft: 0, fxSent: false, dealt: false };
    sp = s;
    if (hasFX()) {
      s.fxh = SkillFX.barrage({ x: c.x, y: c.y, z: c.z, duration: d.duration, rate: d.fxRate, radius: 1.3, lenMin: 5, lenMax: 11, flare: 1.5 });
      targets.forEach(m => { const q = mobAt(m); SkillFX.lockRing(q.x, q.gy + 0.08, q.z, d.duration + d.finisherDelay, 3.4); });
    }
    return true;
  }
  function updateBarrage(s, dt, p) {
    const d = s.d; s.t += dt;
    if (s.phase === 'barrage') {
      if ((s.animT -= dt) <= 0) { s.animT = d.animCycle; faceTo(p, s.c.x, s.c.z); playClip(p, [d.anim[s.animI++ % d.anim.length]], d.animCycle); }
      const due = Math.min(Math.floor(s.t / d.hitInterval + 1e-6), s.maxTicks);
      while (s.ticks < due) {
        s.ticks++;
        for (const m of s.targets) {
          if (!alive(m)) continue;
          hurt(m, dmgOf(s.w, d.tickMult), 'special:x');
          if (hasFX()) { const q = mobAt(m); SkillFX.hitSpark(q.x, q.y, q.z, 2); }
        }
      }
      if (s.t >= d.duration - 1e-6) { s.phase = 'finisher'; s.ft = 0; if (s.fxh) s.fxh.stop(); playClip(p, d.animFinish, d.animFinishTime); }
      return;
    }
    s.ft += dt;                                          // ฟินิชเชอร์: เสาพลังตกจากฟ้า → ดาเมจครั้งเดียว
    if (!s.fxSent && s.ft >= Math.max(0, d.finisherDelay - d.impactDelay)) {
      s.fxSent = true;
      if (hasFX()) SkillFX.finisher({ x: s.c.x, y: s.c.gy, z: s.c.z }, { impactDelay: d.impactDelay, radius: 1 });
    }
    if (!s.dealt && s.ft >= d.finisherDelay) {
      s.dealt = true;
      const hitSet = new Set(s.targets.filter(alive));
      for (const m of ctx.mobs) if (alive(m) && planar(m.wrap.position, s.c) <= d.finalRadius) hitSet.add(m);
      hitSet.forEach(m => hurt(m, dmgOf(s.w, d.finalMult), 'special:x:final'));
    }
    if (s.ft >= d.finisherDelay + d.finisherTail) finishSpecial(s);
  }


  // ---------- สกิลดาบ (ไม่สตัน): ท่าร่าย → ปล่อยสกิลตามจังหวะท่า ----------
  // เลือกท่าตอนใช้จริง: (1) ท่าฟันดาบที่คลิปชื่อตรง (anim.exact) → (2) Ranged_Magic_Raise → Ranged_Magic_Shoot → (3) ท่าสำรองเดิมของ atk* → (4) ไม่มีท่า (ยังปล่อยสกิลตามเวลา)
  const castLogged = {};
  function pickCast(p, d) {
    const a = p.anim, m = d.melee, g = d.magic;
    if (a) {
      const exact = m.anim.find(n => a.exact ? a.exact(n) : false);
      if (exact) return { mode: 'melee', segs: [{ clip: exact, at: 0, time: m.time }], releaseAt: m.release, end: m.time + 0.15 };
      if (a.has('magicRaise') && a.has('magicShoot'))
        return { mode: 'magic', segs: [{ clip: 'magicRaise', at: 0, time: g.raiseTime }, { clip: 'magicShoot', at: g.raiseTime, time: g.shootTime }], releaseAt: g.releaseAt, end: g.raiseTime + g.shootTime + 0.1 };
      const weak = m.anim.find(n => a.has(n));
      if (weak) return { mode: 'fallback-atk', segs: [{ clip: weak, at: 0, time: m.time }], releaseAt: m.release, end: m.time + 0.15 };
    }
    return { mode: 'none', segs: [], releaseAt: m.release, end: m.time };
  }
  function startCast(p, w, d, slot, release) {
    const c = pickCast(p, d);
    if (!castLogged[d.type + c.mode]) { castLogged[d.type + c.mode] = 1; console.info('[skill] ' + d.name + ': animation mode = ' + c.mode + (c.segs.length ? ' (' + c.segs.map(x => x.clip).join(' → ') + ')' : '')); }
    if (cfg.autoAim !== false) {                       // ช่วยเล็ง: หันหามอนใกล้สุดด้านหน้า
      const t = nearest(p, 14, 120);
      if (t) faceTo(p, t.wrap.position.x, t.wrap.position.z);
    }
    sp = { slot, type: 'cast', d, w, wid: wId, phase: 'cast', t: 0, segs: c.segs, segI: 0, releaseAt: c.releaseAt, end: c.end, released: false, release, mode: c.mode };
    return true;
  }
  function updateCast(s, dt, p) {
    s.t += dt;
    while (s.segI < s.segs.length && s.t >= s.segs[s.segI].at) { const g = s.segs[s.segI++]; if (p.anim) p.anim.act(g.clip, { duration: g.time }); }
    if (!s.released && s.t >= s.releaseAt) { s.released = true; s.release(s, p); }
    if (s.t >= Math.max(s.end, s.releaseAt + 0.05)) finishSpecial(s);   // ท่าร่ายจบ → ปล่อยให้เดินได้; ดาเมจที่ตั้งเวลาไว้ยังทำงานต่อ
  }
  const forward2 = () => { const h = ctx.getHeading(); return { x: Math.sin(h), z: Math.cos(h), h }; };

  // Z: Piercing Beam — ลำแสงตรงไปข้างหน้า ทะลุทุกตัวในแนว ดาเมจครั้งเดียวต่อตัว แล้วระเบิดที่ปลายลำ
  function startBeam(p, w, d, slot) { return startCast(p, w, d, slot, fireBeam); }
  function fireBeam(s, p) {
    const d = s.d, w = s.w, wid = s.wid, pos = p.wrap.position, f = forward2(), L = d.length;
    const ox = pos.x + f.x * 0.8, oz = pos.z + f.z * 0.8, oy = pos.y + 1.3;
    const ex = pos.x + f.x * L, ez = pos.z + f.z * L, gy = ctx.heightAt ? ctx.heightAt(ex, ez) : pos.y;
    if (hasFX()) SkillFX.beam({ x: ox, y: oy, z: oz, yaw: f.h, length: L, speed: d.beamSpeed, width: d.width });
    for (const m of ctx.mobs) {
      if (!alive(m)) continue;
      const rx = m.wrap.position.x - pos.x, rz = m.wrap.position.z - pos.z, along = rx * f.x + rz * f.z, perp = Math.abs(rx * f.z - rz * f.x);
      if (along < -0.3 || along > L + 0.8 || perp > d.width + 0.7) continue;      // นอกแนวลำแสง
      later(Math.max(0, along) / d.beamSpeed, () => {
        hurt(m, dmgOf(w, d.beamMult), 'special:z', wid);
        if (hasFX() && alive(m)) { const q = mobAt(m); SkillFX.hitSpark(q.x, q.y, q.z, 6); }
      });
    }
    later(L / d.beamSpeed + d.explosion.delay, () => {                              // ระเบิดที่ปลายลำแสง (ดาเมจวงกลม ไม่สตัน ไม่ผลัก)
      if (hasFX()) SkillFX.explosion(ex, gy, ez, d.explosion.radius);
      for (const m of ctx.mobs) if (alive(m) && planar(m.wrap.position, { x: ex, z: ez }) <= d.explosion.radius + 0.6) hurt(m, dmgOf(w, d.explosion.mult), 'special:z:explosion', wid);
    });
  }

  // X: Crescent Wave — คลื่นเสี้ยวพระจันทร์กวาดครอบ 180° ด้านหน้า พุ่งไกลมาก ดาเมจสูง + ผลักเล็กน้อย (ไม่สตัน)
  function startCrescent(p, w, d, slot) { return startCast(p, w, d, slot, fireCrescent); }
  function fireCrescent(s, p) {
    const d = s.d, w = s.w, wid = s.wid, pos = p.wrap.position, f = forward2();
    if (hasFX()) SkillFX.crescent({ x: pos.x, y: pos.y, z: pos.z, yaw: f.h, range: d.range, speed: d.speed, startRadius: d.startRadius, height: d.height });
    const cosHalf = Math.cos(d.arcDeg * Math.PI / 360);
    for (const m of ctx.mobs) {
      if (!alive(m)) continue;
      const rx = m.wrap.position.x - pos.x, rz = m.wrap.position.z - pos.z, dist = Math.hypot(rx, rz);
      if (dist > d.range + 0.8) continue;
      if (dist > 0.01 && (rx * f.x + rz * f.z) / dist < cosHalf - 1e-6) continue;   // นอกมุม 180° ด้านหน้า
      later(Math.max(0, dist - 0.8 - d.startRadius) / d.speed, () => {              // โดนตอนหน้าคลื่นไปถึงตัวมอน
        if (!alive(m)) return;
        const dx = m.wrap.position.x - pos.x, dz = m.wrap.position.z - pos.z;
        if (hurt(m, dmgOf(w, d.mult), 'special:x', wid) > 0 && alive(m)) {
          ctx.knock && ctx.knock(m, dx, dz, d.knock.dist, d.knock.dur);              // ผลักเล็กน้อยออกจากผู้ใช้ — AI/แอนิเมชันของมอนเล่นต่อตามปกติ
          if (hasFX()) { const q = mobAt(m); SkillFX.hitSpark(q.x, q.y, q.z, 8); }
        }
      });
    }
  }

  return { init, use, update, equip, registerWeapon, animStates: ANIM_STATES,
    useSpecial, specialInfo, dispose, get specialActive() { return !!sp; },   // specialActive: game.js ใช้ล็อกการเดิน/Dash ระหว่างสกิล
    get weapon() { return weapons && weapons[wId]; }, get weaponId() { return wId; },
    get stats() { return weapons && weapons[wId] && weapons[wId].stats; },
    get weapons() { return weapons; }, get skills() { return skills; } };
})();
