// ===== src/combat.js — อาวุธ (component) + สกิล + Hotbar + ท่าต่อสู้ของผู้เล่น =====
// ต้องใส่ <script src="src/combat.js"></script> ต่อจาก health.js และก่อน game.js
//
// อาวุธ 1 ชิ้น = 1 component ที่รวมทุกอย่างของมันไว้ที่เดียว:
//   model  : โมเดลที่ติดมือ (path ใต้ assets/, จุดจับ, ชดเชยตำแหน่ง/มุม/ขนาด)
//   stats  : damage ดาเมจ / range ระยะโจมตี / arc มุมฟัน (องศา) / speed ความไวโจมตี (1 = ปกติ, 1.5 = เร็วกว่า 50%)
//   skills : สกิลที่อาวุธนี้ใช้ได้
// game.js แค่เรียก Combat.init(...) — เมื่อผู้เล่นเลือกอาวุธ ระบบดึง component ของอาวุธนั้นมาใช้เอง
// เพิ่มอาวุธใหม่: เพิ่มใน WEAPONS (หรือ CFG.combat.weapons / Combat.registerWeapon) แล้วใส่ id ใน CFG.combat.hotbar
const Combat = (() => {
  // ---------- ท่าต่อสู้: ลองชื่อแรกก่อน ไม่เจอค่อยลองชื่อถัดไป ----------
  const ANIM_STATES = {
    attackLight1: { clip: [/Melee_1H_Attack_Slice_Diagonal/i, /1H.*Attack.*Slice/i, /Attack/i, /^Throw$/i], lockMove: true },
    attackLight2: { clip: [/Melee_1H_Attack_Slice_Horizontal/i, /1H.*Attack.*(Chop|Slice)/i, /Attack/i, /^Use_Item$/i], lockMove: true },
    attackLight3: { clip: [/Melee_1H_Attack_Stab/i, /Stab/i, /Attack/i, /^Throw$/i], lockMove: true },
    attackHeavy:  { clip: [/Melee_1H_Attack_Chop/i, /Chop/i, /Attack/i, /^Use_Item$/i], lockMove: true }
  };

  // ---------- อาวุธ (component) ----------
  const grip = path => ({ path, slot: 'handslot.r', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 });
  const WEAPONS = {
    dagger: { name: 'Dagger', model: grip('weapon/dagger.gltf'),
      stats: { damage: 14, range: 2.4, arc: 90, speed: 1.5 },     // เบา สั้น แต่ไว
      skills: ['light', 'heavy'] },
    sword: { name: 'Sword', model: grip('weapon/sword_1handed.gltf'),
      stats: { damage: 25, range: 3.4, arc: 110, speed: 1 },      // สมดุล
      skills: ['light', 'heavy'] }
  };

  // ---------- สกิล ----------
  const SKILLS = {
    light: { name: 'Light attack', combo: ['attackLight1', 'attackLight2', 'attackLight3'],
      time: 0.45,        // เวลาต่อท่า (วินาที) ก่อนหารด้วย stats.speed ของอาวุธ
      hitAt: 0.4,        // ช่วงที่ดาเมจเข้า (สัดส่วนของเวลาท่า)
      dmgMult: 1, finisherMult: 1.4,   // ท่าสุดท้ายของคอมโบแรงขึ้น
      cost: 8,           // Stamina ต่อครั้ง
      comboWindow: 0.6   // เวลาที่ต่อคอมโบได้หลังท่าจบ
    },
    heavy: { name: 'Heavy attack', combo: ['attackHeavy'], time: 0.8, hitAt: 0.5, dmgMult: 2.2, cost: 22, arcMult: 1.3 }
  };

  const DEF_KEYS = { light: ['KeyJ'], heavy: ['KeyK'] };
  const DEF_HOTBAR = ['dagger', 'sword'];
  let ctx = null, cfg = {}, weapons = null, skills = null, hotbar = [], wId = null;
  let cur = null, comboIdx = 0, comboT = 0, queue = null, queueT = 0;
  const nodes = {}, loading = {}, slotEls = [];

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp);
  const deepMerge = (a, b) => {                       // ทับค่าทีละชั้น (ไม่ลบค่าที่ไม่ได้ระบุ)
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
    wId = id; paintHotbar();
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
      nodes[id] = g; g.setEnabled(wId === id);
      return true;
    } finally { loading[id] = false; }
  }

  // ---------- ใช้สกิล ----------
  function use(id) {
    const p = ctx && ctx.getPlayer(); const sk = skills && skills[id], w = weapons && weapons[wId];
    if (!p || !sk || !w || p.dead || p.dashing || !w.skills.includes(id)) return false;
    if (cur) { queue = id; queueT = 0.3; return false; }               // กำลังฟัน → จองคิวไว้ 0.3 วิ
    if (ctx.Stamina && !ctx.Stamina.spend(sk.cost || 0)) return false;  // Stamina ไม่พอ (แถบกะพริบแดง)
    let step = 0;
    if (sk.combo.length > 1) { step = comboT > 0 && comboIdx < sk.combo.length - 1 ? comboIdx + 1 : 0; comboIdx = step; }
    const last = sk.combo.length > 1 && step === sk.combo.length - 1;
    const time = sk.time / Math.max(0.1, w.stats.speed || 1);          // ความไวของอาวุธ
    if (cfg.autoAim !== false) {                                       // ช่วยเล็ง: หันหามอนที่ใกล้ที่สุด
      const t = nearest(p, w.stats.range * 1.8, w.stats.arc * 1.5);
      if (t) ctx.setHeading(Math.atan2(t.wrap.position.x - p.wrap.position.x, t.wrap.position.z - p.wrap.position.z));
    }
    if (p.anim) p.anim.act(sk.combo[step], { duration: time });
    cur = { id, sk, w, time, t: 0, did: false, mult: (sk.dmgMult || 1) * (last ? sk.finisherMult || 1 : 1) };
    comboT = 0; return true;
  }

  const fwd = () => { const h = ctx.getHeading(); return [Math.sin(h), Math.cos(h)]; };
  function inCone(p, m, range, arcDeg) {
    const dx = m.wrap.position.x - p.wrap.position.x, dz = m.wrap.position.z - p.wrap.position.z, d = Math.hypot(dx, dz);
    if (d > range + 0.8) return false;                                 // +0.8 ≈ รัศมีตัวมอน
    if (d < 0.01) return true;
    const [fx, fz] = fwd();
    return (dx * fx + dz * fz) / d >= Math.cos(arcDeg * Math.PI / 360);
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
    const pw = (ctx.Health && ctx.Health.player && ctx.Health.player.stats && ctx.Health.player.stats.power) || 1;   // สถิติผู้เล่นเก็บที่ health.js
    const dmg = Math.max(1, Math.round(w.stats.damage * cur.mult * pw));
    const arc = w.stats.arc * (sk.arcMult || 1);
    for (const m of ctx.mobs) {
      if (m.phase && m.phase !== 'alive') continue;
      if (!inCone(p, m, w.stats.range, arc)) continue;
      const dealt = ctx.Health ? ctx.Health.damage(m, dmg, { type: 'player', skill: cur.id, weapon: wId }) : 0;
      if (dealt > 0 && typeof Events !== 'undefined') Events.emit('combat:hit', { mob: m, amount: dealt, skill: cur.id, weapon: wId });
    }
  }

  function update(dt) {
    if (!ctx) return;
    const p = ctx.getPlayer();
    if (!cur) { if (comboT > 0) comboT -= dt; }
    else if (!p || p.dead || p.dashing) { cur = null; queue = null; comboT = 0; }     // ตาย/Dash ตัดท่าฟัน
    else {
      cur.t += dt;
      if (!cur.did && cur.t >= cur.sk.hitAt * cur.time) { cur.did = true; strike(); }
      if (cur.t >= cur.time) { comboT = cur.sk.comboWindow || 0; cur = null; }
    }
    if (queue) { queueT -= dt; if (queueT <= 0) queue = null; else if (!cur) { const q = queue; queue = null; use(q); } }
  }

  return { init, use, update, equip, registerWeapon, animStates: ANIM_STATES,
    get weapon() { return weapons && weapons[wId]; }, get weaponId() { return wId; },
    get stats() { return weapons && weapons[wId] && weapons[wId].stats; },
    get weapons() { return weapons; }, get skills() { return skills; } };
})();
