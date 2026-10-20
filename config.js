// ===== config.js — แก้ค่า/แผนที่/ตำแหน่งของที่นี่ที่เดียว =====
const CFG = {
  base: 'assets/',
  faceOffset: 0,            // ตัวละครหันผิดทาง → ใส่ Math.PI
  speed: 6,
  cell: 4,                  // 1 ช่องแผนที่ = 4 หน่วย
  step: 2,                  // 1 ระดับความสูง = 2 หน่วย
  cam: { fov: Math.PI / 2, pitch: 70, dist: 50 },
  anims: ['characters/Rig_Medium_General.glb', 'characters/Rig_Medium_MovementBasic.glb'],
};

// ===== แผนที่ 45 x 30 ช่อง (แถวบนสุด = ทิศเหนือ, 1 ช่อง = 4 หน่วย) =====
// .=น้ำ  ,=หาดทราย(สูง0)  g=หญ้า(สูง2)  h=ที่สูงปราสาท(สูง4)  A=ที่สูงทราย(สูง4)
// ^ v > < = ทางลาด (ลูกศรชี้ทิศที่ยกสูงขึ้น วางบนช่องฝั่งต่ำ)
// '=' สะพานข้ามน้ำ (ห้ามวางติดกันสองช่อง)   p = สะพานท่าเรือ (เดินได้เหนือน้ำ)
const R = (...s) => s.map(([c, n]) => c.repeat(n)).join('').padEnd(45, '.').slice(0, 45);
const W = R(['.', 45]);
const MAP = [
  W, W, W,
  R(['.', 7], ['h', 10], ['.', 7], ['A', 10]),
  R(['.', 6], ['h', 13], ['.', 4], ['A', 13]),
  R(['.', 5], ['h', 15], ['.', 2], ['A', 16]),
  R(['.', 4], ['h', 16], ['g', 2], ['A', 17]),
  R(['.', 3], ['h', 17], ['g', 2], ['A', 17]),
  R(['.', 3], ['h', 17], ['g', 2], ['A', 18]),
  R(['.', 4], ['h', 16], ['g', 2], ['A', 17]),
  R(['.', 3], ['g', 7], ['^', 2], ['g', 16], ['^', 2], ['g', 10]),            // ทางขึ้นปราสาท + ที่สูงทราย
  R([',', 2], ['.', 1], ['g', 23], ['.', 1], ['g', 13]),                      // เกาะเล็กซ้าย + แม่น้ำ (คอลัมน์ 26)
  R([',', 2], ['.', 1], ['g', 23], ['.', 1], ['g', 13]),
  R(['.', 3], ['g', 7], ['.', 3], ['g', 13], ['.', 1], ['g', 12]),            // บ่อน้ำ
  R(['.', 3], ['g', 7], ['.', 3], ['g', 13], ['=', 1], ['g', 12]),            // สะพานข้ามแม่น้ำ
  R(['.', 3], ['g', 23], ['.', 1], ['g', 12]),                                // แถวนี้มีจุดเกิด (0,0)
  R(['.', 3], ['g', 23], ['.', 1], ['g', 12]),
  R(['.', 3], ['g', 23], ['.', 1], ['g', 12]),
  R(['.', 3], ['g', 23], ['.', 1], ['g', 11]),
  R(['.', 2], [',', 6], ['^', 2], [',', 10], ['^', 2], [',', 4], ['.', 1], [',', 4], ['^', 2], [',', 4]),  // ทางลงหาด
  R(['.', 2], [',', 24], ['.', 1], [',', 12]),
  R(['.', 3], [',', 23], ['=', 1], [',', 11]),                                // สะพานบนหาด
  R(['.', 3], [',', 23], ['.', 1], [',', 11]),
  R(['.', 5], [',', 21], ['.', 1], [',', 9]),
  R(['.', 8], [',', 18], ['.', 1], [',', 6]),
  R(['.', 14], ['p', 1], ['.', 5], ['p', 1], ['.', 17], [',', 2]),            // ท่าเรือ 2 แห่ง + เกาะเล็กขวาล่าง
  R(['.', 14], ['p', 1], ['.', 5], ['p', 1], ['.', 17], [',', 2]),
  R(['.', 14], ['p', 1]),
  W, W,
];

