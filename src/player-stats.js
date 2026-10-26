// ===== src/player-stats.js — ระบบแต้มสถิติผู้เล่น (ข้อมูล + แต้ม + อัปเกรด + รีเซ็ต) =====
// ไม่มี UI ในไฟล์นี้ (UI อยู่ที่ src/player-stats-ui.js)
//
// กติกา
//   สถิติ: melee / health / fruit / sword เริ่มที่ 1 ทุกตัว ไม่มีเพดาน
//   แต้มรวม = (Level - 1) × 3   |   แต้มที่ใช้ได้ = แต้มรวม - แต้มที่ใช้ไป (แต้มที่ใช้ = ผลรวมของ (สถิติ - 1))
//   โบนัสต่อ 1 แต้ม (นับจากแต้มที่ใส่เพิ่ม คือ (สถิติ - 1) → Level 1 เกมเล่นเหมือนเดิมทุกอย่าง):
//     Melee  → +5 Max Stamina และ +5 ดาเมจหมัด/อาวุธประชิด
//     Health → +5 Max HP
//     Fruit  → +5 ดาเมจ Devil Fruit
//     Sword  → +5 ดาเมจดาบ
//
// ใช้จากระบบอื่น
//   PlayerStats.setLevel(n) / addLevel(n)   ← ระบบ EXP/เลเวลในอนาคตเรียกอันนี้ (หรือ Events.emit('player:level', { level }))
//   PlayerStats.damageBonus(weaponId)       ← combat.js เรียก (บวกเข้า stats.damage ของอาวุธ)
//   PlayerStats.fruitDamage()               ← สกิล Devil Fruit ในอนาคตเรียก (ตอนนี้ในเกมยังไม่มีสกิลผลปีศาจ)
//   PlayerStats.upgrade('melee') / reset()  ← UI เรียก
//   PlayerStats.onChange(fn)                ← ฟังเมื่อค่าเปลี่ยน   |  Events 'stats:changed' ก็ส่งให้
const PlayerStats = (() => {
  const KEYS = ['melee', 'health', 'fruit', 'sword'];
  const DEF = {
    pointsPerLevel: 3,
    perPoint: { staminaMax: 5, meleeDamage: 5, maxHp: 5, fruitDamage: 5, swordDamage: 5 },
    weaponClass: { dagger: 'melee', dualAxe: 'melee', sword: 'sword' },
    debugLevelUp: false,
  };

  let cfg = DEF, H = null, S = null, ready = false;
  let level = 1;
  const stats = { melee: 1, health: 1, fruit: 1, sword: 1 };
  const base = { hp: 100, stamina: 100 };      // ค่าพื้นฐานก่อนบวกสถิติ (อ่านจาก Health / Stamina ตอน init)
  const listeners = [];

  const spent = () => KEYS.reduce((n, k) => n + (stats[k] - 1), 0);
  const total = () => Math.max(0, (level - 1) * cfg.pointsPerLevel);
  const available = () => Math.max(0, total() - spent());

  // ---------- ใส่ผลของสถิติลงในระบบเดิม (HP / Stamina) ----------
  function apply() {
    if (!ready) return;
    const hpMax = base.hp + (stats.health - 1) * cfg.perPoint.maxHp;
    if (H && H.setPlayerMaxHp) H.setPlayerMaxHp(hpMax);                  // health.js: ปรับ Max HP + เติมเลือดส่วนที่เพิ่ม + วาดแถบใหม่
    const stMax = base.stamina + (stats.melee - 1) * cfg.perPoint.staminaMax;
    if (S && S.cfg) {
      const diff = stMax - S.cfg.max;
      S.cfg.max = stMax;                                                // game.js อ่าน Stamina.cfg.max ทุกเฟรม (แถบ + ฟื้น)
      if (diff > 0 && S.add) S.add(diff);                               // เพิ่ม Max → เติมส่วนที่เพิ่มให้เลย (เหมือน HP)
      else if (S.state && S.state.value > stMax) S.state.value = stMax;
    }
  }

  function changed() {
    apply();
    const snap = snapshot();
    listeners.forEach(fn => { try { fn(snap); } catch (e) { console.error(e); } });
    if (typeof Events !== 'undefined' && Events.emit) Events.emit('stats:changed', snap);
  }

  // ---------- API ----------
  function snapshot() {
    return { level, stats: Object.assign({}, stats), total: total(), spent: spent(), available: available() };
  }

  function init(o) {   // o = { Health, Stamina, cfg }  — เรียกหลัง Health.bindPlayer / สร้าง Stamina แล้ว (game.js ทำให้)
    o = o || {};
    const c = o.cfg || {};
    cfg = Object.assign({}, DEF, c, { perPoint: Object.assign({}, DEF.perPoint, c.perPoint || {}), weaponClass: Object.assign({}, DEF.weaponClass, c.weaponClass || {}) });
    H = o.Health || (typeof Health !== 'undefined' ? Health : null);
    S = o.Stamina || window.Stamina || null;
    if (H && H.player && H.player.hpMax) base.hp = H.player.hpMax;      // 100 จาก CFG.player.hp
    if (S && S.cfg) base.stamina = S.cfg.max;                           // 1000 จาก CFG.stamina.max
    ready = true;
    // ระบบเลเวลในอนาคตส่งข่าวนี้มาได้เลย: Events.emit('player:level', { level: 5 })
    if (typeof Events !== 'undefined' && typeof Events.on === 'function') Events.on('player:level', d => { if (d && d.level) setLevel(d.level); });
    changed();
    return api;
  }

  function setLevel(n) {
    n = Math.max(1, Math.floor(+n || 1));
    if (n === level) return;
    level = n;
    if (spent() > total()) { KEYS.forEach(k => { stats[k] = 1; }); }   // เลเวลลดจนแต้มไม่พอ → รีเซ็ตให้ถูกต้อง
    changed();
    if (typeof Events !== 'undefined' && Events.emit) Events.emit('player:levelup', { level });
  }
  const addLevel = (n = 1) => setLevel(level + n);

  function upgrade(key, n = 1) {
    if (!KEYS.includes(key) || available() < n || n < 1) return false;
    stats[key] += n;
    changed();
    return true;
  }

  function reset() {   // ทุกสถิติกลับเป็น 1 แต้มคืนครบ
    KEYS.forEach(k => { stats[k] = 1; });
    changed();
  }

  // ---------- ค่าที่ระบบอื่นอ่าน ----------
  const weaponClassOf = id => cfg.weaponClass[id] || 'melee';
  function damageBonus(weaponId) {   // โบนัสดาเมจแบบบวกตรง (flat) ต่ออาวุธ — ดาบ = Sword, อาวุธประชิดอื่น = Melee
    return weaponClassOf(weaponId) === 'sword'
      ? (stats.sword - 1) * cfg.perPoint.swordDamage
      : (stats.melee - 1) * cfg.perPoint.meleeDamage;
  }
  const fruitDamage = () => (stats.fruit - 1) * cfg.perPoint.fruitDamage;

  const api = {
    KEYS, init, setLevel, addLevel, upgrade, reset, damageBonus, fruitDamage, snapshot,
    get level() { return level; }, get stats() { return stats; },
    get available() { return available(); }, get total() { return total(); }, get spent() { return spent(); },
    get cfg() { return cfg; },
    onChange: fn => { listeners.push(fn); },
  };
  return api;
})();
window.PlayerStats = PlayerStats;
