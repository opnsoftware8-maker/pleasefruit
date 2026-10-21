// ===== config.js — แก้ค่า/แผนที่/ตำแหน่งของที่นี่ที่เดียว =====
const CFG = {
  base: 'assets/',
  faceOffset: 0,            // ตัวละครหันผิดทาง → ใส่ Math.PI
  speed: 6,
  cell: 4,                  // 1 ช่องแผนที่ = 4 หน่วย
  step: 2,                  // 1 ระดับความสูง = 2 หน่วย
  cam: { fov: Math.PI / 2, pitch: 60, dist: 90 },
  scale: 1.5,               // ลดความละเอียดภาพ (1 = เต็ม, 1.5 ≈ เหลือ 44% ของพิกเซล, 2 = 25%) — เครื่องแรงขึ้นค่อยลดเลขลง
  fenceStep: 2,             // รั้วขอบหน้าผา: 1 = ทุกช่อง, 2 = เว้นครึ่งหนึ่ง (เบากว่า)
  farFreeze: 80,            // มอนที่ห่างผู้เล่นเกินระยะนี้ หยุดแอนิเมชัน/ไม่คำนวณ
  anims: ['characters/Rig_Medium_General.glb', 'characters/Rig_Medium_MovementBasic.glb'],
};

// ===== แผนที่ 61 x 38 ช่อง (แถวบนสุด = ทิศเหนือ, 1 ช่อง = 4 หน่วย) =====
// ศูนย์กลางช่อง: x = -120 + 4*คอลัมน์ , z = 74 - 4*แถว   (จุดเกิด 0,0 อยู่กลางเกาะ)
// .=น้ำ  ,=หาดทราย(สูง0)  g=หญ้า(สูง2)  h=ที่สูงปราสาท(สูง4)  A=ที่สูงทราย(สูง4)
// ^ v > < = ทางลาด (ลูกศรชี้ทิศที่ยกสูงขึ้น วางบนช่องฝั่งต่ำ)
// '=' สะพานข้ามน้ำ (ห้ามวางติดกันสองช่อง)   p = สะพานท่าเรือ (เดินได้เหนือน้ำ)
//
// ผังเกาะ (เหนือ→ใต้):  ปราสาท(ซ้ายบน) | หุบเขากลาง | เมืองทราย NPC(ขวาบน)
//                       ทุ่งมอนสเตอร์(ซ้าย) | แม่น้ำ+สะพาน | ลานทดสอบ + ทุ่งตะวันออก(ขวา)
//                       ชายหาด + ท่าเรือ A / B / C
const MAP = [
//  0         1         2         3         4         5         6
//  0123456789012345678901234567890123456789012345678901234567890
  '.............................................................',
  '.............................................................',
  '.............................................................',
  '...........hhhhhhhhhhhhhhhh......AAAAAAAAAAAAAAAAA...........',
  '..........hhhhhhhhhhhhhhhhhh....AAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhh....AAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhh....AAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '..........hhhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAAA..........',
  '...........hhhhhhhhhhhhhhhhhggggAAAAAAAAAAAAAAAAAA...........',
  '...,,,..ggggggggg^^^^ggggggggggggg.gg^^^ggggg^^^ggggggg......',
  '...,,,.ggggggggggggggggggggggggggg.ggggggggggggggggggggg.....',
  '.......ggggggggggggggggggggggggggg.ggggggggggggggggggggg.....',
  '.......ggggggggggggggggggggggggggg=ggggggggggggggggggggg.....',
  '.......ggggggggggggggggggggggggggg.ggggggggggggggggggggg.....',
  '.......ggggggggggggggggggggggggggg.ggggggggggggggggggggg.....',
  '.......ggggggggggggggggggggggggggg=ggggggggggggggggggggg.....',
  '........gggggggggggggggggggggggggg.gggggggggggggggggggg......',
  '.........,,,,,,,^^,,,,,,,,,^^^^,,,.,,,,,,,,^^^,,,,,,,,.......',
  '........,,,,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,......',
  '........,,,,,,,,,,,,,,,,,,,,,,,,,,=,,,,,,,,,,,,,,,,,,,,......',
  '........,,,,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,......',
  '........,,,,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,......',
  '.........,,,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,.......',
  '....................ppppp...ppp............ppp..........,,,..',
  '.....................ppp.....p..............p...........,,,..',
  '..........,,..........p......p..............p................',
  '..........,,..........p......p..............p................',
  '.............................................................',
  '.............................................................',
  '.............................................................',
  '.............................................................',
  '.............................................................',
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
  platform: { f: 'world/pirate/platform.glb', s: 2, r: 1 },
  rockA: { f: 'world/pirate/rocks-a.glb', s: 0.7, r: 1.6, inst: true },
  rockB: { f: 'world/pirate/rocks-b.glb', s: 0.7, r: 1.6, inst: true },
  rockC: { f: 'world/pirate/rocks-c.glb', s: 0.8, r: 1.4, inst: true },
  rockSA: { f: 'world/pirate/rocks-sand-a.glb', s: 0.7, r: 1.6, inst: true },
  rockSB: { f: 'world/pirate/rocks-sand-b.glb', s: 0.7, r: 1.6, inst: true },
  rockSC: { f: 'world/pirate/rocks-sand-c.glb', s: 0.8, r: 1.4, inst: true },
  grass: { f: 'world/pirate/grass.glb', s: 2.5, inst: true },
  ship: { f: 'world/pirate/ship-pirate-medium.glb', s: 1 },
  shipL: { f: 'world/pirate/ship-pirate-large.glb', s: 1 },
  wreck: { f: 'world/pirate/ship-wreck.glb', s: 1 },
  tent: { f: 'world/camp/Tent.glb', s: 2.5, r: 1.5 },
  target: { f: 'world/camp/target.glb', s: 2.5, r: 0.7 },
  pine: { f: 'world/camp/Tree-high.glb', s: 2.2, r: 0.5 },
  tree: { f: 'world/camp/tree.glb', s: 2, r: 0.5 },
  fenceE: { f: 'world/camp/fence.glb', s: 3.4, inst: true },   // รั้วขอบหน้าผา (วางอัตโนมัติ)
  dock: { f: 'world/pirate/structure.glb', s: 1.6, inst: true },            // วางบนทุกช่องท่าเรือ 'p' อัตโนมัติ
  bridge: { f: 'world/camp/bridge.glb', s: 4, dy: -1.85 },   // วางอัตโนมัติบนช่อง '=' (ผิวสะพานเสมอระดับพื้น)
};