// f = path ใต้ assets/, s = สเกล, r = รัศมีชน, dy = ยกขึ้น/ลง, flat = วางเฉพาะพื้นเรียบ
const PREFABS = {
  knight: { f: 'characters/Knight.glb', s: 1, char: true },
  rogue: { f: 'characters/Rogue.glb', s: 1, char: true },
  barbarian: { f: 'characters/Barbarian.glb', s: 1, char: true },
  mage: { f: 'characters/Mage.glb', s: 1, char: true },
  barrel: { f: 'world/pirate/barrel.glb', s: 1.2, r: 0.7 },
  crate: { f: 'world/pirate/crate.glb', s: 1.2, r: 0.7 },
  crateB: { f: 'world/pirate/crate-bottles.glb', s: 1.2, r: 0.7 },
  palmBend: { f: 'world/pirate/palm-bend.glb', s: 1, r: 0.5 },
  palmStr: { f: 'world/pirate/palm-straight.glb', s: 1, r: 0.5 },
  palmDB: { f: 'world/pirate/palm-detailed-bend.glb', s: 1, r: 0.5 },
  palmDS: { f: 'world/pirate/palm-detailed-straight.glb', s: 1, r: 0.5 },
  wall: { f: 'world/pirate/castle-wall.glb', s: 1, r: 1.2 },
  wallWin: { f: 'world/pirate/castle-window.glb', s: 1, r: 1.2 },
  gate: { f: 'world/pirate/castle-gate.glb', s: 1 },
  tower: { f: 'world/pirate/tower-complete-large.glb', s: 1, r: 1.9 },
  tBase: { f: 'world/pirate/tower-base.glb', s: 1, r: 1.8 },
  tMidW: { f: 'world/pirate/tower-middle-windows.glb', s: 1 },
  tTop: { f: 'world/pirate/tower-top.glb', s: 1 },
  tRoof: { f: 'world/pirate/tower-roof.glb', s: 1 },
  roof: { f: 'world/pirate/structure-roof.glb', s: 1.8 },
  house: { f: 'world/pirate/structure.glb', s: 1.6, r: 2.2 },
  mast: { f: 'world/pirate/mast.glb', s: 1, r: 1 },
  flagH: { f: 'world/pirate/flag-high.glb', s: 1 },
  flagP: { f: 'world/pirate/flag-pirate.glb', s: 1 },
  flagN: { f: 'world/pirate/flag-pennant.glb', s: 1 },
  plank: { f: 'world/pirate/platform-planks.glb', s: 1.5, dy: -0.6 },
  platform: { f: 'world/pirate/platform.glb', s: 2, r: 1 },
  rockA: { f: 'world/pirate/rocks-a.glb', s: 0.7, r: 1.6 },
  rockB: { f: 'world/pirate/rocks-b.glb', s: 0.7, r: 1.6 },
  rockC: { f: 'world/pirate/rocks-c.glb', s: 0.8, r: 1.4 },
  rockSA: { f: 'world/pirate/rocks-sand-a.glb', s: 0.7, r: 1.6 },
  rockSB: { f: 'world/pirate/rocks-sand-b.glb', s: 0.7, r: 1.6 },
  rockSC: { f: 'world/pirate/rocks-sand-c.glb', s: 0.8, r: 1.4 },
  grass: { f: 'world/pirate/grass.glb', s: 2.5 },
  ship: { f: 'world/pirate/ship-pirate-medium.glb', s: 1 },
  shipL: { f: 'world/pirate/ship-pirate-large.glb', s: 1 },
  wreck: { f: 'world/pirate/ship-wreck.glb', s: 1 },
  tent: { f: 'world/camp/Tent.glb', s: 2.5, r: 1.5 },
  target: { f: 'world/camp/target.glb', s: 2.5, r: 0.7 },
  pine: { f: 'world/camp/Tree-high.glb', s: 2.2, r: 0.5 },
  tree: { f: 'world/camp/tree.glb', s: 2, r: 0.5 },
  fence: { f: 'world/camp/fence.glb', s: 3, r: 1.0 },
  bridge: { f: 'world/camp/bridge.glb', s: 4 },      // วางอัตโนมัติบนช่อง '=' (ปรับ dy ถ้าสูง/ต่ำเกิน)
  dirt: { f: 'world/camp/patch-dirt.glb', s: 4, dy: 0.02, flat: true },
};

