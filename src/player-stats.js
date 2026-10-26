// ===== src/player-stats.js — ระบบสถานะผู้เล่น, เลเวล, เงิน, สเตตัส, การอัปเกรดไร้ขีดจำกัด และอุปกรณ์สวมใส่ =====
// โครงสร้างแบบโมดูลาร์: คำนวณ Base + Upgrade Bonus + Equipment Buffs = Effective Stat
const PlayerStats = (() => {
  'use strict';

  const STORAGE_KEY = 'pleasefruit_player_stats_v1';

  // ค่าคอนฟิกเริ่มต้น (สามารถทับด้วย CFG.stats ใน config.js ได้)
  const DEFAULT_CONFIG = {
    startingMoney: 1000,
    startingWeapon: 'dagger',
    pointsPerLevel: 3,         // ได้รับ 3 Stat Points ทุกครั้งที่อัปเลเวล (เวล 1 พิเศษ: 0 พอยท์)
    pointCostPerUpgrade: 1,    // อัปเกรด 1 ครั้งใช้ 1 พอยท์สเตตัส (ไม่อัปด้วยเงิน)
    base: {
      maxHp: 100,
      maxStamina: 100,
      fistDamage: 10,
      fruitDamage: 15,
      swordDamage: 20,
      attackSpeed: 1.0,        // ตัวคูณความเร็วการฟัน
      attackCooldown: 1.0,     // ตัวคูณระยะคั่นการโจมตี
      skillCooldown: 1.0,      // ตัวคูณคูลดาวน์สกิล (1.0 = ปกติ, 0.9 = ลด 10%)
      walkSpeed: 9.0,
      runSpeed: 13.5,          // 9.0 * 1.5
      dashDistance: 5.5
    },
    upgradeBonus: {
      stamina: 5,              // +5 Max Stamina ต่อ 1 แต้ม
      fistDamagePerStamina: 1, // เพิ่มดาเมจหมัดต่อแต้ม Stamina
      hp: 5,                   // +5 Max HP ต่อ 1 แต้ม
      fruit: 5,                // +5 Fruit Damage ต่อ 1 แต้ม
      sword: 5                 // +5 Sword Damage ต่อ 1 แต้ม
    }
  };

  let cfg = DEFAULT_CONFIG;

  // ข้อมูลผู้เล่น (บันทึกลง localStorage)
  let state = {
    money: 1000,
    level: 1,
    xp: 0,
    statPoints: 0,             // พอยท์สำหรับอัปสเตตัส (เลเวล 1 กรณีพิเศษไม่ได้พอยท์)
    totalStatPoints: 0,        // พอยท์สะสมทั้งหมดจากเลเวล (เช่น LV 15 = 14 * 3 = 42 พอยท์)
    upgrades: {
      stamina: 0,
      hp: 0,
      fruit: 0,
      sword: 0
    },
    inventory: ['dagger'],
    equipped: {
      weapon: 'dagger',
      armor: null,
      accessory: null
    }
  };

  // แคชไอเทมที่สวมใส่อยู่ (ป้องกันการซ้อนทับซ้ำซ้อน)
  const equipmentRegistry = {};
  const listeners = {};

  // ---------- ระบบ Event ภายใน ----------
  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
  }

  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error('[player-stats] event error:', e); }
      });
    }
    if (typeof Events !== 'undefined' && Events.emit) {
      Events.emit(`stats:${event}`, data);
    }
  }

  // ---------- บันทึกและโหลดข้อมูล ----------
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[player-stats] Unable to save to localStorage:', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.money = Math.max(0, typeof parsed.money === 'number' ? parsed.money : cfg.startingMoney);
          state.level = Math.max(1, typeof parsed.level === 'number' ? parsed.level : 1);
          state.xp = Math.max(0, typeof parsed.xp === 'number' ? parsed.xp : 0);
          state.upgrades = Object.assign({ stamina: 0, hp: 0, fruit: 0, sword: 0 }, parsed.upgrades || {});
          // ป้องกันค่าอัปเกรดติดลบ
          for (const k in state.upgrades) {
            state.upgrades[k] = Math.max(0, parseInt(state.upgrades[k], 10) || 0);
          }

          // คำนวณพอยท์สเตตัสจากเลเวล: เลเวล 1 กรณีพิเศษไม่ได้พอยท์ (0 พอยท์)
          // ทุกการอัปเลเวล (เวล 2 ขึ้นไป) ได้ +3 พอยท์ (เช่น เวล 15 ได้ (15 - 1) * 3 = 42 พอยท์)
          const pointsPerLvl = cfg.pointsPerLevel || 3;
          const totalEarned = state.level > 1 ? (state.level - 1) * pointsPerLvl : 0;
          const spent = (state.upgrades.stamina || 0) + (state.upgrades.hp || 0) + (state.upgrades.fruit || 0) + (state.upgrades.sword || 0);
          state.totalStatPoints = totalEarned;

          if (state.level === 1) {
            // เลเวล 1 เป็นกรณีพิเศษ: ไม่ได้ค่าแสตตพ้อยท์อะไรเลย
            state.statPoints = 0;
            state.totalStatPoints = 0;
            state.upgrades = { stamina: 0, hp: 0, fruit: 0, sword: 0 };
          } else if (typeof parsed.statPoints === 'number' && parsed.statPoints >= 0) {
            state.statPoints = Math.min(parsed.statPoints, Math.max(0, totalEarned - spent));
          } else {
            state.statPoints = Math.max(0, totalEarned - spent);
          }

          if (Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
            state.inventory = parsed.inventory;
          } else {
            state.inventory = [cfg.startingWeapon || 'dagger'];
          }
          state.equipped = Object.assign({ weapon: cfg.startingWeapon || 'dagger', armor: null, accessory: null }, parsed.equipped || {});
          return true;
        }
      }
    } catch (e) {
      console.warn('[player-stats] Failed to load saved stats:', e);
    }
    // ค่าเริ่มต้นเลเวล 1: 0 พอยท์
    state.statPoints = 0;
    state.totalStatPoints = 0;
    return false;
  }

  // ---------- คำนวณ Equipment Buffs รวม ----------
  function getEquipmentModifiers() {
    const mods = {};
    for (const slot in state.equipped) {
      const item = equipmentRegistry[slot];
      if (item && item.modifiers) {
        for (const stat in item.modifiers) {
          mods[stat] = (mods[stat] || 0) + item.modifiers[stat];
        }
      }
    }
    return mods;
  }

  // ---------- คำนวณ Effective Stats ----------
  function getBreakdown(statKey) {
    const base = cfg.base[statKey] != null ? cfg.base[statKey] : 0;
    let upgrade = 0;
    const u = state.upgrades;

    if (statKey === 'maxStamina') {
      upgrade = u.stamina * cfg.upgradeBonus.stamina;
    } else if (statKey === 'fistDamage') {
      upgrade = u.stamina * cfg.upgradeBonus.fistDamagePerStamina;
    } else if (statKey === 'maxHp') {
      upgrade = u.hp * cfg.upgradeBonus.hp;
    } else if (statKey === 'fruitDamage') {
      upgrade = u.fruit * cfg.upgradeBonus.fruit;
    } else if (statKey === 'swordDamage') {
      upgrade = u.sword * cfg.upgradeBonus.sword;
    } else if (statKey === 'swordDamageBonus') {
      // โบนัสดาบล้วนๆ สำหรับบวกเข้ากับอาวุธประเภทดาบ
      upgrade = u.sword * cfg.upgradeBonus.sword;
    }

    const equipMods = getEquipmentModifiers();
    const equip = equipMods[statKey] || 0;

    let effective = base + upgrade + equip;

    // สำหรับค่าที่เป็นตัวคูณสเกล (เช่น Cooldown, Attack Speed)
    if (statKey === 'attackSpeed') {
      effective = base * Math.max(0.1, 1 + equip);
    } else if (statKey === 'attackCooldown') {
      effective = base * Math.max(0.2, 1 - equip);
    } else if (statKey === 'skillCooldown') {
      effective = base * Math.max(0.2, 1 - equip);
    }

    return { base, upgrade, equip, effective };
  }

  function get(statKey) {
    return getBreakdown(statKey).effective;
  }

  function getAll() {
    const keys = [
      'maxHp', 'maxStamina', 'fistDamage', 'fruitDamage', 'swordDamage',
      'attackSpeed', 'attackCooldown', 'skillCooldown', 'walkSpeed', 'runSpeed', 'dashDistance'
    ];
    const res = {};
    keys.forEach(k => {
      res[k] = getBreakdown(k);
    });
    return res;
  }

  // ---------- ซิงก์ค่ากับระบบเกมจริง (Health, Stamina, Movement) ----------
  function syncGameSystems() {
    const effMaxHp = get('maxHp');
    const effMaxStamina = get('maxStamina');
    const effDashDist = get('dashDistance');

    // 1. ซิงก์ Health ผู้เล่น
    if (typeof Health !== 'undefined' && Health.player) {
      if (typeof Health.setPlayerMaxHp === 'function') {
        Health.setPlayerMaxHp(effMaxHp);
      } else {
        Health.player.hpMax = effMaxHp;
        if (Health.player.hp > effMaxHp) Health.player.hp = effMaxHp;
        if (Health.player.hud) {
          Health.player.hud.txt.textContent = Math.ceil(Health.player.hp) + ' / ' + Health.player.hpMax;
        }
      }
    }

    // 2. ซิงก์ Stamina ผู้เล่น
    if (typeof window.Stamina !== 'undefined') {
      if (typeof window.Stamina.setMax === 'function') {
        window.Stamina.setMax(effMaxStamina);
      } else if (window.Stamina.cfg) {
        window.Stamina.cfg.max = effMaxStamina;
        if (window.Stamina.state && window.Stamina.state.value > effMaxStamina) {
          window.Stamina.state.value = effMaxStamina;
        }
      }
      if (window.Stamina.dash) {
        window.Stamina.dash.distance = effDashDist;
      }
    }

    emit('changed', getAll());
  }

  // ---------- ระบบเงินตรา (Currency) ----------
  function getCurrency() {
    return state.money;
  }

  function formatCurrency(val) {
    const n = val != null ? val : state.money;
    return n.toLocaleString('th-TH') + ' ' + (cfg.upgradeCost.currency || '฿');
  }

  function canAfford(amount) {
    return Number.isFinite(amount) && amount >= 0 && state.money >= amount;
  }

  function addCurrency(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    state.money += Math.floor(amount);
    save();
    emit('currency:changed', { money: state.money, delta: amount });
    return true;
  }

  function spendCurrency(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.floor(amount);
    if (state.money < cost) return false;
    state.money -= cost;
    save();
    emit('currency:changed', { money: state.money, delta: -cost });
    return true;
  }

  // ---------- เลเวล (LV) & XP ----------
  function getLevel() {
    return state.level;
  }

  function getXp() {
    return state.xp;
  }

  function getXpForNextLevel() {
    return state.level * 100;
  }

  function addXp(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    state.xp += Math.floor(amount);
    let leveledUp = false;
    const pointsPerLvl = cfg.pointsPerLevel || 3;
    while (state.xp >= getXpForNextLevel()) {
      state.xp -= getXpForNextLevel();
      const oldLevel = state.level;
      state.level += 1;
      // ทุกการอัปเลเวล (เวล 2 ขึ้นไป) ได้รับ +3 พอยท์
      state.statPoints = (state.statPoints || 0) + pointsPerLvl;
      state.totalStatPoints = (state.totalStatPoints || 0) + pointsPerLvl;
      leveledUp = true;
      emit('levelup', { level: state.level, oldLevel, pointsGained: pointsPerLvl, statPoints: state.statPoints });
    }
    save();
    emit('xp:changed', { xp: state.xp, level: state.level, statPoints: state.statPoints });
    if (leveledUp) {
      emit('statpoints:changed', { statPoints: state.statPoints });
    }
    return leveledUp;
  }

  // ปรับเลเวลผู้เล่นโดยตรง (เช่น เวล 15 ได้ (15 - 1) * 3 = 42 พอยท์)
  function setLevel(lvl) {
    const target = Math.max(1, Math.floor(lvl || 1));
    if (target === state.level) return;
    const oldLevel = state.level;
    state.level = target;
    const pointsPerLvl = cfg.pointsPerLevel || 3;
    const totalEarned = target > 1 ? (target - 1) * pointsPerLvl : 0;
    const spent = (state.upgrades.stamina || 0) + (state.upgrades.hp || 0) + (state.upgrades.fruit || 0) + (state.upgrades.sword || 0);
    state.totalStatPoints = totalEarned;
    state.statPoints = Math.max(0, totalEarned - spent);
    save();
    emit('levelup', { level: state.level, oldLevel, statPoints: state.statPoints });
    emit('statpoints:changed', { statPoints: state.statPoints });
    emit('changed', getAll());
    return state.level;
  }

  function addLevel(n) {
    return setLevel(state.level + (n || 1));
  }

  // ---------- ระบบพอยท์สเตตัส (Stat Points) ----------
  function getStatPoints() {
    return state.statPoints || 0;
  }

  function getTotalStatPoints() {
    return state.totalStatPoints || 0;
  }

  function addStatPoints(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    state.statPoints = (state.statPoints || 0) + Math.floor(amount);
    state.totalStatPoints = (state.totalStatPoints || 0) + Math.floor(amount);
    save();
    emit('statpoints:changed', { statPoints: state.statPoints });
    return true;
  }

  // ---------- การอัปเกรดด้วยพอยท์สเตตัส (Stat Point Upgrades - ไม่อัปด้วยเงิน) ----------
  function getUpgradeLevel(category) {
    return state.upgrades[category] || 0;
  }

  function getUpgradeCost(category) {
    // ใช้ 1 พอยท์สเตตัสต่อการอัปเกรด 1 ครั้ง (ไม่ใช้เงิน)
    return cfg.pointCostPerUpgrade || 1;
  }

  function canUpgrade(category) {
    return ['stamina', 'hp', 'fruit', 'sword'].includes(category) &&
      (state.statPoints || 0) >= getUpgradeCost(category);
  }

  function upgrade(category) {
    if (!['stamina', 'hp', 'fruit', 'sword'].includes(category)) return false;
    const cost = getUpgradeCost(category);
    if ((state.statPoints || 0) < cost) {
      emit('upgrade:failed', { category, reason: 'insufficient_points' });
      return false;
    }

    // หักพอยท์สเตตัส (เงินในกระเป๋า 1000 ฿ ไม่ถูกแตะต้อง)
    state.statPoints -= cost;
    state.upgrades[category] = (state.upgrades[category] || 0) + 1;
    save();
    syncGameSystems();
    emit('upgraded', { category, level: state.upgrades[category], remainingPoints: state.statPoints });
    emit('statpoints:changed', { statPoints: state.statPoints });
    return true;
  }

  // ---------- คลังอาวุธ & อุปกรณ์สวมใส่ (Inventory & Equipment) ----------
  function getInventory() {
    return [...state.inventory];
  }

  function hasWeapon(id) {
    return state.inventory.includes(id);
  }

  function unlockWeapon(id) {
    if (!id || state.inventory.includes(id)) return false;
    state.inventory.push(id);
    save();
    emit('inventory:added', { id });
    return true;
  }

  function getHotbar() {
    // ผู้เล่นเริ่มต้นด้วยดาบสั้น (dagger) เท่านั้น
    // อาวุธใน hotbar จะมาจาก inventory ที่ผู้เล่นปลดล็อกแล้ว
    return [...state.inventory];
  }

  function equipItem(slot, item) {
    if (!slot || !item || !item.id) return false;
    state.equipped[slot] = item.id;
    equipmentRegistry[slot] = item;
    save();
    syncGameSystems();
    emit('equipment:changed', { slot, item });
    return true;
  }

  function unequipItem(slot) {
    if (!slot || !state.equipped[slot]) return false;
    const prev = equipmentRegistry[slot];
    state.equipped[slot] = null;
    delete equipmentRegistry[slot];
    save();
    syncGameSystems();
    emit('equipment:changed', { slot, item: null, previous: prev });
    return true;
  }

  function getEquipped(slot) {
    return equipmentRegistry[slot] || null;
  }

  // ---------- เชื่อมต่อเหตุการณ์ในเกม (ฆ่ามอนสเตอร์ → ได้รับ XP) ----------
  function bindGameEvents() {
    if (typeof Events !== 'undefined' && Events.on) {
      Events.on('monster:killed', data => {
        const mob = data && data.mob;
        const hp = (mob && mob.hpMax) ? mob.hpMax : 25;
        const xp = Math.max(35, Math.round(hp * 1.5));
        addXp(xp);
      });
    }
  }

  // ---------- เริ่มต้นระบบ ----------
  function init(customCfg) {
    cfg = deepMerge(DEFAULT_CONFIG, customCfg || {});
    load();
    syncGameSystems();
    bindGameEvents();
  }

  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    for (const k in (source || {})) {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        out[k] = deepMerge(out[k] || {}, source[k]);
      } else {
        out[k] = source[k];
      }
    }
    return out;
  }

  // รีเซ็ตข้อมูลเป็นค่าเริ่มต้น (ใช้ทดสอบ)
  function reset() {
    state = {
      money: cfg.startingMoney,
      level: 1,
      xp: 0,
      statPoints: 0,
      totalStatPoints: 0,
      upgrades: { stamina: 0, hp: 0, fruit: 0, sword: 0 },
      inventory: [cfg.startingWeapon || 'dagger'],
      equipped: { weapon: cfg.startingWeapon || 'dagger', armor: null, accessory: null }
    };
    save();
    syncGameSystems();
    emit('reset', state);
  }

  return {
    init,
    get,
    getAll,
    getBreakdown,
    syncGameSystems,
    // Currency
    getCurrency,
    formatCurrency,
    canAfford,
    addCurrency,
    spendCurrency,
    // Level & Stat Points
    getLevel,
    setLevel,
    addLevel,
    getXp,
    getXpForNextLevel,
    addXp,
    getStatPoints,
    getTotalStatPoints,
    addStatPoints,
    // Upgrades
    getUpgradeLevel,
    getUpgradeCost,
    canUpgrade,
    upgrade,
    // Inventory & Equipment
    getInventory,
    hasWeapon,
    unlockWeapon,
    getHotbar,
    equipItem,
    unequipItem,
    getEquipped,
    getEquipmentModifiers,
    // Persistence & Events
    on,
    save,
    reset,
    getConfig: () => cfg,
    getState: () => JSON.parse(JSON.stringify(state))
  };
})();