// ===== โมเดลมอนสเตอร์ Quaternius "Ultimate Monsters" (.gltf + Atlas_Monsters.png ในโฟลเดอร์เดียวกัน) =====
// ที่อยู่โฟลเดอร์ใต้ assets/ — ถ้าวางไว้ที่อื่น แก้แค่ 3 บรรทัดนี้
const MON_DIR = { blob: 'monsters/blob/', big: 'monsters/Big/', fly: 'monsters/flying/' };
const MON_FACE = 0;       // มอนสเตอร์หันผิดทาง (หันหลังให้ทิศที่เดิน) → ใส่ Math.PI
// คีย์: [โฟลเดอร์, ชื่อไฟล์(ไม่ต้องใส่ .gltf), สเกล, ลอยสูง, รัศมีชน]
const MON = {
  // --- NPC (เห็ดหมวกน้ำเงินไม่มีหนาม = Mushnub) + สัตว์เลี้ยงในเมือง ---
  mush: ['blob', 'Mushnub', 1.5, 0, 0.8],
  cat: ['blob', 'Cat', 1.3], dog: ['blob', 'Dog', 1.3], chicken: ['blob', 'Chicken', 1.3],
  // --- มอนสเตอร์จิ๋ว (blob) ---
  pink: ['blob', 'PinkBlob', 1.4], gblob: ['blob', 'GreenBlob', 1.4], fish: ['blob', 'Fish', 1.4],
  birb: ['blob', 'Birb', 1.4], pigeon: ['blob', 'Pigeon', 1.4],
  spiky: ['blob', 'GreenSpikyBlob', 1.4], mushE: ['blob', 'Mushnub_Evolved', 1.5],
  cactoro: ['blob', 'Cactoro', 1.5], alien: ['blob', 'Alien', 1.5], orcB: ['blob', 'Orc', 1.5],
  ninjaB: ['blob', 'Ninja', 1.5], wizard: ['blob', 'Wizard', 1.5], yetiB: ['blob', 'Yeti', 1.6],
  // --- มอนสเตอร์บิน (flying) ลอยเหนือพื้น ---
  ghost: ['fly', 'Ghost', 1.5, 1.3], ghostSkull: ['fly', 'Ghost_Skull', 1.5, 1.3], demonF: ['fly', 'Demon', 1.5, 1.3],
  hywirl: ['fly', 'Hywirl', 1.5, 1.3], squidle: ['fly', 'Squidle', 1.5, 1.3], glub: ['fly', 'Glub', 1.5, 1],
  goleling: ['fly', 'Goleling', 1.5, 0.8],
  alpakingE: ['fly', 'Alpaking_Evolved', 2, 1.5], armabeeE: ['fly', 'Armabee_Evolved', 2, 1.5],
  golelingE: ['fly', 'Goleling_Evolved', 2, 1.2], dragonE: ['fly', 'Dragon_Evolved', 2.4, 2],   // เอลีท
  // --- บอส (Big) ---
  kingMush: ['big', 'MushroomKing', 3.2], demon: ['big', 'Demon', 3], blueDemon: ['big', 'BlueDemon', 3],
  orcSkull: ['big', 'Orc_Skull', 3], dino: ['big', 'Dino', 3], tribal: ['big', 'Tribal', 3],
  // ยังไม่ได้ใช้ (เอาไปวางเพิ่มได้): Bunny Frog Monkroose Yeti Orc Ninja Alien Cactoro Fish Birb ในโฟลเดอร์ Big
};
for (const [k, [d, n, s, hv, r]] of Object.entries(MON))
  PREFABS[k] = { f: MON_DIR[d] + n + '.gltf', s, mon: true, fo: MON_FACE, hover: hv || 0, ...(r ? { r } : {}) };