// ===== ตัวช่วยวางเป็นกลุ่ม =====
// บลูพรินต์ปราสาท: กว้าง 24 ลึก 16 ประตูอยู่ด้านใต้ (ประตูหันผิดด้าน → เปลี่ยน Math.PI ของ 'gate' เป็น 0)
function castle(cx, cz) {
  const o = [], add = (k, x, z, h, t, dy) => o.push([k, cx + x, cz + z, h, t, dy]);
  for (const s of [-1, 1]) for (let x = 3; x <= 11; x += 2) add('wall', s * x, -8, Math.PI);
  add('gate', 0, -8, Math.PI);
  for (let x = -11; x <= 11; x += 2) add(Math.abs(x) < 2 ? 'wallWin' : 'wall', x, 8, 0);
  for (const s of [-1, 1]) for (let z = -6; z <= 6; z += 2) add('wall', s * 12, z, Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('tower', sx * 12, sz * 8, 0);
  // หอกลาง (ซ้อนชิ้นส่วนขึ้นไป)
  add('tBase', -6, 3, 0, undefined, 0); add('tMidW', -6, 3, 0, undefined, 2);
  add('tTop', -6, 3, 0, undefined, 4); add('tRoof', -6, 3, 0, undefined, 6.78);
  add('flagH', -2.5, -10.5, 0); add('flagH', 2.5, -10.5, 0);
  add('barrel', 6, 5, 0); add('crate', 8, 4, 0.5); add('crateB', 8, 6.2, 1);
  return o;
}
function line(k, ax, az, bx, bz, gap, rot) {
  const o = [], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / gap));
  const h = rot ? (Math.abs(bz - az) > Math.abs(bx - ax) ? Math.PI / 2 : 0) : 0;
  for (let j = 0; j <= n; j++) o.push([k, ax + (bx - ax) * j / n, az + (bz - az) * j / n, h]);
  return o;
}
const fence = (ax, az, bx, bz) => line('fence', ax, az, bx, bz, 3.3, true);
const path = (...p) => p.slice(1).flatMap((q, k) => line('dirt', p[k][0], p[k][1], q[0], q[1], 4, false));

