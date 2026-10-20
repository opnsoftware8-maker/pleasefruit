// ===== config.js — แก้ค่าตรงนี้ที่เดียว ไม่ต้องแตะ game.js =====
const CFG = {
  base: 'assets/',
  faceOffset: 0,          // ถ้าตัวละครหันหลังให้ทิศที่เดิน เปลี่ยนเป็น Math.PI
  speed: 6,
  half: 30,               // ครึ่งหนึ่งของความกว้างเกาะ (จำกัดไม่ให้เดินตกทะเล)
  cam: { fov: Math.PI / 2, pitch: 50, dist: 13 },  // FOV 90°, เงยมอง 50°, กล้องอยู่ทิศใต้
  // ไฟล์แอนิเมชัน KayKit (ไม่มีก็ได้ เกมยังรัน แต่ตัวละครจะยืนนิ่ง)
  anims: ['characters/rig_medium_general.glb', 'characters/rig_medium_movementbasic.glb'],
};

// f = path ใต้ assets/, s = สเกล (ปรับเองถ้าชิ้นไหนใหญ่/เล็กไป), char = ตัวละคร
const PREFABS = {
  knight:    { f: 'characters/Knight.glb',    s: 1, char: true },
  rogue:     { f: 'characters/Rogue.glb',     s: 1, char: true },
  barbarian: { f: 'characters/Barbarian.glb', s: 1, char: true },
  mage:      { f: 'characters/Mage.glb',      s: 1, char: true },
  sand:      { f: 'world/pirate/patch-sand-foliage.glb', s: 2 },
  grass:     { f: 'world/pirate/patch-grass.glb',        s: 2 },
  palmBend:  { f: 'world/pirate/palm-bend.glb',          s: 1.5 },
  palmStr:   { f: 'world/pirate/palm-straight.glb',      s: 1.5 },
  wall:      { f: 'world/pirate/castle-wall.glb',        s: 2 },
  wallWin:   { f: 'world/pirate/castle-window.glb',      s: 2 },
  roof:      { f: 'world/pirate/structure-roof.glb',     s: 2 },
  target:    { f: 'world/camp/target.glb',   s: 1.5 },
  tent:      { f: 'world/camp/tent.glb',     s: 2 },
  pine:      { f: 'world/camp/tree-high.glb', s: 2 },
};

// โซนของเกาะ (พื้นสี่เหลี่ยม 22x22)
const ZONES = [
  { name: 'โซนทดสอบสกิล',   x: -20, z: -14, color: '#8fbf6a' },
  { name: 'โซนมอนสเตอร์',   x:  20, z: -14, color: '#d9b97a' },
  { name: 'โซน NPC / สุ่มผล', x: -20, z:  14, color: '#7fc0c8' },
  { name: 'โซนบอส',         x:  20, z:  14, color: '#a98ab8' },
];

// [prefab, x, z, หันหน้า(เรเดียน: 0=ทิศเหนือ, PI=ทิศใต้), tag]
const PLACE = [
  ['grass', 0, 0, 0],
  // ทดสอบ
  ['barbarian', -20, -14, Math.PI, 'dummy'],
  ['target', -26, -19, Math.PI], ['target', -14, -19, Math.PI],
  ['tent', -27, -8, 0.5],
  ['pine', -13, -8, 0], ['pine', -27, -20, 0],
  // มอนสเตอร์
  ['sand', 20, -14, 0],
  ['rogue', 16, -12, Math.PI, 'mob'], ['rogue', 24, -16, Math.PI, 'mob'], ['barbarian', 20, -8, Math.PI, 'mob'],
  ['palmBend', 27, -9, 0], ['palmStr', 13, -20, 0],
  // NPC
  ['sand', -20, 14, 0],
  ['roof', -20, 19, 0],
  ['mage', -20, 15, Math.PI, 'npc'],
  ['palmBend', -27, 9, 0], ['palmStr', -13, 9, 0],
  // บอส (ผนังปราสาทด้านหลังแท่นเรียกบอส)
  ['wall', 14, 24, 0], ['wallWin', 20, 24, 0], ['wall', 26, 24, 0],
];
   