// ===== มอนสเตอร์ (rogue/barbarian/dummy): มี HP, ยืน idle ที่จุดเกิด =====
// เมื่อผู้เล่นเข้าใกล้ ≤ aggro → เดินตามผู้เล่น
// เมื่อตัวเองห่างจากจุดเกิด ≥ leash → ยอมแพ้ เดินกลับไปยืนเดิม
// (dummy ใช้ค่าบาร์บาเรียน × 1.5 ทั้งสองระยะ — กว้างกว่าตามโจทย์)
const MOB_AI = {
  rogue:     { aggro: 8,    leash: 14,   hp: 60  },   // ร็อก: ระยบแคบสุด (ตัวเล็ก ระวังตัว)
  barbarian: { aggro: 11,   leash: 18,   hp: 120 },   // บาร์บาเรียน: กว้างกว่าร็อก
  dummy:     { aggro: 16.5, leash: 27,   hp: 250 },   // ดัมมี่ (โซนทดสอบ): กว้างกว่าบาร์บาเรียน 1.5 เท่า (11×1.5, 18×1.5)
  speed: 3.5,    // ความเร็วเดินมอนสเตอร์ (ช้ากว่าผู้เล่น CFG.speed=6)
  turn: 10,      // ความไวในการหันหน้า
};
// ค่ามอนสเตอร์ใหม่: T(aggro, leash, hp, ความเร็ว(ไม่ใส่=ค่ากลาง), ระยะหยุดห่างผู้เล่น(ไม่ใส่=1.4))
const T = (aggro, leash, hp, speed, reach) => ({ aggro, leash, hp, speed, reach });
Object.assign(MOB_AI, {
  // ระดับ 1 (หาด) → 2 (ทุ่ง) → 3 (ทุ่งตะวันออก)
  pink: T(6, 11, 30), gblob: T(6, 11, 35), fish: T(5, 9, 25), birb: T(7, 12, 30), pigeon: T(7, 12, 30),
  spiky: T(8, 14, 70), mushE: T(8, 14, 90), cactoro: T(8, 14, 80), alien: T(8, 14, 75), orcB: T(9, 15, 90),
  ninjaB: T(9, 16, 110), wizard: T(10, 16, 100), yetiB: T(10, 17, 130),
  // บิน (ปราสาท)
  ghost: T(10, 18, 90), ghostSkull: T(11, 18, 110), demonF: T(11, 19, 130), hywirl: T(10, 18, 100),
  squidle: T(10, 18, 100), glub: T(9, 16, 80), goleling: T(9, 16, 140),
  alpakingE: T(13, 24, 350), armabeeE: T(13, 24, 350), golelingE: T(13, 24, 400), dragonE: T(14, 26, 600),
  // บอส: ตัวใหญ่ เดินช้า หยุดห่างผู้เล่นมากกว่า
  kingMush: T(14, 30, 2000, 2.6, 3.8), demon: T(11, 24, 1200, 3, 3.2), blueDemon: T(11, 24, 1200, 3, 3.2),
  orcSkull: T(13, 26, 1000, 3, 3.2), dino: T(13, 26, 900, 3.2, 3.2), tribal: T(13, 26, 800, 3, 3.2),
});

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
// ร้านค้า NPC 1 แผง (แบบเดียวกับร้านของเมจเดิม): npc ยืนหน้า หลังคาข้างหลัง ธง 2 ผืน ถัง/ลัง ด้านข้าง
function stall(k, x, z) {
  return [[k, x, z, Math.PI, 'npc'], ['roof', x, z + 5, 0], ['flagN', x - 3, z + 8, 0], ['flagN', x + 3, z + 8, 0],
    ['barrel', x - 4, z - 1, 0], ['crate', x + 4, z - 1, 0.4], ['crateB', x + 5.2, z + 0.2, 1]];
}
const at = (k, tag, pts) => pts.map(([x, z, h = Math.PI]) => [k, x, z, h, tag]);   // วางหลายตัว ชนิดเดียวกัน
const mobs = (k, pts) => at(k, 'mob', pts);
const npcs = (k, pts) => at(k, 'npc', pts);
const line = (k, x1, z1, x2, z2, n, h = 0) => Array.from({ length: n }, (_, j) => {   // วางเรียงเป็นแถวตรง
  const t = n === 1 ? 0 : j / (n - 1); return [k, x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, h];
});

