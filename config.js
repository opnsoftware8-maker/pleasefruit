// ===== config.js — แก้ค่า/แผนที่/ตำแหน่งของที่นี่ที่เดียว =====
const CFG = {
  base: 'assets/',
  faceOffset: 0,            // ตัวละครหันผิดทาง → ใส่ Math.PI
  speed: 6,
  cell: 4,                  // 1 ช่องแผนที่ = 4 หน่วย
  step: 2,                  // 1 ระดับความสูง = 2 หน่วย
  cam: { fov: Math.PI / 4, pitch: 50, dist: 30 },
  anims: ['characters/Rig_Medium_General.glb', 'characters/Rig_Medium_MovementBasic.glb'],
};

// ===== แผนที่ 45 x 30 ช่อง (แถวบนสุด = ทิศเหนือ) =====
// .=น้ำ  ,=หาดทราย(สูง0)  g=หญ้า(สูง2)  h=ที่สูงปราสาท(สูง4)  A=ที่สูงทราย(สูง4)
// ทางลาดเป็นลูกศรบอกทิศที่ "ยกสูงขึ้น":  ^ เหนือ  v ใต้  > ตะวันออก  < ตะวันตก
// ทางลาดต้องวางบนช่องฝั่งต่ำ ติดกับช่องฝั่งสูงต่างกัน 1 ระดับ
const R = (...s) => s.map(([c, n]) => c.repeat(n)).join('').padEnd(45, '.').slice(0, 45);
const MAP = [
  R(['.', 45]), R(['.', 45]), R(['.', 45]),
  R(['.', 6], ['h', 12], ['.', 6], ['A', 12]),
  R(['.', 5], ['h', 14], ['.', 3], ['A', 15]),
  R(['.', 4], ['h', 16], ['.', 2], ['A', 16]),
  R(['.', 4], ['h', 16], ['g', 2], ['A', 17]),
  R(['.', 4], ['h', 16], ['g', 2], ['A', 17]),
  R(['.', 4], ['h', 16], ['g', 2], ['A', 17]),
  R(['.', 4], ['h', 16], ['g', 2], ['A', 17]),
  R(['.', 3], ['g', 7], ['^', 2], ['g', 16], ['^', 2], ['g', 9]),      // ทางขึ้นปราสาท + ทางขึ้นศาลา
  R(['.', 3], ['g', 36]),
  R(['.', 3], ['g', 36]),
  R(['.', 3], ['g', 7], ['.', 3], ['g', 26]),                          // บ่อน้ำ
  R(['.', 3], ['g', 7], ['.', 3], ['g', 26]),
  R(['.', 3], ['g', 36]),                                              // แถวนี้มีจุดเกิด (0,0)
  R(['.', 3], ['g', 36]),
  R(['.', 3], ['g', 36]),
  R(['.', 3], ['g', 36]),
  R(['.', 2], [',', 6], ['^', 2], [',', 10], ['^', 2], [',', 10], ['^', 2], [',', 6]), // ทางลงหาด 3 จุด
  R(['.', 2], [',', 38]),
  R(['.', 3], [',', 36]),
  R(['.', 3], [',', 36]),
  R(['.', 5], [',', 32]),
  R(['.', 8], [',', 26]),
  R(['.', 45]), R(['.', 45]), R(['.', 45]), R(['.', 45]), R(['.', 45]),
];

// f = path ใต้ assets/, s = สเกล, r = รัศมีชน (ไม่ใส่ = เดินทะลุได้)
const PREFABS = {
  knight:    { f: 'characters/Knight.glb', s: 1, char: true },
  rogue:     { f: 'characters/Rogue.glb', s: 1, char: true },
  barbarian: { f: 'characters/Barbarian.glb', s: 1, char: true },
  mage:      { f: 'characters/Mage.glb', s: 1, char: true },
  barrel:  { f: 'world/pirate/barrel.glb', s: 1.2, r: 0.7 },
  crate:   { f: 'world/pirate/crate.glb', s: 1.2, r: 0.7 },
  crateB:  { f: 'world/pirate/crate-bottles.glb', s: 1.2, r: 0.7 },
  palmBend:{ f: 'world/pirate/palm-bend.glb', s: 1, r: 0.5 },
  palmStr: { f: 'world/pirate/palm-straight.glb', s: 1, r: 0.5 },
  wall:    { f: 'world/pirate/castle-wall.glb', s: 1, r: 1.2 },
  wallWin: { f: 'world/pirate/castle-window.glb', s: 1, r: 1.2 },
  gate:    { f: 'world/pirate/castle-gate.glb', s: 1 },
  tower:   { f: 'world/pirate/tower-complete-large.glb', s: 1, r: 1.9 },
  roof:    { f: 'world/pirate/structure-roof.glb', s: 1.8 },
  house:   { f: 'world/pirate/structure.glb', s: 1.6, r: 2.2 },
  rockA:   { f: 'world/pirate/rocks-a.glb', s: 0.7, r: 1.6 },
  rockB:   { f: 'world/pirate/rocks-b.glb', s: 0.7, r: 1.6 },
  rockSA:  { f: 'world/pirate/rocks-sand-a.glb', s: 0.7, r: 1.6 },
  rockSB:  { f: 'world/pirate/rocks-sand-b.glb', s: 0.7, r: 1.6 },
  ship:    { f: 'world/pirate/ship-pirate-medium.glb', s: 1 },
  wreck:   { f: 'world/pirate/ship-wreck.glb', s: 1 },
  tent:    { f: 'world/camp/Tent.glb', s: 2.5, r: 1.5 },
  target:  { f: 'world/camp/target.glb', s: 2.5, r: 0.7 },
  pine:    { f: 'world/camp/Tree-high.glb', s: 2.2, r: 0.5 },
  tree:    { f: 'world/camp/tree.glb', s: 2, r: 0.5 },
};

