// ===== src/combat.js — อาวุธ + สกิล + ท่าต่อสู้ของผู้เล่น =====
// ต้องใส่ <script src="src/combat.js"></script> ต่อจาก health.js และก่อน game.js
//
// แนวคิด: ทุกอย่างเป็น "ตาราง" — เพิ่มอาวุธ/สกิล/ท่าใหม่ = เพิ่มข้อมูล ไม่ต้องแก้ตรรกะ
//   ANIM_STATES  ท่าต่อสู้ (ชื่อ state → regex ชื่อคลิป) — game.js ดึงไปรวมในระบบแอนิเมชันเอง
//   WEAPONS      อาวุธ: โมเดล, จุดจับ, ดาบ/ระยะ/มุมฟัน, สกิลที่ใช้ได้
//   SKILLS       สกิล: คอมโบท่าอะไรบ้าง, เวลา, ตัวคูณดาเมจ, ต้นทุน Stamina
// ค่าทั้งหมดทับได้จาก CFG.combat ใน config.js
//
// ท่าฟันดาบจริงอยู่ในไฟล์แพ็กท่า KayKit ชุด Combat (เช่น Rig_Medium_CombatMelee.glb) — ใส่ไฟล์นั้นใน CFG.anims แล้วท่าจะถูกใช้เอง
// ถ้ายังไม่มีไฟล์นั้น จะใช้ท่า Throw / Use_Item จาก Rig_Medium_General แทนไปก่อน (ให้ระบบทำงานครบ)
const Combat = (() => {
  // ---------- ท่าต่อสู้: ลองชื่อแรกก่อน ไม่เจอค่อยลองชื่อถัดไป ----------
  const ANIM_STATES = {
    attackLight1: { clip: [/Melee_1H_Attack_Slice_Diagonal/i, /1H.*Attack.*Slice/i, /Attack/i, /^Throw$/i], lockMove: true },
    attackLight2: { clip: [/Melee_1H_Attack_Slice_Horizontal/i, /1H.*Attack.*(Chop|Slice)/i, /Attack/i, /^Use_Item$/i], lockMove: true },
    attackLight3: { clip: [/Melee_1H_Attack_Stab/i, /Stab/i, /Attack/i, /^Throw$/i], lockMove: true },
    attackHeavy:  { clip: [/Melee_1H_Attack_Chop/i, /Chop/i, /Attack/i, /^Use_Item$/i], lockMove: true }
  };

  // ---------- อาวุธ ----------
  const WEAPONS = {
    sword: {
      name: 'Sword',
      model: null,               // path โมเดล เช่น 'characters/sword_1handed.glb' (ไม่ใส่ = ไม่แสดงโมเดล แต่ฟันได้)
      slot: 'handslot.r',        // จุดจับบนโครงกระดูก (มือขวา)
      pos: [0, 0, 0], rot: [0, 0, 0], scale: 1,   // ชดเชยตำแหน่ง/มุม/ขนาด ถ้าดาบเอียงหรือหลุดมือ
      damage: 25,                // ดาเมจพื้นฐานต่อครั้ง
      range: 3.4,                // ระยะฟัน (หน่วยโลก)
      arc: 110,                  // มุมฟันด้านหน้า (องศา)
      skills: ['light', 'heavy']
    }
  };

  // ---------- สกิล ----------
  const SKILLS = {
    light: { name: 'Light attack', combo: ['attackLight1', 'attackLight2', 'attackLight3'],
      time: 0.45,        // เวลาต่อท่า (วินาที)
      hitAt: 0.4,        // ช่วงที่ดาเมจเข้า (สัดส่วนของเวลาท่า)
      dmgMult: 1, finisherMult: 1.4,   // ท่าสุดท้ายของคอมโบแรงขึ้น
      cost: 8,           // Stamina ต่อครั้ง
      comboWindow: 0.6   // เวลาที่ต่อคอมโบได้หลังท่าจบ
    },
    heavy: { name: 'Heavy attack', combo: ['attackHeavy'], time: 0.8, hitAt: 0.5, dmgMult: 2.2, cost: 22, arcMult: 1.3 }
  };

  const DEF_KEYS = { light: ['KeyJ'], heavy: ['KeyK'] };
  let ctx = null, cfg = {}, weapons = null, skills = null, wId = 'sword', weaponNode = null;
  let cur = null, comboIdx = 0, comboT = 0, queue = null, queueT = 0;

  const merge = (base, over) => {                     // ทับค่าทีละอาวุธ/สกิล (ไม่ลบค่าที่ไม่ได้ระบุ)
    const o = {}; for (const k in base) o[k] = Object.assign({}, base[k], (over && over[k]) || {});
    for (const k in (over || {})) if (!o[k]) o[k] = Object.assign({}, over[k]);
    return o;
  };

  function init(c) {   // c = { getPlayer, mobs, load, Health, Stamina, getHeading, setHeading, cfg }
    ctx = c; cfg = c.cfg || {};
    weapons = merge(WEAPONS, cfg.weapons); skills = merge(SKILLS, cfg.skills);
    const keys = Object.assign({}, DEF_KEYS, cfg.keys || {});
    addEventListener('keydown', e => {
      if (e.repeat) return;
      for (const id in keys) if (keys[id].includes(e.code)) { e.preventDefault(); use(id); }
    });
    if (cfg.button !== false) {                       // ปุ่ม ATTACK บนจอ (มือถือ) — ปุ่มเล็กอยู่ซ้ายของ DASH
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;right:126px;bottom:48px;width:72px;height:72px;border-radius:50%;background:rgba(255,120,100,.3);border:3px solid rgba(255,255,255,.85);color:#fff;font:700 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 3px #000';
      b.textContent = 'ATTACK';
      b.addEventListener('pointerdown', e => { e.preventDefault(); use('light'); });
      document.body.appendChild(b);
    }
    equip(cfg.weapon || 'sword');
  }

  // ---------- ติดอาวุธ ----------
  async function equip(id) {
    const w = weapons[id]; if (!w) return false;
    wId = id;
    if (weaponNode) { weaponNode.dispose(); weaponNode = null; }
    if (!w.model) return true;
    const p = ctx.getPlayer(); if (!p) return false;
    const slot = p.getSlot && p.getSlot(w.slot);
    if (!slot) { console.warn('[combat] ไม่พบจุดจับ ' + w.slot + ' บนตัวละคร'); return false; }
    const cont = await ctx.load(w.model); if (!cont) return false;      // โหลดไม่ได้ → game.js แจ้งใน log เอง
    if (wId !== id) return false;                                       // ระหว่างโหลดมีการเปลี่ยนอาวุธ
    const inst = cont.instantiateModelsToScene(n => n, false, { doNotInstantiate: true });
    const r = inst.rootNodes[0];
    r.parent = slot; r.position.set(...w.pos); r.rotation.set(...w.rot); r.scaling.setAll(w.scale || 1);
    r.getChildMeshes().forEach(m => { m.isPickable = false; });
    weaponNode = r; return true;
  }

  // ---------- ใช้สกิล ----------
  function use(id) {
    const p = ctx && ctx.getPlayer(); const sk = skills && skills[id], w = weapons[wId];
    if (!p || !sk || !w || p.dead || p.dashing || !w.skills.includes(id)) return false;
    if (cur) { queue = id; queueT = 0.3; return false; }               // กำลังฟัน → จองคิวไว้ 0.3 วิ (ไม่ต้องกดจังหวะเป๊ะ)
    if (ctx.Stamina && !ctx.Stamina.spend(sk.cost || 0)) return false;  // Stamina ไม่พอ (แถบกะพริบแดง)
    let step = 0;
    if (sk.combo.length > 1) { step = comboT > 0 && comboIdx < sk.combo.length - 1 ? comboIdx + 1 : 0; comboIdx = step; }
    const last = sk.combo.length > 1 && step === sk.combo.length - 1;
    // ช่วยเล็ง: หันไปหามอนที่ใกล้ที่สุดในระยะ (มือถือเล็งยาก)
    if (cfg.autoAim !== false) {
      const t = nearest(p, w.range * 1.8, w.arc * 1.5);
      if (t) ctx.setHeading(Math.atan2(t.wrap.position.x - p.wrap.position.x, t.wrap.position.z - p.wrap.position.z));
    }
    if (p.anim) p.anim.act(sk.combo[step], { duration: sk.time });
    cur = { id, sk, w, t: 0, did: false, mult: (sk.dmgMult || 1) * (last ? sk.finisherMult || 1 : 1) };
    comboT = 0; return true;
  }

  const fwd = () => { const h = ctx.getHeading(); return [Math.sin(h), Math.cos(h)]; };
  function inCone(p, m, range, arcDeg) {
    const dx = m.wrap.position.x - p.wrap.position.x, dz = m.wrap.position.z - p.wrap.position.z, d = Math.hypot(dx, dz);
    if (d > range + 0.8) return false;                                 // +0.8 ≈ รัศมีตัวมอน
    if (d < 0.01) return true;
    const [fx, fz] = fwd(), cos = (dx * fx + dz * fz) / d;
    return cos >= Math.cos(arcDeg * Math.PI / 360);
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
    const p = ctx.getPlayer(), { sk, w } = cur;
    const stats = (ctx.Health && ctx.Health.player && ctx.Health.player.stats) || { power: 1 };   // สถิติดาเมจเก็บไว้ที่ health.js
    const dmg = Math.max(1, Math.round(w.damage * cur.mult * (stats.power || 1)));
    const arc = w.arc * (sk.arcMult || 1);
    let hits = 0;
    for (const m of ctx.mobs) {
      if (m.phase && m.phase !== 'alive') continue;
      if (!inCone(p, m, w.range, arc)) continue;
      const dealt = ctx.Health ? ctx.Health.damage(m, dmg, { type: 'player', skill: cur.id, weapon: wId }) : 0;
      if (dealt > 0) { hits++; if (typeof Events !== 'undefined') Events.emit('combat:hit', { mob: m, amount: dealt, skill: cur.id, weapon: wId }); }
    }
    return hits;
  }

  function update(dt) {
    if (!ctx) return;
    const p = ctx.getPlayer();
    if (!cur) { if (comboT > 0) comboT -= dt; }
    else if (!p || p.dead || p.dashing) { cur = null; queue = null; comboT = 0; }     // ตาย/Dash ตัดท่าฟัน
    else {
      cur.t += dt;
      if (!cur.did && cur.t >= cur.sk.hitAt * cur.sk.time) { cur.did = true; strike(); }
      if (cur.t >= cur.sk.time) { comboT = cur.sk.comboWindow || 0; cur = null; }
    }
    if (queue) { queueT -= dt; if (queueT <= 0) queue = null; else if (!cur) { const q = queue; queue = null; use(q); } }
  }

  return { init, use, update, equip, animStates: ANIM_STATES,
    get weapon() { return weapons && weapons[wId]; }, get weapons() { return weapons; }, get skills() { return skills; } };
})();