// เส้นทางเดิน: ระบายสีพื้นเป็นสีดิน (ไม่ใช้โมเดล) — แก้จุดได้เลย [x, z]
const PATHS = [
  [[-46, 26], [-46, 2]],                       // ประตูปราสาท → ถนนใหญ่
  [[-76, 2], [96, 2]],                         // ถนนใหญ่ ตะวันตก ↔ ตะวันออก (ข้ามสะพานแม่น้ำ)
  [[32, 2], [32, 26]], [[64, 2], [64, 26]],    // ทางขึ้นเมืองทราย 2 ทาง
  [[10, 26], [78, 26]],                        // ถนนในเมือง
  [[-2, 14], [-2, 44]],                        // หุบเขากลาง
  [[-54, 2], [-54, -30]],                      // ลงหาดตะวันตก
  [[-6, 2], [-6, -40]], [[-6, -30], [-32, -30], [-32, -40]],   // ลงหาดกลาง → ท่าเรือ B / A
  [[56, 2], [56, -40]],                        // ลงหาดตะวันออก → ท่าเรือ C
];

// [prefab, x, z, หันหน้า(0=เหนือ, PI=ใต้), tag, dy]  — ความสูง y คำนวณจากแผนที่ให้เอง
// (ฉบับเบา: มอนสเตอร์/ของตกแต่งลดลง ~60% — อยากเพิ่มกลับ ก๊อปบรรทัด mobs(...) แล้วเปลี่ยนพิกัดได้เลย)
const PLACE = [
  // ================= ปราสาท (โซนบอส) =================
  ...castle(-46, 34),
  ...mobs('kingMush', [[-46, 34]]),                                            // บอสใหญ่ กลางลานปราสาท (วงแดง)
  ...mobs('demon', [[-60, 22]]), ...mobs('blueDemon', [[-32, 22]]),            // ยามหน้าประตู
  ...mobs('ghost', [[-46, 30]]), ...mobs('hywirl', [[-70, 24]]),
  ...mobs('dragonE', [[-46, 54]]),                                             // เอลีทหลังปราสาท
  ['flagH', -50, 20, 0], ['flagH', -42, 20, 0],

  // ================= เมืองทราย (โซน NPC / สุ่มผล) =================
  ['mage', 32, 32, Math.PI, 'npc'], ['roof', 32, 37, 0], ['house', 24, 38, Math.PI], ['house', 41, 39, Math.PI],
  ['barrel', 28, 31, 0], ['crate', 36, 31, 0.4], ['crateB', 37.2, 32.2, 1],
  ['flagN', 29, 40, 0], ['flagN', 35, 40, 0], ['tower', 50, 38, 0],
  ['palmDS', 12, 42, 0], ['palmDB', 52, 33, 0], ['palmStr', 58, 28, 0], ['palmBend', 10, 28, 0],
  // ที่เพิ่ม: แผงร้านเห็ด + บ้านเหนือ + หอเฝ้า
  ...stall('mush', 64, 32),
  ['house', 32, 52, Math.PI], ['house', 48, 52, Math.PI],
  ...npcs('mush', [[40, 46]]), ['tower', 76, 58, 0],
  ...npcs('cat', [[38, 27]]), ...npcs('dog', [[26, 27, 0.8]]),
  // หุบเขากลาง (ไกด์)
  ...npcs('mush', [[-2, 38]]), ['flagH', -6, 44, 0], ['flagH', 2, 44, 0],

  // ================= ลานทดสอบสกิล (ตะวันออก) — ดัมมี่เดิม =================
  ['barbarian', 44, 0, Math.PI, 'dummy'],
  ['target', 36, -6, Math.PI], ['target', 52, -6, Math.PI], ['target', 44, 9, Math.PI], ['target', 30, 6, Math.PI],
  ['tent', 58, -12, 2.5], ['barrel', 55, -12, 0], ['pine', 38, 10, 0],
  ...npcs('mush', [[24, -4]]),                                                 // ครูฝึก
  ...mobs('alien', [[78, 4]]), ...mobs('yetiB', [[92, 8]]), ...mobs('tribal', [[88, -4]]),   // ทุ่งตะวันออก (+บอส)

  // ================= ทุ่งมอนสเตอร์ (ตะวันตก) =================
  // ของเดิม
  ['rogue', -66, -6, Math.PI, 'mob'], ['rogue', -56, -12, Math.PI, 'mob'], ['barbarian', -44, -8, Math.PI, 'mob'],
  ['rogue', -28, -4, Math.PI, 'mob'], ['barbarian', -20, 10, Math.PI, 'mob'],
  // แคมป์
  ['tent', -72, 8, 0.6], ['tent', -66, 4, -0.4], ['barrel', -69, 6, 0], ['platform', -60, 6, 0.3], ['crate', -60, 6.3, 0],
  // ที่เพิ่ม
  ...mobs('orcSkull', [[-84, 0]]),                                             // บอสป่า
  ...mobs('spiky', [[-88, -8]]), ...mobs('mushE', [[-80, -10]]), ...mobs('wizard', [[-76, -4]]),
  ...mobs('dino', [[-26, -8]]),                                                // บอสทุ่ง
  ...mobs('ninjaB', [[-34, 2]]),
  ...npcs('mush', [[5, -4]]),                                                  // ไกด์จุดเกิด

  // ================= หาด + ท่าเรือ =================
  ['house', -44, -31, 0], ['barrel', -36, -31, 0], ['crate', -33, -32, 0.7], ['crateB', -30, -31, 0.2],
  ['mast', -40.5, -40.5, 0], ['flagP', -23.5, -40.5, 0], ['barrel', -24, -43, 0], ['crate', -40, -43, 0.5],   // ท่าเรือ A
  ['mast', -9, -40.5, 1], ['flagP', -1, -40.5, 0], ['barrel', 11, -34, 0], ['crate', 8, -33, 0.3],           // ท่าเรือ B
  ['mast', 51, -40.5, 0.5], ['flagP', 61, -40.5, 0], ['barrel', 60, -43, 0],                                  // ท่าเรือ C
  ...npcs('mush', [[-28, -37], [52, -37]]),                                    // พ่อค้าท่าเรือ
  ...line('palmStr', -84, -21, -60, -21, 2), ...line('palmDS', 20, -21, 48, -21, 2),
  ...mobs('pink', [[-74, -28], [72, -26]]), ...mobs('fish', [[36, -30]]),      // มอนหาด (ระดับ 1)

  // ================= เกาะเล็ก + เรือ =================
  ['rockSA', -104, 12, 0], ['palmBend', -105.5, 10.5, 0], ['rockSB', 108, -46, 0], ['palmStr', 106, -43.5, 0],
  ['palmDS', -79, -51, 0], ['rockSC', -76.5, -53.5, 0],
  ['shipL', 110, 2, Math.PI / 2],
  ['ship', -26.5, -52, 0], ['shipL', 1.2, -52, 0], ['shipL', 61.2, -52, 0], ['wreck', 30, -52, 0.5],
];

