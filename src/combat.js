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
    magicShoot:    { clip: [/^Ranged_Magic_Shoot$/i], lockMove: true },
    crouch:        { clip: [/^Crouching$/i], loop: true }   // ท่าย่อ — ชื่อคลิปยืนยันแล้วใน Rig_Medium_MovementAdvanced.glb (สกิล X ของขวานคู่)
  };

  // ---------- อาวุธ (component) ----------
  const grip = (path, slot) => ({ path, slot: slot || 'handslot.r', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 });   // slot: จุดจับบนตัวละคร (ซ้าย = 'handslot.l')
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
      special: { z: { type: 'piercingBeam' }, x: { type: 'crescentWave' } } },   // ดาบ: Z = ลำแสงทะลุ + ระเบิด / X = คลื่นเสี้ยวพระจันทร์ (ไม่สตัน)
    // ขวานคู่ (หนัก ช้า กว้าง): ถือ 2 เล่ม (models[0] = มือขวา, models[1] = มือซ้าย) — ปรับ pos/rot/scale/slot ที่ CFG.combat.weapons.dualAxe.models
    dualAxe: { name: 'Dual Axe',
      models: [grip('weapon/axe_1handed.gltf', 'handslot.r'), grip('weapon/axe_1handed.gltf', 'handslot.l')],
      stats: { damage: 42, range: 4, arc: 150, speed: 1 },
      fx: { color: [0.9, 0.95, 1], life: 0.32, reach: 1.6, base: 0.3 },
      combos: { light: { loop: true, window: 0.8, steps: [
        // clips = ลิสต์ท่าที่ลอง: เลือกตัวที่ชื่อคลิปตรงจริง (anim.exact) ก่อน แล้วค่อยท่าสำรอง — ไม่อ้างคลิปที่ไม่มี
        { name: 'ขวากวาดขวา', clip: 'atkHorizontal', clips: ['atkHorizontal', 'atkDiagonal', 'atkDualSlice'],
          time: 0.78, hitAt: 0.46, gap: 0.14, mult: 1.0, dir: 1, hand: 'r', range: 4, arc: 150, impact: 3, fx: { reach: 1.9, life: 0.32 } },
        // ท่า 2: เล่นคลิปท่าเฉียงแบบ "กลับด้านซ้าย-ขวา" (mirror) ให้แขนอีกข้างฟาดสวนทิศ — คลิปที่มีเป็นท่ามือขวา จึงสะท้อนทั้งตัวตอนท่านี้
        { name: 'ซ้ายสวน', clip: 'atkDiagonal', clips: ['atkDiagonal', 'atkHorizontal', 'atkDualSlice'], mirror: true,
          time: 0.8, hitAt: 0.46, gap: 0.16, mult: 1.25, dir: -1, hand: 'l', range: 4, arc: 160, impact: 3, fx: { reach: 1.9, life: 0.32 } },
        // ท่า 3: ยกขวาน 2 เล่มฟาดลงพร้อมกัน — ช้า/แรงสุด กระแทกพื้นเป็นวงกว้าง แล้วพักก่อนวนใหม่
        { name: 'ฟาดสองมือ', clip: 'atkChop', clips: ['atk2hChop', 'atkDualChop', 'atkJumpChop', 'atkChop'],
          time: 1.2, hitAt: 0.58, gap: 0.7, mult: 2.3, dir: 1, hand: 'both', range: 4.6, arc: 200, impact: 6, slam: true, fx: { reach: 2.2, life: 0.4 } }
      ] } },
      skills: ['light', 'heavy'],
      special: { z: { type: 'stormCyclone' }, x: { type: 'radialBurst' } } }   // Z = พายุหมุนยักษ์ / X = ย่อตัวแล้วระเบิดเส้นฟันรอบทิศ
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
  const extra = {};                                                // extra[id] = [{ g, tip }] — ขวานคู่: ชิ้นที่ 2 ขึ้นไป (มืออีกข้าง)
  const pose = { mirror: false, squash: 0, target: 0, dirty: false };   // ท่วงท่า procedural บนตัวผู้เล่น: กลับซ้าย-ขวา (ท่า 2) / ย่อตัว (สกิล X)
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
  // อาวุธมี model เดียว (ดาบสั้น/ดาบยาว) หรือ models[] หลายชิ้น (ขวานคู่: มือขวา + มือซ้าย) — ทุกชิ้นเปิด/ปิดพร้อมกัน
  const modelsOf = w => (w.models && w.models.length ? w.models : (w.model ? [w.model] : [])).filter(m => m && m.path);
  const setWeaponOn = (id, on) => { if (nodes[id]) nodes[id].setEnabled(on); (extra[id] || []).forEach(e => e.g.setEnabled(on)); };
  function slotFor(p, m) {                                    // ชื่อจุดจับตามที่ตั้งใน config → ไม่เจอก็ลองหาจากชื่อที่ใกล้เคียง (ซ้าย/ขวา)
    let s = p.getSlot && p.getSlot(m.slot);
    if (!s && p.findSlot) {
      const left = /(?:^|[._\-\s])(l|left)$/i.test(m.slot || '');
      s = p.findSlot(left ? /^hand.?slot.*(?:[._\-]l|left)$/i : /^hand.?slot.*(?:[._\-]r|right)$/i);
    }
    return s || null;
  }
  async function equip(id) {
    const w = weapons[id], p = ctx && ctx.getPlayer();
    if (!w || !p || p.dead || cur || sp) return false;   // กำลังฟัน/ใช้สกิล/ตาย → สลับไม่ได้
    const prev = wId; if (prev === id && nodes[id]) return true;
    wId = id; comboT = 0; comboIdx = 0; gapT = 0; lockT = 0; queue = null; paintHotbar();   // สลับอาวุธ → เริ่มคอมโบใหม่
    if (prev && prev !== id) setWeaponOn(prev, false);
    if (typeof Events !== 'undefined') Events.emit('weapon:equipped', { id, weapon: w });
    if (nodes[id]) { setWeaponOn(id, true); return true; }
    const list = modelsOf(w); if (!list.length || loading[id]) return true;   // ไม่มีโมเดล → ฟันได้ แค่ไม่เห็นในมือ
    loading[id] = true;
    try {
      const parts = [];
      for (let i = 0; i < list.length; i++) {
        const m = list[i], slot = slotFor(p, m);
        if (!slot) { console.warn('[combat] ไม่พบจุดจับ ' + m.slot + ' บนตัวละคร (โมเดลชิ้นที่ ' + (i + 1) + ' ของ ' + id + ')'); continue; }
        const cont = await ctx.load(m.path); if (!cont) continue;     // โหลดไม่ได้ → game.js แจ้งใน log เอง
        const inst = cont.instantiateModelsToScene(n => n, false, { doNotInstantiate: true });   // ทุกชิ้นเป็นสำเนาแยก (ขวานซ้าย/ขวาไม่ใช้ร่วมกัน)
        const root = inst.rootNodes[0];
        // root ของ glTF มีการหมุนแปลงแกนอยู่แล้ว → ห่อด้วย grip แล้วปรับ pos/rot/scale ที่ grip แทน
        const T = (typeof BABYLON !== 'undefined' && BABYLON.TransformNode) || root.constructor;
        const g = new T('grip_' + id + '_' + i, root.getScene());
        g.parent = slot; g.position.set(...m.pos); g.rotation.set(...m.rot); g.scaling.setAll(m.scale || 1);
        root.parent = g; root.getChildMeshes().forEach(x => { x.isPickable = false; });
        parts.push({ g, tip: findTip(g, root) });                    // จุดปลายอาวุธ (ใช้ลากเอฟเฟกต์ฟันตามปลายจริง)
      }
      if (!parts.length) return false;
      nodes[id] = parts[0].g; tips[id] = parts[0].tip; extra[id] = parts.slice(1);
      setWeaponOn(id, wId === id);                                   // ระหว่างโหลดผู้เล่นอาจสลับอาวุธไปแล้ว
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
    const V = BABYLON.Vector3; let a, b;
    const all = [{ g: nodes[wId], tip: tips[wId] }].concat(extra[wId] || []);                 // [ขวา, ซ้าย?] — ดาบเดี่ยวมีแค่ตัวแรก
    const sel = st.hand === 'l' && all[1] ? [all[1]] : st.hand === 'both' && all.length > 1 ? all : [all[0]];
    const live = sel.filter(x => x.g && x.tip);
    if (live.length) {                                        // ตามปลายอาวุธจริง (2 มือ = เฉลี่ยปลายขวานทั้งสองเป็นแถบกว้าง)
      a = new V(0, 0, 0); b = new V(0, 0, 0);
      live.forEach(x => { x.g.computeWorldMatrix(true); const m = x.g.getWorldMatrix(); a.addInPlace(V.TransformCoordinates(x.tip.scale(fx.reach), m)); b.addInPlace(V.TransformCoordinates(x.tip.scale(fx.base), m)); });
      a.scaleInPlace(1 / live.length); b.scaleInPlace(1 / live.length);
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
    let clip = st.clip;                                                // st.clips = ลิสต์ท่าที่ลอง: เอาตัวที่คลิปชื่อตรงจริงก่อน → รองลงมาท่าสำรอง → ท่าเดิม
    if (st.clips && p.anim) clip = st.clips.find(n => p.anim.exact && p.anim.exact(n)) || st.clips.find(n => p.anim.has(n)) || st.clip;
    pose.mirror = !!(st.mirror && cfg.mirrorLeft !== false);          // ท่า 2 ของขวานคู่: กลับซ้าย-ขวาให้แขนอีกข้างฟาด (ปิดได้ที่ CFG.combat.mirrorLeft = false)
    if (p.anim) p.anim.act(clip, { duration: time });
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
    const dmg = Math.max(1, Math.round((w.stats.damage + statBonus(wId)) * cur.mult * pw));   // + โบนัสจากสถิติ Melee/Sword (src/player-stats.js)
    const range = st.range || w.stats.range, arc = (st.arc || w.stats.arc) * (sk.arcMult || 1);   // แต่ละท่าทับระยะ/มุมได้
    for (const m of ctx.mobs) {
      if (m.phase && m.phase !== 'alive') continue;
      if (!inCone(p, m, range, arc)) continue;
      const dealt = ctx.Health ? ctx.Health.damage(m, dmg, { type: 'player', skill: cur.id, weapon: wId }) : 0;
      if (dealt > 0 && typeof Events !== 'undefined') Events.emit('combat:hit', { mob: m, amount: dealt, skill: cur.id, weapon: wId });
      if (dealt > 0 && st.impact && hasFX() && alive(m)) { const q = mobAt(m); SkillFX.hitSpark(q.x, q.y, q.z, st.impact); }   // ประกายกระแทก (เฉพาะท่าที่ตั้ง impact — ขวานคู่)
    }
    if (st.slam && hasFX()) {                                          // ฟาดสองมือ: กระแทกพื้นเป็นวงกว้าง + จอสั่น
      const f = fwd(), pos = p.wrap.position;
      SkillFX.slam(pos.x + f[0] * range * 0.5, pos.y, pos.z + f[1] * range * 0.5, range * 1.3, 1);
    }
  }

  function update(dt) {
    if (!ctx) return;
    const p = ctx.getPlayer();
    tickSpecials(dt, p);
    applyPose(p, dt);
    if (lockT > 0) lockT -= dt;
    if (!cur) { if (comboT > 0) comboT -= dt; if (gapT > 0) gapT -= dt; }
    else if (!p || p.dead || p.dashing) { cur = null; queue = null; comboT = 0; comboIdx = 0; gapT = 0; lockT = 0; pose.mirror = false; }   // ตาย/Dash ตัดท่าฟัน
    else {
      cur.t += dt;
      const prog = cur.t / cur.time;
      if (fx && (cur.st.fx && cur.st.fx.from != null ? prog >= cur.st.fx.from : prog >= cur.hitAt - 0.3) && prog <= (cur.st.fx && cur.st.fx.to != null ? cur.st.fx.to : cur.hitAt + 0.25))
        fxSample(p, cur.w, cur.st, Math.max(0, Math.min(1, (prog - (cur.hitAt - 0.3)) / 0.55)));
      if (!cur.did && prog >= cur.hitAt) { cur.did = true; strike(); }
      if (cur.t >= cur.time) {
        const { cb, last, gap } = cur; cur = null; pose.mirror = false;
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
  const SPECIAL_TYPES = { sonicDash: startSonicDash, slashBarrage: startBarrage, piercingBeam: startBeam, crescentWave: startCrescent, stormCyclone: startStorm, radialBurst: startRadialBurst };

  const hasFX = () => typeof SkillFX !== 'undefined' && SkillFX;
  const alive = m => !!(m && m.wrap && (!m.phase || m.phase === 'alive') && !(m.hp <= 0) && !m.wrap.isDisposed());
  const planar = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const statBonus = id => (typeof PlayerStats !== 'undefined' && PlayerStats.damageBonus) ? PlayerStats.damageBonus(id) : 0;   // ไม่มี player-stats.js → 0 (เกมเดิมไม่เปลี่ยน)
  const dmgOf = (w, mult) => {
    const pw = (ctx.Health && ctx.Health.player && ctx.Health.player.stats && ctx.Health.player.stats.power) || 1;
    return Math.max(1, Math.round((w.stats.damage + statBonus(wId)) * mult * pw));   // + โบนัสจากสถิติ Melee/Sword
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
  const cancelNormal = () => { cur = null; queue = null; gapT = 0; comboT = 0; comboIdx = 0; lockT = 0; pose.mirror = false; };   // สกิลพิเศษตัดท่าฟันปกติทันที

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
    sp = null; clearPose();
    if (typeof Events !== 'undefined') Events.emit('skill:ended', { slot: s.slot, type: s.d.type, weapon: s.wid });
  }
  function abortSpecial() {                             // ตาย/ถูกตัด/ปิดฉาก → ปล่อยสตันทุกตัว ล้างเอฟเฟกต์
    const s = sp; if (!s) return; sp = null; clearPose();
    if (s.onAbort) { try { s.onAbort(s); } catch (e) { console.error('[combat] onAbort', e); } }
    if (s.phase === 'dash' && ctx.cancelDash) ctx.cancelDash();
    const list = s.targets || (s.hit ? [s.hit] : []);
    list.forEach(m => { try { ctx.unstun && ctx.unstun(m); } catch (e) {} });
    if (s.fxh) s.fxh.cancel();
    if (hasFX()) SkillFX.cancelAll();
  }
  function dispose() {                                  // ฉาก/เกมถูกปิด → ล้างทุกอย่างให้เรียบร้อย
    if (disposed) return; disposed = true;
    abortSpecial(); sched = [];
    storms.forEach(st => endStorm(st, true)); storms = [];            // พายุที่ยังหมุนอยู่ → ปล่อยสตัน + ปิดเอฟเฟกต์
    clearPose();
    for (const id in nodes) { try { setWeaponOn(id, false); nodes[id].dispose(); (extra[id] || []).forEach(e => e.g.dispose()); } catch (e) {} delete nodes[id]; delete extra[id]; }
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
    if (storms.length) tickStorms(dt, p);
    if (!sp) return;
    if (!p || p.dead || disposed) { abortSpecial(); return; }
    const s = sp;
    try { s.type === 'z' ? updateSonic(s, dt, p) : s.type === 'x' ? updateBarrage(s, dt, p) : s.type === 'tl' ? updateTimeline(s, dt, p) : updateCast(s, dt, p); }
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


  // =====================================================================
  // ===== ขวานคู่: Z = Cyclone Storm (พายุหมุนยักษ์ ดาเมจซ้ำ + สตันคุมเวลา) / X = Slash Burst (ย่อตัวแล้วระเบิดเส้นฟันรอบทิศ + ผลักแรง) =====
  // combat.js คิดดาเมจ/สตัน/ผลัก/เวลาทั้งหมด — SkillFX แค่เล่นภาพ (ภาพไม่ได้กำหนดว่าใครโดน)
  // =====================================================================
  SPECIAL_DEF.stormCyclone = { name: 'Cyclone Storm', cooldown: 18, cost: 85,
    lunge: { distance: 3.5, duration: 0.3 },                              // พุ่งสั้นๆ ใช้ระบบพุ่งชนของเดิม (ไม่หัก Stamina ซ้ำ)
    castTime: 0.6, releaseAt: 0.42, spinTime: 0.5,                         // ท่าร่ายรวม / จังหวะปล่อยพายุ / เวลาหมุนตัว
    anim: ['atk2hSpin', 'atk2hSpinning', 'atkDualSlice', 'atkHorizontal'], spin: 'auto',   // spin 'auto' = หมุนตัว procedural เฉพาะเมื่อไม่มีคลิปหมุนที่ชื่อตรง
    aimRange: 14, centerDist: 7, minCenter: 3, maxCenter: 12,              // ศูนย์กลางพายุ = ข้างหน้า centerDist (หรือที่ศัตรูใกล้สุดข้างหน้า) ไม่เกิน maxCenter
    radius: 9, duration: 3, collapse: 1.0, shrinkStart: 0.7, shrinkTo: 0.45, height: 11,   // ช่วง active 3 วิ: 70% แรกเต็มรัศมี แล้วหดเหลือ 45% ก่อนยุบเข้าแกน
    tickInterval: 0.25, tickMult: 0.6, initialMult: 3,                      // ดาเมจแรงกระแทก + ทิกซ้ำทุก 0.25 วิ
    stun: true, stunPad: 0.15 };                                           // สตันแบบต่ออายุทีละทิก (ทิก + pad วิ) → ไม่ค้างถาวรแม้สกิลถูกตัด
  SPECIAL_DEF.radialBurst = { name: 'Slash Burst', cooldown: 15, cost: 80,
    crouchTime: 0.55, squash: 0.14, releaseTime: 0.55, burstAt: 0.2,        // ย่อ 0.55 วิ (ท่า Crouching + บีบตัว) → ปล่อยท่าฟาด → ระเบิดที่ 0.2 วิ
    anim: { release: ['atk2hChop', 'atkDualChop', 'atkJumpChop', 'atkChop'] },
    aimRange: 14, centerOffset: 3, radius: 13, rearLimit: 4,                // ศูนย์กลางระเบิดอยู่ข้างหน้า 3 หน่วย รัศมี 13; ด้านหลังตัวเกิน 4 หน่วยไม่โดน
    mult: 5.5, knock: { dist: 7, dur: 0.4 } };                             // ดาเมจครั้งเดียวต่อมอน + ผลักแรงออกจากศูนย์กลาง (ไม่สตัน)

  let storms = [];
  const clamp01_ = x => x < 0 ? 0 : x > 1 ? 1 : x, easeIO = k => k * k * (3 - 2 * k);
  function applyPose(p, dt) {                                              // กลับซ้าย-ขวา (scale.x = -1) และ/หรือบีบตัวลง (scale.y) ที่ตัวผู้เล่น — คืนค่าเมื่อจบท่า
    if (!p || !p.wrap || !p.wrap.scaling) return;
    if (pose.squash !== pose.target) { pose.squash += (pose.target - pose.squash) * Math.min(1, dt * 16); if (Math.abs(pose.target - pose.squash) < 0.002) pose.squash = pose.target; }
    const neutral = !pose.mirror && !pose.squash;
    if (neutral && !pose.dirty) return;
    const s = p.wrap.scaling; s.x = pose.mirror ? -1 : 1; s.y = 1 - pose.squash; pose.dirty = !neutral;
  }
  function clearPose() { pose.mirror = false; pose.target = 0; pose.squash = 0; applyPose(ctx && ctx.getPlayer(), 0); }

  // ลำดับเหตุการณ์ตามเวลา (ท่าร่าย → ปล่อยสกิล): events = [{ at, fn(s, p) }], end = เวลาที่ผู้เล่นกลับมาควบคุมได้
  function startTimeline(w, d, slot, events, end, hooks) {
    events.sort((a, b) => a.at - b.at);
    sp = Object.assign({ slot, type: 'tl', d, w, wid: wId, phase: 'tl', t: 0, events, ei: 0, end }, hooks || {});
    return sp;
  }
  function updateTimeline(s, dt, p) {
    s.t += dt;
    while (s.ei < s.events.length && s.t >= s.events[s.ei].at) { s.events[s.ei++].fn(s, p); if (sp !== s) return; }
    if (s.upd) s.upd(s, dt, p);
    if (s.t >= s.end) finishSpecial(s);
  }
  const logOnce = (k, msg) => { if (!castLogged[k]) { castLogged[k] = 1; console.info(msg); } };

  // ---------- Z: Cyclone Storm ----------
  function startStorm(p, w, d, slot) {
    const a = p.anim;
    const tgt = nearest(p, d.maxCenter, 140);                              // เลือกเป้าหมายก่อนหมุนตัว (หมุนแล้วมุมเล็งจะเพี้ยน)
    if (cfg.autoAim !== false && tgt) faceTo(p, tgt.wrap.position.x, tgt.wrap.position.z);
    const h0 = ctx.getHeading();
    if (ctx.skillDash && d.lunge) ctx.skillDash({ distance: d.lunge.distance, duration: d.lunge.duration, iframe: d.lunge.duration });   // พุ่งสั้น (ชนของ/หน้าผาแบบ Dash)
    const exact = a && d.anim.find(n => a.exact && a.exact(n)), clip = exact || (a && d.anim.find(n => a.has(n))) || null;
    const procSpin = d.spin === true || (d.spin !== false && !exact);       // ไม่มีคลิปหมุนจริง → หมุนตัวเองทั้งตัว 360°
    if (clip) a.act(clip, { duration: d.castTime });                        // (เรียกหลัง skillDash เพื่อทับท่า Dodge)
    logOnce('storm' + (exact ? 'x' : clip ? 'f' : 'n'), '[skill] Cyclone Storm: animation = ' + (exact ? 'exact ' + exact : clip ? 'fallback ' + clip : 'none') + (procSpin ? ' + procedural spin' : ''));
    startTimeline(w, d, slot, [{ at: d.releaseAt, fn: (s, pl) => releaseStorm(s, pl, h0, tgt) }], d.castTime, {
      upd: (s, dt) => { if (procSpin) ctx.setHeading(h0 + Math.PI * 2 * easeIO(clamp01_(s.t / d.spinTime))); }
    });
    return true;
  }
  function releaseStorm(s, p, h0, tgt) {
    const d = s.d, pos = p.wrap.position, fx_ = Math.sin(h0), fz = Math.cos(h0);
    let dist = d.centerDist;
    if (tgt && alive(tgt)) dist = Math.min(d.maxCenter, Math.max(d.minCenter, planar(tgt.wrap.position, pos)));   // มีเป้า → ศูนย์กลางไปอยู่ที่เป้า (คลุมกลุ่มศัตรู)
    let cx = pos.x, cz = pos.z;
    for (let r = dist; r >= 0; r -= 1) {                                    // ถอยเข้าหาตัวจนเจอพื้นที่ยืนได้ (ไม่ตั้งกลางน้ำ/นอกแมพ)
      const x = pos.x + fx_ * r, z = pos.z + fz * r;
      if (!ctx.heightAt || ctx.heightAt(x, z) > -0.9) { cx = x; cz = z; break; }
    }
    const gy = ctx.heightAt ? ctx.heightAt(cx, cz) : pos.y;
    const st = { x: cx, y: gy, z: cz, d, w: s.w, wid: s.wid, t: 0, ticks: 0, maxTicks: Math.floor(d.duration / d.tickInterval + 1e-6), stunned: new Set(), fxh: null };
    if (hasFX()) st.fxh = SkillFX.storm({ x: cx, y: gy, z: cz, radius: d.radius, duration: d.duration, collapse: d.collapse, shrinkStart: d.shrinkStart, shrinkTo: d.shrinkTo, height: d.height });
    storms.push(st);                                                        // พายุอยู่กับที่ ทำงานต่อแม้ผู้เล่นขยับ/ท่าร่ายจบแล้ว (tickStorms)
    stormPulse(st, d.initialMult);                                          // แรงกระแทกครั้งแรก
  }
  const stormRadius = st => { const d = st.d, ds = d.duration * d.shrinkStart; return d.radius * (st.t <= ds ? 1 : 1 - (1 - d.shrinkTo) * clamp01_((st.t - ds) / Math.max(0.01, d.duration - ds))); };   // สูตรเดียวกับภาพ: หดตอนท้าย
  function stormPulse(st, mult) {                                           // ดาเมจ + ต่อสตัน เฉพาะศัตรูที่อยู่ในรัศมี "ตอนนี้"
    const d = st.d, r = stormRadius(st) + 0.6, now = new Set();
    for (const m of ctx.mobs) {
      if (!alive(m) || planar(m.wrap.position, st) > r) continue;
      hurt(m, dmgOf(st.w, mult), 'special:z', st.wid);
      if (alive(m)) { now.add(m); if (d.stun && ctx.stun) ctx.stun(m, d.tickInterval + (d.stunPad == null ? 0.15 : d.stunPad)); }
    }
    st.stunned.forEach(m => { if (!now.has(m) && ctx.unstun) ctx.unstun(m); });   // ออกนอกพายุแล้ว → ปล่อยทันที
    st.stunned = now;
  }
  function endStorm(st, aborted) {
    st.stunned.forEach(m => { try { ctx.unstun && ctx.unstun(m); } catch (e) {} }); st.stunned = new Set();   // จบ/ถูกตัด/ผู้เล่นตาย → ไม่มีใครค้างสตัน
    if (st.fxh) { if (!aborted) return; if (disposed) st.fxh.cancel(); else st.fxh.collapse(); }                // จบปกติ: เอฟเฟกต์ยุบตัวเองต่อ / ถูกตัด: ยุบเร็ว
  }
  function tickStorms(dt, p) {
    const gone = disposed || !p || p.dead;
    for (let i = storms.length - 1; i >= 0; i--) {
      const st = storms[i];
      if (gone) { endStorm(st, true); storms.splice(i, 1); continue; }
      st.t += dt;
      const due = Math.min(Math.floor(st.t / st.d.tickInterval + 1e-6), st.maxTicks);
      while (st.ticks < due) { st.ticks++; stormPulse(st, st.d.tickMult); }
      if (st.t >= st.d.duration - 1e-6) { endStorm(st, false); storms.splice(i, 1); }
    }
  }

  // ---------- X: Crouching Radial Slash Burst ----------
  function startRadialBurst(p, w, d, slot) {
    const a = p.anim, pos = p.wrap.position;
    if (cfg.autoAim !== false) { const t = nearest(p, d.aimRange, 160); if (t) faceTo(p, t.wrap.position.x, t.wrap.position.z); }
    const f = forward2(), crouchOk = !!(a && a.has('crouch'));
    if (crouchOk) a.act('crouch');                                          // ท่า Crouching จริง (วนลูป)
    pose.target = d.squash;                                                 // + บีบตัวลงให้เห็นว่าย่อชัดเจน แม้ไม่มีคลิป
    if (hasFX()) SkillFX.chargeRing(pos.x, pos.y + 0.1, pos.z, d.crouchTime, 7);   // วงรวมพลังหดเข้าหาตัว = จังหวะสะสมแรง
    const rel = a && (d.anim.release.find(n => a.exact && a.exact(n)) || d.anim.release.find(n => a.has(n)));
    logOnce('burst' + crouchOk + (rel || ''), '[skill] Slash Burst: crouch clip = ' + (crouchOk ? 'Crouching' : 'missing → procedural squash only') + ', release = ' + (rel || 'none'));
    startTimeline(w, d, slot, [
      { at: d.crouchTime, fn: (s, pl) => { pose.target = 0; if (rel && pl.anim) pl.anim.act(rel, { duration: d.releaseTime }); } },
      { at: d.crouchTime + d.burstAt, fn: (s, pl) => burstNow(s, pl, f) }
    ], d.crouchTime + d.releaseTime + 0.05);
    return true;
  }
  function burstNow(s, p, f) {
    const d = s.d, pos = p.wrap.position, cx = pos.x + f.x * d.centerOffset, cz = pos.z + f.z * d.centerOffset;
    const gy = ctx.heightAt ? ctx.heightAt(cx, cz) : pos.y;
    if (hasFX()) SkillFX.radialBurst({ x: cx, y: gy, z: cz, yaw: f.h, radius: d.radius });   // ภาพล้วน: เส้นฟันกี่เส้นก็ไม่มีผลต่อดาเมจ
    const hit = new Set();                                                  // ดาเมจคิดที่นี่ครั้งเดียวต่อมอน (ไม่ขึ้นกับจำนวนเส้นเอฟเฟกต์)
    for (const m of ctx.mobs) {
      if (!alive(m) || hit.has(m)) continue;
      const mp = m.wrap.position;
      if (Math.hypot(mp.x - cx, mp.z - cz) > d.radius + 0.6) continue;
      if ((mp.x - pos.x) * f.x + (mp.z - pos.z) * f.z < -d.rearLimit) continue;   // เน้นด้านหน้า: ด้านหลังตัวไกลเกินไม่โดน
      hit.add(m);
      hurt(m, dmgOf(s.w, d.mult), 'special:x', s.wid);
      if (alive(m)) {
        let kx = mp.x - cx, kz = mp.z - cz; if (Math.hypot(kx, kz) < 0.5) { kx = f.x; kz = f.z; }
        if (ctx.knock) ctx.knock(m, kx, kz, d.knock.dist, d.knock.dur);       // ผลักแรงออกจากศูนย์กลาง (ไม่สตัน)
        if (hasFX()) { const q = mobAt(m); SkillFX.hitSpark(q.x, q.y, q.z, 5); }
      }
    }
  }

  return { init, use, update, equip, registerWeapon, animStates: ANIM_STATES,
    useSpecial, specialInfo, dispose, get specialActive() { return !!sp; },   // specialActive: game.js ใช้ล็อกการเดิน/Dash ระหว่างสกิล
    get weapon() { return weapons && weapons[wId]; }, get weaponId() { return wId; },
    get stats() { return weapons && weapons[wId] && weapons[wId].stats; },
    get weapons() { return weapons; }, get skills() { return skills; } };
})();