// บลูพรินต์ปราสาท: กว้าง 24 ลึก 16 รอบจุดกลาง (cx,cz) ประตูอยู่ด้านใต้
// ถ้าประตูหันผิดด้าน เปลี่ยน Math.PI ของ 'gate' เป็น 0
function castle(cx, cz) {
  const o = [], add = (k, x, z, h) => o.push([k, cx + x, cz + z, h]);
  for (const s of [-1, 1]) for (let x = 3; x <= 11; x += 2) add('wall', s * x, -8, Math.PI);
  add('gate', 0, -8, Math.PI);
  for (let x = -11; x <= 11; x += 2) add(Math.abs(x) < 2 ? 'wallWin' : 'wall', x, 8, 0);
  for (const s of [-1, 1]) for (let z = -6; z <= 6; z += 2) add('wall', s * 12, z, Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('tower', sx * 12, sz * 8, 0);
  return o;
}

// [prefab, x, z, หันหน้า(0=เหนือ, PI=ใต้), tag]   — ความสูง y คำนวณจากแผนที่ให้เอง
const PLACE = [
  ...castle(-46, 34),
  // โซน NPC บนที่สูงทราย
  ['mage', 32, 32, Math.PI, 'npc'], ['roof', 32, 37, 0], ['house', 24, 38, Math.PI],
  ['barrel', 28, 31, 0], ['crate', 36, 31, 0.4], ['crateB', 37.2, 32.2, 1],
  ['palmStr', 12, 42, 0], ['palmBend', 52, 42, 0], ['palmStr', 56, 28, 0], ['palmBend', 10, 28, 0],
  // โซนทดสอบ (ลานหญ้าขวา)
  ['barbarian', 44, 0, Math.PI, 'dummy'],
  ['target', 36, -6, Math.PI], ['target', 52, -6, Math.PI], ['target', 44, 9, Math.PI],
  ['pine', 62, 10, 0], ['pine', 62, -8, 0],
  // โซนมอนสเตอร์ (ป่าซ้าย)
  ['rogue', -60, 4, Math.PI, 'mob'], ['rogue', -60, -8, Math.PI, 'mob'],
  ['barbarian', -30, 8, Math.PI, 'mob'], ['rogue', -24, -6, Math.PI, 'mob'],
  ['tent', -72, 10, 0.6], ['tent', -68, 5, -0.4], ['barrel', -70, 8, 0],
  // เรือในทะเล
  ['ship', 80, -6, Math.PI / 2], ['wreck', -20, -48, 0.5],
];

// สุ่มวางของตกแต่ง (เฉพาะช่องพื้นเรียบที่ไม่ติดหน้าผา/ทางลาด)
// [prefab, จำนวน, x1, z1, x2, z2, seed]
const SCATTER = [
  ['pine', 24, -76, -14, -12, 16, 11], ['tree', 10, -76, -14, -12, 16, 23],
  ['rockA', 3, -70, -12, -14, 14, 5], ['rockB', 2, -70, -12, -14, 14, 8],
  ['pine', 8, 28, -12, 64, 16, 17],
  ['palmStr', 9, -72, -34, 62, -20, 7], ['palmBend', 9, -72, -34, 62, -20, 13],
  ['rockSA', 3, -60, -34, 50, -22, 3], ['rockSB', 3, -60, -34, 50, -22, 4],
];

// ชื่อโซนบน HUD (วงกลมรัศมี r)
const ZONES = [
  { name: 'โซนบอส (ปราสาท)', x: -46, z: 34, r: 20 },
  { name: 'โซน NPC / สุ่มผล', x: 32, z: 34, r: 20 },
  { name: 'โซนมอนสเตอร์', x: -42, z: 0, r: 26 },
  { name: 'โซนทดสอบสกิล', x: 44, z: 0, r: 20 },
  { name: 'ชายหาด', x: 0, z: -28, r: 34 },
];