// [prefab, x, z, หันหน้า(0=เหนือ, PI=ใต้), tag, dy]  — ความสูง y คำนวณจากแผนที่ให้เอง
const PLACE = [
  ...path([-46, 24], [-46, 10], [-34, 10], [-34, 2], [60, 2]),   // ทางดินจากปราสาท ข้ามสะพาน ไปลานทดสอบ
  ...path([26, 24], [26, 2]),                                    // จากที่สูงทราย ลงมาบรรจบ
  ...path([-8, 2], [-8, -30], [-32, -36]),                       // ลงหาดไปท่าเรือ
  ...castle(-46, 34),
  // ที่สูงทราย (NPC)
  ['mage', 32, 32, Math.PI, 'npc'], ['roof', 32, 37, 0], ['house', 24, 38, Math.PI], ['house', 41, 39, Math.PI],
  ['barrel', 28, 31, 0], ['crate', 36, 31, 0.4], ['crateB', 37.2, 32.2, 1],
  ['flagN', 29, 40, 0], ['flagN', 35, 40, 0], ['tower', 50, 38, 0],
  ['palmDS', 12, 42, 0], ['palmDB', 52, 33, 0], ['palmStr', 58, 28, 0], ['palmBend', 10, 28, 0],
  // ลานทดสอบ (ขวา)
  ['barbarian', 44, 0, Math.PI, 'dummy'],
  ['target', 36, -6, Math.PI], ['target', 52, -6, Math.PI], ['target', 44, 9, Math.PI], ['target', 30, 6, Math.PI],
  ...fence(24, 13, 62, 13), ...fence(61, 13, 61, -10),
  ['tent', 58, -12, 2.5], ['barrel', 55, -12, 0], ['pine', 38, 10, 0],
  // ป่า + แคมป์มอนสเตอร์ (ซ้าย)
  ['rogue', -66, -6, Math.PI, 'mob'], ['rogue', -56, -12, Math.PI, 'mob'], ['barbarian', -44, -8, Math.PI, 'mob'],
  ['rogue', -28, -4, Math.PI, 'mob'], ['barbarian', -20, 10, Math.PI, 'mob'],
  ['tent', -72, 12, 0.6], ['tent', -66, 8, -0.4], ['barrel', -69, 10, 0], ['platform', -60, 10, 0.3], ['crate', -60, 10.3, 0],
  ...fence(-76, 14, -60, 14),
  // หาด + ท่าเรือ
  ['house', -36, -30, 0], ['mast', -26, -29, 0], ['flagP', -24, -30, 0],
  ['barrel', -34, -27, 0], ['crate', -31, -28, 0.7], ['crateB', -39, -27, 0.2], ['barrel', 14, -34, 0],
  ['mast', 4, -34, 1], ['crate', 8, -33, 0.3],
  // เกาะเล็ก + เรือ
  ['rockSA', -86, 12, 0], ['palmBend', -87.5, 10.5, 0], ['rockSB', 66, -46, 0], ['palmStr', 64, -44, 0],
  ['shipL', 78, 2, Math.PI / 2], ['ship', 30, -50, 0.3], ['wreck', -5, -52, 0.5],
];

// สุ่มวางของตกแต่ง (เฉพาะช่องพื้นเรียบที่ไม่ติดหน้าผา/ทางลาด)  [prefab, จำนวน, x1, z1, x2, z2, seed]
const SCATTER = [
  ['pine', 14, -76, -14, -12, 16, 11], ['tree', 6, -76, -14, -12, 16, 23],
  ['rockA', 3, -76, -14, -12, 16, 5], ['rockB', 2, -76, -14, -12, 16, 8], ['rockC', 3, -76, -14, -12, 16, 9],
  ['pine', 5, 28, -12, 64, 16, 17], ['rockC', 2, 28, -12, 64, 16, 19],
  ['palmStr', 6, -72, -34, 62, -20, 7], ['palmBend', 6, -72, -34, 62, -20, 13],
  ['palmDS', 3, -72, -34, 62, -20, 31], ['palmDB', 3, -72, -34, 62, -20, 37],
  ['rockSA', 3, -60, -34, 50, -22, 3], ['rockSB', 3, -60, -34, 50, -22, 4], ['rockSC', 3, -60, -34, 50, -22, 6],
  ['rockSA', 3, 4, 24, 56, 44, 41],
  ['grass', 28, -76, -14, 64, 16, 51], ['grass', 12, 4, 24, 56, 44, 53],
];

// ชื่อโซนบน HUD (วงกลมรัศมี r)
const ZONES = [
  { name: 'โซนบอส (ปราสาท)', x: -46, z: 34, r: 20 },
  { name: 'โซน NPC / สุ่มผล', x: 32, z: 34, r: 20 },
  { name: 'โซนมอนสเตอร์', x: -42, z: 0, r: 26 },
  { name: 'โซนทดสอบสกิล', x: 44, z: 0, r: 20 },
  { name: 'ชายหาด', x: 0, z: -28, r: 34 },
];