// สุ่มวางของตกแต่ง (เฉพาะช่องพื้นเรียบที่ไม่ติดหน้าผา/ทางลาด)  [prefab, จำนวน, x1, z1, x2, z2, seed]
const SCATTER = [
  // ป่าตะวันตก + ทุ่งกลาง
  ['pine', 6, -92, -14, -70, 14, 11], ['tree', 2, -92, -14, -70, 14, 23],
  ['pine', 2, -50, -14, -14, 12, 12], ['tree', 1, -50, -14, -14, 12, 24], ['rockA', 1, -50, -14, -14, 12, 5],
  // ลานทดสอบ + ทุ่งตะวันออก
  ['pine', 2, 28, -12, 64, 14, 17], ['rockC', 1, 28, -12, 64, 14, 19],
  ['pine', 3, 70, -12, 98, 12, 21], ['tree', 1, 70, -12, 98, 12, 25], ['rockB', 1, 70, -12, 98, 12, 27],
  // ที่สูงปราสาท
  ['pine', 4, -78, 20, -62, 60, 31], ['pine', 4, -30, 20, -14, 60, 32], ['pine', 2, -62, 48, -30, 60, 33], ['rockB', 1, -78, 20, -14, 60, 34],
  // เมืองทราย ริมขอบ
  ['palmStr', 1, 10, 20, 14, 60, 41], ['palmDS', 1, 74, 20, 78, 60, 42], ['rockSA', 1, 14, 56, 76, 60, 43],
  // ชายหาด
  ['palmStr', 2, -86, -38, -56, -22, 7], ['palmDS', 1, -86, -38, -56, -22, 31], ['palmStr', 1, -30, -38, -14, -22, 13],
  ['palmDS', 1, 20, -38, 92, -22, 37], ['palmStr', 2, 20, -38, 92, -22, 14],
  ['rockSA', 1, -86, -38, 92, -22, 3], ['rockSB', 1, -86, -38, 92, -22, 4],
  // หญ้า (instance เบามาก)
  ['grass', 14, -92, -14, 100, 14, 51], ['grass', 5, -78, 20, -14, 60, 52],
];

// ชื่อโซนบน HUD (วงกลมรัศมี r) — ตัวบนสุดที่ตรงเงื่อนไขชนะ
const ZONES = [
  { name: 'โซนบอส (ปราสาท)', x: -46, z: 36, r: 28 },
  { name: 'โซน NPC / สุ่มผล', x: 44, z: 38, r: 40 },
  { name: 'หุบเขากลาง', x: -2, z: 32, r: 16 },
  { name: 'โซนทดสอบสกิล', x: 44, z: 0, r: 22 },
  { name: 'ทุ่งตะวันออก', x: 86, z: 0, r: 18 },
  { name: 'ป่ามอนสเตอร์', x: -76, z: 0, r: 22 },
  { name: 'ทุ่งมอนสเตอร์', x: -36, z: -2, r: 24 },
  { name: 'ชายหาด', x: 0, z: -30, r: 100 },
];
