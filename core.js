// ===== config/core.js =====
// ค่าพื้นฐาน + แผนที่ + โมเดลพื้นฐาน + helpers
// โหลดไฟล์นี้ก่อนไฟล์ zones

const CFG = {
  base: 'assets/',
  faceOffset: 0,
  speed: 9,
  cell: 4,
  lv: { ',': 0, g: 3, h: 6, A: 6, p: 0 },
  step: 3,
  cam: { fov: Math.PI / 2, pitch: 39, dist: 55 },
  scale: 1,
  fenceStep: 1, // เติมรั้วทุกช่วง ไม่เว้นช่อง
  farFreeze: 90,
  pathW: 5,
  seaSize: 1600,
  farClip: 900,
  anims: ['characters/Rig_Medium_General.glb', 'characters/Rig_Medium_MovementBasic.glb', 'characters/Rig_Medium_MovementAdvanced.glb', 'weapon/Rig_Medium_CombatMelee.glb', 'characters/Rig_Medium_CombatRanged.glb'],   // CombatRanged = ท่าสำรอง Ranged_Magic_Raise/Shoot ของสกิลดาบ (ยืนยันแล้วว่ามีในโฟลเดอร์ characters/)

  // ===== Stamina + Dash (อ่านโดย game.js — ลบบล็อกนี้ได้ จะใช้ค่าเริ่มต้นในเกมแทน) =====
  stamina: {
    max: 1000,          // Stamina สูงสุด
    regen: 28,         // ฟื้นต่อวินาที
    regenDelay: 0.31,   // หน่วงหลังใช้ก่อนเริ่มฟื้น (วินาที)
    dashCost: 15,      // Dash 1 ครั้งกินเท่าไร (100 → Dash ติดกันได้ 4 ครั้ง)
    hud: { left: 16, top: 52, width: 190, height: 12 },   // ตำแหน่งแถบ (px)
  },
  // ===== จอ: แนวนอน + เต็มจอ (อ่านโดย game.js) =====
  display: {
    landscape: true,          // มือถือแนวตั้ง → ขึ้นข้อความให้หมุนเครื่อง และพักเกมไว้ (คอมพิวเตอร์ไม่โดน)
    fullscreen: 'auto',       // 'auto' = เข้าเต็มจอเองตอนแตะ/กดครั้งแรก | 'button' = เฉพาะปุ่มมุมขวาบน/กด F | false = ปิด
    lockOrientation: true,    // ล็อกแนวนอนตอนเต็มจอ (ใช้ได้บน Android/Chrome; iPhone ไม่รองรับ)
    button: true,             // ปุ่มเต็มจอ ⛶ มุมขวาบน
  },
  // ===== ผู้เล่น: HP + สถิติ (อ่านโดย src/health.js) =====
  player: {
    hp: 100,             // HP สูงสุดของผู้เล่น
    regen: 0,            // (เดิม) ฟื้น HP ค่าคงที่ต่อวินาที — ใช้เมื่อ regenPct เป็น null เท่านั้น
    regenPct: 0.05,      // ฟื้น HP = 5% ของ Max HP ต่อวินาที (หลังไม่โดนตี regenDelay วินาที) — 0 = ไม่ฟื้นเอง, null = ใช้ regen ค่าคงที่
    regenDelay: 5,       // ไม่โดนตีนานเท่านี้ก่อนเริ่มฟื้น (วินาที)
    iframe: 0.5,         // อมตะหลังโดนตี (วินาที) กันโดนรัวหลายที
    respawn: 3,          // ตายแล้วเกิดใหม่ใน (วินาที)
    spawn: { x: 0, z: 0 },   // จุดเกิดใหม่
    stats: { power: 1, defense: 0 },   // power = ตัวคูณดาเมจที่ทำ, defense = ลดดาเมจที่โดน (0–0.9)
    hud: { left: 16, top: 28, width: 190, height: 16 },   // แถบ HP (px)
    debugKeys: false,    // true = กด H เพื่อโดน 15 (ทดสอบ HP / ท่า hit / ท่าตาย)
  },
  // ===== สีพื้นเกาะ (ให้ game.js อ่าน) — ค่าเดิม: A '#e2c88a' (ทรายเข้ม), ทางเดิน '#cfa66a' =====
  // A = พื้นที่ราบสูงโซน NPC / สุ่มผล ทั้งโซน | pathColor = พื้นทางเดินในโซน | ลบบรรทัดนี้ทิ้งเพื่อกลับสีเดิม
  groundColors: { A: '#97d65f' },
  pathColor: '#ecdcb0',

  // ===== สถิติผู้เล่น (อ่านโดย src/player-stats.js + src/player-stats-ui.js) =====
  playerStats: {
    pointsPerLevel: 3,   // แต้มต่อเลเวลที่เพิ่ม (Level 1 = 0 แต้ม) → แต้มรวม = (Level - 1) × 3
    perPoint: { staminaMax: 5, meleeDamage: 5, maxHp: 5, fruitDamage: 5, swordDamage: 5 },
    // อาวุธไหนนับเป็นสถิติอะไร: 'melee' (หมัด/อาวุธประชิดทั่วไป) หรือ 'sword' — อาวุธที่ไม่อยู่ในลิสต์นับเป็น melee
    weaponClass: { dagger: 'melee', dualAxe: 'melee', sword: 'sword' },
    debugLevelUp: true,  // true = มีปุ่มทดสอบ "Lv +1" ในหน้า Stats (ยังไม่มีระบบ EXP) — ปิดเป็น false ก่อนปล่อยจริง
    more: { right: 10, top: 56 },   // ตำแหน่งปุ่ม More (px) — ใต้ปุ่มเต็มจอมุมขวาบน
  },
  // ===== การต่อสู้ (อ่านโดย src/combat.js) =====
  // อาวุธแต่ละชิ้นเป็น component: model (ไฟล์ใน assets/weapon/) + stats + skills — ทับเฉพาะค่าที่อยากเปลี่ยนได้
  combat: {
    weapon: 'dagger',                 // อาวุธเริ่มต้น
    hotbar: ['dagger', 'sword', 'dualAxe'],      // ช่อง 1, 2, ... (กดเลขบนคีย์บอร์ดหรือแตะที่ช่องเพื่อเปลี่ยน)
    autoAim: true,                    // หันหามอนที่ใกล้ที่สุดตอนฟัน
    button: true,                     // ปุ่ม ATTACK บนจอ
    keys: { light: ['KeyJ'], heavy: ['KeyK'] },   // J = ฟันเบา (คอมโบตามอาวุธ), K = ฟันหนัก
    specialKeys: { z: ['KeyZ'], x: ['KeyX'] },   // Z / X = สกิลพิเศษของอาวุธที่ถืออยู่ (ปุ่มบนจอมือถือสร้างโดย src/skill-ui.js; skillButtons:false = ซ่อน)
    // skillFx: { glow: true, glowIntensity: 1.0, shake: true, maxSlashes: 26 },   // ปรับเอฟเฟกต์สกิล (src/skill-effects.js): ปิด glow/สั่นจอ หรือลดจำนวนเส้นสำหรับเครื่องช้า
    // ค่าเริ่มต้นของอาวุธ/คอมโบอยู่ใน src/combat.js — ที่นี่ใส่เฉพาะค่าที่อยากทับ
    //   stats: damage ดาเมจ / range ระยะ / arc มุมฟัน(องศา) / speed ความไว (2 = ไวขึ้นเท่าตัว, 0.5 = ช้าลงครึ่งหนึ่ง)
    //   combos.light: { loop, window, recovery, steps:[{ clip, time, hitAt, gap, mult, range, arc, dir, fx }] } — ทับทั้งก้อน
    //     time = เวลาฟัน(วิ) / gap = ระยะคั่นหลังท่า(วิ) / recovery = คูลดาวน์หลังจบคอมโบ(เมื่อ loop:false)
    //     clip: atkDiagonal | atkHorizontal | atkStab | atkChop | atkJumpChop
    //   fx: เสี้ยวฟัน { color:[r,g,b], life: ความยาวหาง(วิ), reach: ขยายเลยปลายดาบกี่เท่า, base: จุดโคนแถบ 0–1 }
    weapons: {
      dagger: {
        // stats: { damage: 10, range: 2.3, arc: 75, speed: 1 },     // ดาบสั้น 4 ท่า: ฟันระดับ→จามลง→แทง→ฟันเฉียงย้อน แล้ววนซ้ำ
        // fx: { color: [0.55, 0.95, 1] },
        // model: { path: 'weapon/dagger.gltf', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 },   // ปรับถ้าอาวุธเอียง/หลุดมือ

        // ----- สกิลพิเศษ 2 ช่อง: Z และ X (อาวุธแต่ละชิ้นมีได้ช่องละ 1 สกิล — ไม่ใส่ special = ช่องนั้นว่าง) -----
        // type: 'sonicDash' | 'slashBarrage'  ·  ดาเมจทุกทิก = stats.damage × mult × Health.player.stats.power
        special: {
          z: { type: 'sonicDash', name: 'Sonic Dash',
            cooldown: 6, cost: 40,                                   // คูลดาวน์ (วินาที) / Stamina ที่หัก (หักครั้งเดียวตอนกด)
            dash: { distance: 12, duration: 0.26, iframe: 0.26 },    // พุ่งไปข้างหน้า (ใช้ท่า Dodge Forward + ระบบชนของ game.js)
            hitRadius: 1.5,                                          // รัศมีโดนศัตรูตลอดเส้นทางพุ่ง (ศัตรูตัวแรกที่เจอ)
            aimRange: 14, aimArc: 80,                                // ช่วยเล็งก่อนพุ่ง (ใช้เมื่อ combat.autoAim เปิด)
            boomSpacing: 1.5,                                        // ระยะห่างวงแหวนเสียงแตก
            barrage: { duration: 0.75, tickInterval: 0.125, tickMult: 0.8, stun: 0.75 },   // ล็อก+สตัน 0.75 วิ: ดาเมจ 6 ทิก ทิกละ damage × 0.8
          },
          x: { type: 'slashBarrage', name: 'Slash Barrage',
            cooldown: 14, cost: 120,
            range: 8, maxTargets: 6,                                 // เป้าหมายในรัศมีนี้ (นับจากผู้เล่น) ถูกล็อก+สตัน
            duration: 3, hitInterval: 0.25, tickMult: 0.5,           // รัว 3 วิ: ทุก 0.25 วิ ดาเมจ damage × 0.5 (รวม 12 ทิก)
            stun: 3.6,                                               // สตัน (วินาที) — ตั้ง ≥ duration + finisherDelay เพื่อล็อกจนจบฟินิชเชอร์
            finalMult: 6, finalRadius: 5,                            // ฟินิชเชอร์ครั้งเดียว: damage × 6 ทุกตัวในรัศมี 5 รอบจุดตก
            finisherDelay: 0.4, impactDelay: 0.12, finisherTail: 0.6,
            // anim: ['atkChop','atkHorizontal','atkDiagonal','atkChop'],  animFinish: ['atkJumpChop','atkChop']   // ชื่อ state จาก ANIM_STATES ใน combat.js เท่านั้น
          },
        },
      },
      sword: {
        // stats: { damage: 30, range: 3.6, arc: 150, speed: 1 },    // ดาบยาว 5 ท่า: ฟันระดับ→จามลง→แทง→ฟันย้อน→จามหนัก แล้ววนซ้ำ (พัก 0.5 วิก่อนวน)
        // fx: { color: [1, 0.95, 0.75] },
        // model: { path: 'weapon/sword_1handed.gltf', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 },

        // ----- สกิลพิเศษของดาบ (ไม่สตันศัตรู) -----
        special: {
          z: { type: 'piercingBeam', name: 'Piercing Beam',
            cooldown: 8, cost: 60,
            length: 26, width: 1.5,                                  // ความยาวลำแสง / ความกว้างครึ่งหนึ่งที่โดนดาเมจ (ทะลุทุกตัวในแนว)
            beamMult: 3,                                             // ดาเมจลำแสง = stats.damage × 3 ต่อตัว (โดนครั้งเดียว)
            explosion: { radius: 5.5, mult: 4, delay: 0.06 },        // ระเบิดที่ปลายลำแสง: ดาเมจวงกลม damage × 4 (ไม่สตัน ไม่ผลัก)
            // melee: { anim: ['atkStab', 'atkChop'], time: 0.55, release: 0.3 },        // ท่าฟันดาบจริง (ต้องโหลด CombatMelee ได้ชื่อตรง) — ปล่อยลำแสงที่ release วินาที
            // magic: { raiseTime: 0.4, shootTime: 0.5, releaseAt: 0.6 },                // ท่าสำรอง Ranged_Magic_Raise → Ranged_Magic_Shoot
          },
          x: { type: 'crescentWave', name: 'Crescent Wave',
            cooldown: 12, cost: 100,
            range: 40, speed: 30,                                    // คลื่นพุ่งไกล 40 หน่วย ความเร็ว 30 หน่วย/วินาที ครอบคลุม 180° ด้านหน้า
            mult: 5,                                                 // ดาเมจสูง = stats.damage × 5 ต่อตัว (โดนครั้งเดียวตอนคลื่นผ่าน)
            knock: { dist: 2.2, dur: 0.28 },                         // แรงผลักเล็กน้อย (procedural) — ไม่สตัน ไม่เปลี่ยนท่าของมอน
            height: 6.5,                                             // ความสูงคลื่นเสี้ยวพระจันทร์
            // melee: { anim: ['atkHorizontal', 'atkDiagonal'], time: 0.62, release: 0.34 },
            // magic: { raiseTime: 0.4, shootTime: 0.5, releaseAt: 0.6 },
          },
        },
      },
      // ---------- ขวานคู่ (หนัก ช้า กว้าง) ----------
      // ถือ 2 เล่ม: models[0] = มือขวา, models[1] = มือซ้าย — ปรับ pos [x,y,z] / rot [x,y,z เรเดียน] / scale ของแต่ละเล่มได้อิสระ
      // slot = ชื่อจุดจับบนตัวละคร (ขวา 'handslot.r' / ซ้าย 'handslot.l') ถ้าชื่อไม่ตรง ระบบจะลองหาชื่อที่ใกล้เคียงให้ และดูรายชื่อจริงใน console: [anims] จุดจับมือที่พบ
      dualAxe: {
        models: [
          { path: 'weapon/axe_1handed.gltf', slot: 'handslot.r', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 },
          { path: 'weapon/axe_1handed.gltf', slot: 'handslot.l', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 },   // ถ้าขวานซ้ายหันผิดด้าน ลอง rot: [0, Math.PI, 0] หรือ [0, 0, Math.PI]
        ],
        // stats: { damage: 42, range: 4, arc: 150, speed: 1 },      // ช้า/หนักมาจากเวลาของแต่ละท่าในคอมโบ (ดู combos ใน src/combat.js: 0.78 / 0.8 / 1.2 วิ, ตัวคูณดาเมจ 1.0 / 1.25 / 2.3)
        // fx: { color: [0.9, 0.95, 1] },

        special: {
          z: { type: 'stormCyclone', name: 'Cyclone Storm',
            cooldown: 18, cost: 85,
            lunge: { distance: 3.5, duration: 0.3 },                 // พุ่งหมุนสั้นๆ ก่อนปล่อยพายุ (ระบบพุ่งชนของเดิม)
            radius: 9, duration: 3,                                  // รัศมีพายุ / เวลาที่ทำดาเมจ
            tickInterval: 0.25, tickMult: 0.6, initialMult: 3,       // ดาเมจทุก 0.25 วิ = damage × 0.6, แรงกระแทกแรก = damage × 3
            stun: true, stunPad: 0.15,                               // สตันเฉพาะช่วงพายุ (ต่ออายุทีละทิก; ออกนอกพายุ/จบ/ผู้เล่นตาย = ปล่อยทันที)
            collapse: 1.0, shrinkStart: 0.7, shrinkTo: 0.45,         // ยุบตัว: 70% แรกเต็มรัศมี → หดเหลือ 45% → ยุบเข้าแกนใน 1 วิ
            centerDist: 7, maxCenter: 12,                            // ศูนย์กลางพายุอยู่ข้างหน้า 7 หน่วย (หรือที่ศัตรูใกล้สุดข้างหน้า ไม่เกิน 12)
            // anim: ['atk2hSpin', 'atk2hSpinning', 'atkDualSlice', 'atkHorizontal'], spin: 'auto',
          },
          x: { type: 'radialBurst', name: 'Slash Burst',
            cooldown: 15, cost: 80,
            crouchTime: 0.55, squash: 0.14,                          // ช่วงย่อตัว (ท่า Crouching + บีบตัวลง 14%)
            radius: 13, centerOffset: 3, rearLimit: 4,               // รัศมีระเบิด 13 รอบจุดข้างหน้า 3 หน่วย; ด้านหลังตัวเกิน 4 ไม่โดน
            mult: 5.5,                                               // ดาเมจครั้งเดียว = damage × 5.5 ต่อมอน
            knock: { dist: 7, dur: 0.4 },                            // ผลักแรงออกจากศูนย์กลาง (ไม่สตัน)
            // anim: { release: ['atk2hChop', 'atkDualChop', 'atkJumpChop', 'atkChop'] },
          },
        },
      },
    },
    skills: {
      // light: { cost: 8 },                       // ต้นทุน Stamina ต่อครั้ง (ท่าในคอมโบมี time/mult ของตัวเอง)
      // heavy: { time: 1.0, cost: 22, dmgMult: 2.2 },
    },
  },
  // วิ่ง: เดินปกติ = speed ด้านบน, วิ่ง = speed × mult (1.5 = เร็วขึ้น 50%)
  run: {
    mult: 1.5,
    keys: ['ShiftLeft', 'ShiftRight'],   // กดค้างเพื่อวิ่ง (คีย์บอร์ด)
    button: true,                        // ปุ่ม RUN บนจอ (กดสลับเปิด/ปิด) สำหรับมือถือ
    staminaPerSec: 0,                    // วิ่งกิน Stamina ต่อวินาที (0 = ไม่กิน)
  },
  // ระบบแอนิเมชัน: เพิ่ม/แก้ท่าได้ที่ states (ดูตัวอย่างโครงสร้างใน game.js ตรง ANIM_STATES)
  animSystem: {
    blend: 0.1,          // ความนุ่มของการเปลี่ยนท่า (มาก = เปลี่ยนเร็ว)
    debugKeys: false,    // true = กด 1-9 ทดสอบท่า hit/death/interact/pickup/throw/useItem/spawn/idleAlt, 0 = รีเซ็ต
    states: {            // ตัวอย่าง: ปรับความเร็วท่าเดิน → walk: { clip: [/^Walking_A$/i], loop: true, speed: 1.2 },
    },
  },
  dash: {
    distance: 9,       // ระยะพุ่ง (หน่วยโลก) — speed=9 หน่วย/วิ กล้องไกล จึงตั้งไกลกว่าค่าเริ่มต้น ≈ 2 ช่อง
    duration: 0.22,    // เวลาพุ่ง (วินาที)
    keys: ['Space'],   // ปุ่ม Dash บนคีย์บอร์ด (Shift ใช้วิ่ง)
    delay: 0.25,       // หน่วงก่อน Dash ครั้งถัดไป (วินาที)
    buffer: 0.15,      // กดล่วงหน้าได้ (วินาที)
    iframe: 0.18,      // อมตะช่วงต้น Dash (player.invuln)
    fovKick: 4,        // กล้องซูมออกตอนพุ่ง (องศา) 0 = ปิด
    lean: 0.3,         // เอนตัวไปข้างหน้า (เรเดียน) ตอน Dash เมื่อไม่มีท่า Dodge — 0 = ปิด
  },
};

  

const LIGHTING_CONFIG = {
  enabled: true,

brightness: 1.12,
debug: false,

// ท้องฟ้าจากภาพ PNG — ใส่ path ภาพที่ image เพื่อเปิดใช้ (null = ใช้ท้องฟ้าที่โค้ดสร้างเหมือนเดิม)
sky: {
  image: 'assets/sky/file_0000000011288207bde778a9ee0a3f6d.png',  // null = ใช้ท้องฟ้าที่โค้ดสร้าง
  mode: 'panorama',              // ภาพของคุณเป็นพาโนรามา 360° (2:1) | 'backdrop' = ภาพวาดแบนทั่วไป
  yaw: 55,                       // หมุนภาพซ้าย-ขวา (องศา): 55 = ดวงอาทิตย์ในภาพมาอยู่ฝั่งขวาของจอ / 0 = ดวงอาทิตย์อยู่นอกจอทางขวา
  pitchScale: 4,                 // [panorama] บีบภาพแนวตั้ง: กล้องเห็นท้องฟ้าแค่แถบบนสุดของจอ (~11°) → 1 = ตามจริง (เห็นแต่แถบทองขอบฟ้า) / 4 = เห็นเมฆ+ดวงอาทิตย์ / มากกว่านี้ = เห็นฟ้าสูงขึ้นแต่ภาพแบนลง
  pitchOffset: 3,                // [panorama] เลื่อนภาพขึ้น(+)/ลง(-) เป็นองศา — ให้แถบทองของภาพตรงกับขอบฟ้าจริง
  span: 140, bottom: -4,         // [backdrop เท่านั้น] ภาพกว้างกี่องศา / ขอบล่างของภาพอยู่กี่องศาเหนือขอบฟ้า
 tint: [0.98, 1.02, 1.16],
brightness: 1.16,
  sunGlow: 0,                    // 0–1 เพิ่มแสงเรืองทับ ตรงตำแหน่งดวงอาทิตย์ตามมุมแสงที่ตั้งไว้ด้านล่าง (ภาพมีดวงอาทิตย์ของตัวเองแล้ว จึงตั้ง 0)
},

sun: {
  azimuth: -90,
  elevation: 47,
  color: [1.0, 0.97, 0.74],
  intensity: 2.8,
},

ambient: {
  intensity: 0.78,
  sky: [0.68, 0.82, 1.0],
  ground: [0.58, 0.54, 0.46],
},

  // เงาทอดยาวและมีรายละเอียด
  shadows: {
    enabled: true,
    size: 2048,
    radius: 95,
    darkness: 0.22,
    filter: 'pcf',
    quality: 'medium',
    bias: 0.0003,
    normalBias: null,
    refreshEvery: 1,
    casterRefresh: 0.25,
  },

  // ตัวละคร มอนสเตอร์ และวัตถุที่ทอดเงา
  casters: {
    characters: true,
    monsters: true,
    props: [
      '^palm',
      '^pine$',
      '^tree$',
      '^tower(L|M)?$',
      '^house(L)?$',
      '^tent$',
      '^mast(L|M)?$',
      '^ship(L)?$',
      '^wreck$',
      '^wall(L|Win)?$',
      '^gateL?$',
      '^tBase(L|M)?$',
      '^tMidW(L|M)?$',
      '^tTop(L|M)?$',
      '^tRoof(L|M)?$',
      '^flag(H|P|N)(L)?$',
      '^platform$',
      '^pirateCastleDoor$',
      '^pirateStructureFence(Sides)?$',
      '^pirateTowerMiddle$',
      '^campLadder$',
      '^campRocks(High|Low|Ramp)$',
      '^skFence(Doorway|Fortified)?$',
      '^skChest$',
      '^skBarrel(Open)?$',
      '^skBox(Large)?(Open)?$',
    ],
    exclude:
      'fx|puff|slash|particle|spark|trail|debug|helper|gizmo|hpbar|bar$|^ph$|ring|grip|shadow',
  },

  // พื้นดินรับเงา
  receivers: {
    terrain: true,
  },
};




// ---------- แผนที่: สร้างด้วยโค้ด ----------
const GW = 183, GH = 114;
const wx = c => (c - GW / 2) * 4;
const wz = r => (GH / 2 - r) * 4;

const MAP = (() => {
  const g = Array.from({ length: GH }, () => Array(GW).fill('.'));
  const put = (c, r, ch) => { if (c >= 0 && r >= 0 && c < GW && r < GH) g[r][c] = ch; };
  const rect = (c1, r1, c2, r2, ch) => { for (let r = r1; r < r2; r++) for (let c = c1; c < c2; c++) put(c, r, ch); };
  const nz = (c, r) => Math.sin(c * 0.31 + r * 0.17) * 0.9 + Math.sin(c * 0.13 - r * 0.29 + 2) * 0.8 + Math.sin(c * 0.07 + r * 0.11 + 5) * 1.1;
  const blob = (c1, r1, c2, r2, rad, amp, ch) => {
    const mx = (c1 + c2) / 2, mr = (r1 + r2) / 2, hx = (c2 - c1) / 2 - rad, hr = (r2 - r1) / 2 - rad;
    for (let r = r1 - 3; r < r2 + 3; r++) for (let c = c1 - 3; c < c2 + 3; c++) {
      const qx = Math.abs(c + 0.5 - mx) - hx, qr = Math.abs(r + 0.5 - mr) - hr;
      const d = Math.hypot(Math.max(qx, 0), Math.max(qr, 0)) + Math.min(Math.max(qx, qr), 0) - rad;
      if (d + amp * nz(c, r) * 0.5 < 0) put(c, r, ch);
    }
  };
  const plate = (c1, r1, c2, r2, ch, nw, ne) => {
    for (let r = r1; r < r2; r++) for (let c = c1; c < c2; c++) {
      if ((c - c1) + (r - r1) < nw || (c2 - 1 - c) + (r - r1) < ne) continue;
      put(c, r, ch);
    }
  };
  const isle = (c, r, rc, rr) => blob(c - rc, r - rr, c + rc, r + rr, Math.min(rc, rr) - 1, 1.2, ',');

  blob(9, 45, 177, 91, 14, 2.4, ',');
  blob(15, 45, 172, 69, 9, 1.6, 'g');
  rect(22, 45, 166, 69, 'g');
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (g[r][c] === 'g' && (r < 45 || r >= 69)) g[r][c] = r >= 69 ? ',' : '.';
  plate(30, 9, 104, 45, 'h', 6, 0);
  plate(107, 9, 161, 45, 'A', 0, 6);
  for (let r = 9; r < 44; r++) for (let c = 30; c < 161; c++) {
    if (c >= 100 && c <= 110) continue;
    const edge = r < 13 || (c < 34) || (c > 156);
    if (edge && nz(c, r) > 1.5) g[r][c] = '.';
  }

  // ลบลานเกาะส่วนต่อขยายด้านหลังปราสาทออก ไม่สร้างเกาะยื่นแยกเพิ่ม

  rect(104, 0, 107, 96, '.');
  [14, 55, 64, 78].forEach(r => rect(104, r, 107, r + 1, '='));

  [[86, 92], [120, 126], [144, 150]].forEach(([a, b]) => rect(a, 45, b, 46, '^'));
  [[38, 44], [82, 88], [134, 140]].forEach(([a, b]) => rect(a, 69, b, 70, '^'));

  rect(50, 88, 76, 94, 'p'); rect(62, 94, 65, 107, 'p');
  rect(82, 88, 98, 93, 'p'); rect(88, 93, 91, 105, 'p');
  rect(176, 54, 182, 57, 'p');

  isle(145, 103, 8, 6);
  isle(20, 100, 5, 4);
  isle(166, 96, 6, 4);
  isle(13, 33, 7, 6);

  return g.map(row => row.join(''));
})();

// f=ไฟล์ใต้ assets/, s=scale, r=รัศมีชน, dy=ยกสูง/ต่ำ, inst=โมเดลซ้ำ

const PREFABS = {
  knight:{f:'characters/Knight.glb',s:1,char:true}, rogue:{f:'characters/Rogue.glb',s:1,char:true},
  barbarian:{f:'characters/Barbarian.glb',s:1,char:true}, mage:{f:'characters/Mage.glb',s:1,char:true},
  barrel:{f:'world/pirate/barrel.glb',s:1.2,r:.7}, crate:{f:'world/pirate/crate.glb',s:1.2,r:.7},
  crateB:{f:'world/pirate/crate-bottles.glb',s:1.2,r:.7},
  palmBend:{f:'world/pirate/palm-bend.glb',s:1,r:.5}, palmStr:{f:'world/pirate/palm-straight.glb',s:1,r:.5},
  palmDB:{f:'world/pirate/palm-detailed-bend.glb',s:1,r:.5}, palmDS:{f:'world/pirate/palm-detailed-straight.glb',s:1,r:.5},
  wall:{f:'world/pirate/castle-wall.glb',s:1,r:1.2}, wallWin:{f:'world/pirate/castle-window.glb',s:1,r:1.2},
  gate:{f:'world/pirate/castle-gate.glb',s:1}, tower:{f:'world/pirate/tower-complete-large.glb',s:1,r:1.9},
  tBase:{f:'world/pirate/tower-base.glb',s:1,r:1.8}, tMidW:{f:'world/pirate/tower-middle-windows.glb',s:1},
  tTop:{f:'world/pirate/tower-top.glb',s:1}, tRoof:{f:'world/pirate/tower-roof.glb',s:1},
  roof:{f:'world/pirate/structure-roof.glb',s:1}, house:{f:'world/pirate/structure.glb',s:1.6,r:2.2},
  mast:{f:'world/pirate/mast.glb',s:1,r:1}, flagH:{f:'world/pirate/flag-high.glb',s:1},
  flagP:{f:'world/pirate/flag-pirate.glb',s:1}, flagN:{f:'world/pirate/flag-pennant.glb',s:1},
  platform:{f:'world/pirate/platform.glb',s:2,r:1},
  rockA:{f:'world/pirate/rocks-a.glb',s:.7,r:1.6,inst:true}, rockB:{f:'world/pirate/rocks-b.glb',s:.7,r:1.6,inst:true},
  rockC:{f:'world/pirate/rocks-c.glb',s:.8,r:1.4,inst:true}, rockSA:{f:'world/pirate/rocks-sand-a.glb',s:.7,r:1.6,inst:true},
  rockSB:{f:'world/pirate/rocks-sand-b.glb',s:.7,r:1.6,inst:true}, rockSC:{f:'world/pirate/rocks-sand-c.glb',s:.8,r:1.4,inst:true},
  grass:{f:'world/pirate/grass.glb',s:2.5,inst:true}, ship:{f:'world/pirate/ship-pirate-medium.glb',s:1},
  shipL:{f:'world/pirate/ship-pirate-large.glb',s:1}, wreck:{f:'world/pirate/ship-wreck.glb',s:1},
  tent:{f:'world/camp/Tent.glb',s:2.5,r:1.5}, target:{f:'world/camp/target.glb',s:2.5,r:.7},
  pine:{f:'world/camp/Tree-high.glb',s:2.2,r:.5}, tree:{f:'world/camp/tree.glb',s:2,r:.5},
  fenceE:{f:'world/camp/fence.glb',s:4,inst:true}, dock:{f:'world/pirate/structure.glb',s:1.6,inst:true},
  bridge:{f:'world/camp/bridge.glb',s:4,dy:-1.85},
  wallL:{f:'world/pirate/castle-wall.glb',s:3,r:3.6}, wallWinL:{f:'world/pirate/castle-window.glb',s:3,r:3.6},
  gateL:{f:'world/pirate/castle-gate.glb',s:3},
  towerL:{f:'world/pirate/tower-complete-large.glb',s:3,r:5.7}, towerM:{f:'world/pirate/tower-complete-large.glb',s:2.4,r:4.6},
  tBaseL:{f:'world/pirate/tower-base.glb',s:3,r:5.4}, tMidWL:{f:'world/pirate/tower-middle-windows.glb',s:3},
  tTopL:{f:'world/pirate/tower-top.glb',s:3}, tRoofL:{f:'world/pirate/tower-roof.glb',s:3},
  tBaseM:{f:'world/pirate/tower-base.glb',s:2.4,r:4.3}, tMidWM:{f:'world/pirate/tower-middle-windows.glb',s:2.4},
  tTopM:{f:'world/pirate/tower-top.glb',s:2.4}, tRoofM:{f:'world/pirate/tower-roof.glb',s:2.4},
  flagHL:{f:'world/pirate/flag-high.glb',s:2.5}, flagNL:{f:'world/pirate/flag-pennant.glb',s:2.2}, flagPL:{f:'world/pirate/flag-pirate.glb',s:2},
  houseL:{f:'world/pirate/structure.glb',s:2.4,r:3.3}, mastL:{f:'world/pirate/mast.glb',s:1.8,r:1.4},
  rockSAL:{f:'world/pirate/rocks-sand-a.glb',s:1.7,r:3.4,inst:true}, rockSBL:{f:'world/pirate/rocks-sand-b.glb',s:1.7,r:3.4,inst:true},
  rockSCL:{f:'world/pirate/rocks-sand-c.glb',s:1.8,r:3,inst:true},
  seaA:{f:'world/pirate/rocks-a.glb',s:2.2,inst:true}, seaB:{f:'world/pirate/rocks-b.glb',s:2.2,inst:true}, seaC:{f:'world/pirate/rocks-c.glb',s:2.4,inst:true},
    // ===== PIRATE — โมเดลจากชุด Pirate =====
  pirateCastleDoor:{f:'world/pirate/castle-door.glb',s:1},
  piratePatchGrass:{f:'world/pirate/patch-grass.glb',s:1},
  piratePatchSandFoliage:{f:'world/pirate/patch-sand-foliage.glb',s:1},
  piratePatchSand:{f:'world/pirate/patch-sand.glb',s:1},
  piratePlatformPlanks:{f:'world/pirate/platform-planks.glb',s:1},
  pirateStructureFenceSides:{f:'world/pirate/structure-fence-sides.glb',s:1},
  pirateStructureFence:{f:'world/pirate/structure-fence.glb',s:1},
  pirateTowerMiddle:{f:'world/pirate/tower-middle.glb',s:1},

  // ===== CAMP — โมเดลจากชุด Camp =====
  campLadder:{f:'world/camp/ladder.glb',s:1},
  campPatchDirt:{f:'world/camp/patch-dirt.glb',s:1},
  campRocksHigh:{f:'world/camp/rocks-high.glb',s:1},
  campRocksLow:{f:'world/camp/rocks-low.glb',s:1},
  campRocksRamp:{f:'world/camp/rocks-ramp.glb',s:1},
    // ===== SURVIVEKIT — โมเดลจากชุด SurviveKit =====

  skBarrelOpen:{f:'world/survivekit/barrel-open.glb',s:1},
  skBarrel:{f:'world/survivekit/barrel.glb',s:1},
  skBedrollFrame:{f:'world/survivekit/bedroll-frame.glb',s:1},
  skBedrollPacked:{f:'world/survivekit/bedroll-packed.glb',s:1},
  skBedroll:{f:'world/survivekit/bedroll.glb',s:1},
  skBottleLarge:{f:'world/survivekit/bottle-large.glb',s:1},
  skBottle:{f:'world/survivekit/bottle.glb',s:1},
  skBoxLargeOpen:{f:'world/survivekit/box-large-open.glb',s:1},
  skBoxLarge:{f:'world/survivekit/box-large.glb',s:1},
  skBoxOpen:{f:'world/survivekit/box-open.glb',s:1},
  skBox:{f:'world/survivekit/box.glb',s:1},
  skBucket:{f:'world/survivekit/bucket.glb',s:1},

  skCampfireFishingStand:{f:'world/survivekit/campfire-fishing-stand.glb',s:1},
  skCampfirePit:{f:'world/survivekit/campfire-pit.glb',s:1},
  skCampfireStand:{f:'world/survivekit/campfire-stand.glb',s:1},
  skChest:{f:'world/survivekit/chest.glb',s:1},

  skFenceDoorway:{f:'world/survivekit/fence-doorway.glb',s:1},
  skFenceFortified:{f:'world/survivekit/fence-fortified.glb',s:1},
  skFence:{f:'world/survivekit/fence.glb',s:1},

  skFishLarge:{f:'world/survivekit/fish-large.glb',s:1},
  skFish:{f:'world/survivekit/fish.glb',s:1},

  skFloorHole:{f:'world/survivekit/floor-hole.glb',s:1},
  skFloorOld:{f:'world/survivekit/floor-old.glb',s:1},
  skFloor:{f:'world/survivekit/floor.glb',s:1},

  skGrassLarge:{f:'world/survivekit/grass-large.glb',s:1},
  skGrass:{f:'world/survivekit/grass.glb',s:1},

  skMetalPanelNarrow:{f:'world/survivekit/metal-panel-narrow.glb',s:1},
  skMetalPanelScrewsHalf:{f:'world/survivekit/metal-panel-screws-half.glb',s:1},
  skMetalPanelScrewsNarrow:{f:'world/survivekit/metal-panel-screws-narrow.glb',s:1},
  skMetalPanelScrews:{f:'world/survivekit/metal-panel-screws.glb',s:1},
  skMetalPanel:{f:'world/survivekit/metal-panel.glb',s:1},

  skPatchGrassLarge:{f:'world/survivekit/patch-grass-large.glb',s:1},
  skPatchGrass:{f:'world/survivekit/patch-grass.glb',s:1},

  skResourcePlanks:{f:'world/survivekit/resource-planks.glb',s:1},
  skResourceStoneLarge:{f:'world/survivekit/resource-stone-large.glb',s:1},
  skResourceStone:{f:'world/survivekit/resource-stone.glb',s:1},
  skResourceWood:{f:'world/survivekit/resource-wood.glb',s:1},

  skRockA:{f:'world/survivekit/rock-a.glb',s:1},
  skRockB:{f:'world/survivekit/rock-b.glb',s:1},
  skRockC:{f:'world/survivekit/rock-c.glb',s:1},
  skRockFlatGrass:{f:'world/survivekit/rock-flat-grass.glb',s:1},
  skRockFlat:{f:'world/survivekit/rock-flat.glb',s:1},
  skRockSandA:{f:'world/survivekit/rock-sand-a.glb',s:1},
  skRockSandB:{f:'world/survivekit/rock-sand-b.glb',s:1},
  skRockSandC:{f:'world/survivekit/rock-sand-c.glb',s:1},

  skSignpostSingle:{f:'world/survivekit/signpost-single.glb',s:1},
  skSignpost:{f:'world/survivekit/signpost.glb',s:1},

  skStructureCanvas:{f:'world/survivekit/structure-canvas.glb',s:1},
  skStructureFloor:{f:'world/survivekit/structure-floor.glb',s:1},
  skStructureMetalDoorway:{f:'world/survivekit/structure-metal-doorway.glb',s:1},
  skStructureMetalFloor:{f:'world/survivekit/structure-metal-floor.glb',s:1},
  skStructureMetalRoof:{f:'world/survivekit/structure-metal-roof.glb',s:1},
  skStructureMetalWall:{f:'world/survivekit/structure-metal-wall.glb',s:1},
  skStructureMetal:{f:'world/survivekit/structure-metal.glb',s:1},
  skStructureRoof:{f:'world/survivekit/structure-roof.glb',s:1},
  skStructure:{f:'world/survivekit/structure.glb',s:1},

  skTentCanvasHalf:{f:'world/survivekit/tent-canvas-half.glb',s:1},
  skTentCanvas:{f:'world/survivekit/tent-canvas.glb',s:1},
  skTent:{f:'world/survivekit/tent.glb',s:1},

  skToolAxeUpgraded:{f:'world/survivekit/tool-axe-upgraded.glb',s:1},
  skToolAxe:{f:'world/survivekit/tool-axe.glb',s:1},
  skToolHammerUpgraded:{f:'world/survivekit/tool-hammer-upgraded.glb',s:1},
  skToolHammer:{f:'world/survivekit/tool-hammer.glb',s:1},
  skToolHoeUpgraded:{f:'world/survivekit/tool-hoe-upgraded.glb',s:1},
  skToolHoe:{f:'world/survivekit/tool-hoe.glb',s:1},
  skToolPickaxeUpgraded:{f:'world/survivekit/tool-pickaxe-upgraded.glb',s:1},
  skToolPickaxe:{f:'world/survivekit/tool-pickaxe.glb',s:1},
  skToolShovelUpgraded:{f:'world/survivekit/tool-shovel-upgraded.glb',s:1},
  skToolShovel:{f:'world/survivekit/tool-shovel.glb',s:1},

  skTreeAutumnTall:{f:'world/survivekit/tree-autumn-tall.glb',s:1},
  skTreeAutumnTrunk:{f:'world/survivekit/tree-autumn-trunk.glb',s:1},
  skTreeAutumn:{f:'world/survivekit/tree-autumn.glb',s:1},
  skTreeLogSmall:{f:'world/survivekit/tree-log-small.glb',s:1},
  skTreeLog:{f:'world/survivekit/tree-log.glb',s:1},
  skTreeTall:{f:'world/survivekit/tree-tall.glb',s:1},
  skTreeTrunk:{f:'world/survivekit/tree-trunk.glb',s:1},
  skTree:{f:'world/survivekit/tree.glb',s:1},

  skWorkbenchAnvil:{f:'world/survivekit/workbench-anvil.glb',s:1},
  skWorkbenchGrind:{f:'world/survivekit/workbench-grind.glb',s:1},
  skWorkbench:{f:'world/survivekit/workbench.glb',s:1},
};

// ===== หมู่บ้านในโซน NPC / สุ่มผล — ใช้เฉพาะโมเดลใน assets/mediavalbuid (KayKit Medieval Hexagon) เท่านั้น =====
// s = สเกล (ใหญ่กว่าผู้เล่นชัดเจน; แก้เลขเดียวปรับทั้งประเภท)  |  r = รัศมีชน
Object.assign(PREFABS, {
  bHomeA:{f:'mediavalbuid/building_home_A_blue.gltf',s:18.75,r:11.5},
  bHomeB:{f:'mediavalbuid/building_home_B_blue.gltf',s:18.75,r:11.5},
  bTavern:{f:'mediavalbuid/building_tavern_blue.gltf',s:20,r:13},
  bMarket:{f:'mediavalbuid/building_market_blue.gltf',s:20,r:13},
  bBlacksmith:{f:'mediavalbuid/building_blacksmith_blue.gltf',s:19,r:12.5},
  bLumber:{f:'mediavalbuid/building_lumbermill_blue.gltf',s:20,r:13},
  bChurch:{f:'mediavalbuid/building_church_blue.gltf',s:21.25,r:14},
  bCastleBlue:{f:'mediavalbuid/building_castle_blue.gltf',s:18.75,r:20},
  bWindmill:{f:'mediavalbuid/building_windmill_blue.gltf',s:20,r:13},
  bWatermill:{f:'mediavalbuid/building_watermill_blue.gltf',s:19.5,r:13},
});

// ===== โมเดลตกแต่ง: ใช้เฉพาะ world/camp, world/platform, world/survivekit (ไม่มี pirate) — inst:true = instance ประหยัดโหลด =====
// สเกลปรับให้เข้ากับอาคารใหญ่ (บ้าน s≈18) — แก้เลข s ที่นี่ที่เดียว | ตัวแปรขนาดต่างกัน (…B / …S) ใช้ไฟล์เดียวกัน ไม่เพิ่มการโหลด
Object.assign(PREFABS, {
  // Platform Kit
  dcBarrel:{f:'world/platform/barrel.glb',s:3.2,inst:true}, dcCrate:{f:'world/platform/crate.glb',s:3,inst:true},
  dcFlowers:{f:'world/platform/flowers.glb',s:3.2,inst:true}, dcFlowersB:{f:'world/platform/flowers.glb',s:2.3,inst:true}, dcFlowersT:{f:'world/platform/flowers-tall.glb',s:3,inst:true},
  dcPlant:{f:'world/platform/plant.glb',s:3.2,inst:true}, dcPlantB:{f:'world/platform/plant.glb',s:2.3,inst:true},
  dcHedge:{f:'world/platform/hedge.glb',s:4,inst:true}, dcSign:{f:'world/platform/sign.glb',s:3,inst:true},
  dcStones:{f:'world/platform/stones.glb',s:3,inst:true}, dcRocksS:{f:'world/platform/rocks.glb',s:2.6,inst:true},
  dcTreeA:{f:'world/platform/tree.glb',s:5,inst:true},
  // Camp Kit
  dcPine:{f:'world/camp/Tree-high.glb',s:4.4,inst:true}, dcPineS:{f:'world/camp/Tree-high.glb',s:3.4,inst:true},
  dcFlag:{f:'world/camp/flag.glb',s:3.6,inst:true}, dcTent:{f:'world/camp/Tent.glb',s:3.6,r:2},
  // Survival Kit
  dcCampfire:{f:'world/survivekit/campfire-pit.glb',s:2.8,inst:true}, dcBedroll:{f:'world/survivekit/bedroll.glb',s:2.6,inst:true},
  dcBox:{f:'world/survivekit/box.glb',s:2.6,inst:true}, dcBoxL:{f:'world/survivekit/box-large.glb',s:3,inst:true}, dcChest:{f:'world/survivekit/chest.glb',s:3,inst:true},
  dcLog:{f:'world/survivekit/tree-log.glb',s:3.2,inst:true}, dcLogS:{f:'world/survivekit/tree-log-small.glb',s:3,inst:true},
  dcWood:{f:'world/survivekit/resource-wood.glb',s:2.8,inst:true}, dcPlanks:{f:'world/survivekit/resource-planks.glb',s:2.8,inst:true},
  dcBucket:{f:'world/survivekit/bucket.glb',s:2.4,inst:true}, dcAxe:{f:'world/survivekit/tool-axe.glb',s:2.4,inst:true}, dcHammer:{f:'world/survivekit/tool-hammer.glb',s:2.4,inst:true},
  dcSignpost:{f:'world/survivekit/signpost.glb',s:3.2,inst:true},
  dcBench:{f:'world/survivekit/workbench.glb',s:3.4,inst:true}, dcAnvil:{f:'world/survivekit/workbench-anvil.glb',s:3.4,inst:true}, dcGrind:{f:'world/survivekit/workbench-grind.glb',s:3.4,inst:true},
  // เพิงไม้: structure (4 เสา) + structure-roof (หลังคาไม้กระดาน) วางที่จุดเดียวกัน / structure-canvas = หลังคาผ้าใบ (แผงตลาด)
  dcMush:{f:'world/platform/mushrooms.glb',s:3,inst:true},
  dcStructL:{f:'world/survivekit/structure.glb',s:9.5,inst:true}, dcRoofL:{f:'world/survivekit/structure-roof.glb',s:9.5,inst:true},   // ศาลา Mage (ใหญ่กว่าศาลาอื่น)
  dcStruct:{f:'world/survivekit/structure.glb',s:5.5,inst:true}, dcRoof:{f:'world/survivekit/structure-roof.glb',s:5.5,inst:true}, dcCanvas:{f:'world/survivekit/structure-canvas.glb',s:5.5,inst:true},
});


const MON_DIR = {blob:'monster/blob/',big:'monster/big/',fly:'monster/flying/'};
const MON_FACE = 0;
const SIZE = {npc:.6,mini:.7,large:.95,sub:1.8,boss:3};
const MON = {
  mush:['blob','Mushnub',SIZE.npc,0,.5], npcPink:['blob','PinkBlob',SIZE.npc,0,.5],
  npcGreen:['blob','GreenBlob',SIZE.npc,0,.5], cat:['blob','Cat',SIZE.npc,0,.4],
  dog:['blob','Dog',SIZE.npc,0,.4], chicken:['blob','Chicken',SIZE.npc,0,.4],
  pink:['blob','PinkBlob',SIZE.mini], gblob:['blob','GreenBlob',SIZE.mini], fish:['blob','Fish',SIZE.mini],
  birb:['blob','Birb',SIZE.mini], pigeon:['blob','Pigeon',SIZE.mini], spiky:['blob','GreenSpikyBlob',SIZE.mini],
  mushE:['blob','Mushnub_Evolved',SIZE.mini], cactoro:['blob','Cactoro',SIZE.mini], alien:['blob','Alien',SIZE.mini],
  orcB:['blob','Orc',SIZE.mini], ninjaB:['blob','Ninja',SIZE.mini], wizard:['blob','Wizard',SIZE.mini],
  ghost:['fly','Ghost',SIZE.mini,1], ghostSkull:['fly','Ghost_Skull',SIZE.mini,1], demonF:['fly','Demon',SIZE.mini,1],
  hywirl:['fly','Hywirl',SIZE.mini,1], squidle:['fly','Squidle',SIZE.mini,1], glub:['fly','Glub',SIZE.mini,.8],
  goleling:['fly','Goleling',SIZE.mini,.8],
  yeti:['big','Yeti',SIZE.large], orcL:['big','Orc',SIZE.large], ninjaL:['big','Ninja',SIZE.large],
  cactoroL:['big','Cactoro',SIZE.large], alienL:['big','Alien',SIZE.large], frog:['big','Frog',SIZE.large],
  bunny:['big','Bunny',SIZE.large], monkroose:['big','Monkroose',SIZE.large],
  demon:['big','Demon',SIZE.sub], blueDemon:['big','BlueDemon',SIZE.sub],
  alpakingE:['fly','Alpaking_Evolved',SIZE.sub*.8,1.8], armabeeE:['fly','Armabee_Evolved',SIZE.sub*.8,1.8],
  golelingE:['fly','Goleling_Evolved',SIZE.sub*.8,1.5], dragonE:['fly','Dragon_Evolved',SIZE.sub,2.2],
  kingMush:['big','MushroomKing',SIZE.boss*1.1], dino:['big','Dino',SIZE.boss],
  orcSkull:['big','Orc_Skull',SIZE.boss*.95], tribal:['big','Tribal',SIZE.boss*.9],
};
for (const [k,[d,n,s,hv,r]] of Object.entries(MON))
  PREFABS[k]={f:MON_DIR[d]+n+'.gltf',s,mon:true,fo:MON_FACE,hover:hv||0,...(r?{r}:{})};

const MOB_AI = {
  rogue:{aggro:4.5,leash:8,hp:60}, barbarian:{aggro:6,leash:10,hp:120},
  dummy:{aggro:16.5,leash:27,hp:250}, speed:3.5,turn:10,respawn:3,
};
const T=(aggro,leash,hp,speed,reach)=>({aggro,leash,hp,speed,reach});
Object.assign(MOB_AI,{
  pink:T(4,8,30),gblob:T(4,8,35),fish:T(3.5,7,25),birb:T(4.5,8,30),pigeon:T(4.5,8,30),
  spiky:T(5,9,70),mushE:T(5,9,90),cactoro:T(5,9,80),alien:T(5,9,75),orcB:T(5,9,90),
  ninjaB:T(5.5,10,110),wizard:T(6,10,100),ghost:T(5.5,10,90),ghostSkull:T(6,10,110),
  demonF:T(6,11,130),hywirl:T(5.5,10,100),squidle:T(5.5,10,100),glub:T(5,9,80),goleling:T(5,9,140),
  yeti:T(6.5,11,220),orcL:T(6,10.5,170),ninjaL:T(6.5,11,160),cactoroL:T(6,10.5,150),
  alienL:T(6,10.5,150),frog:T(5.5,10,140),bunny:T(5.5,10,130),monkroose:T(6,10.5,160),
  demon:T(8,13,700,3,2.6),blueDemon:T(8,13,700,3,2.6),
  alpakingE:T(8,14,500,3.2,2.4),armabeeE:T(8,14,500,3.2,2.4),
  golelingE:T(8,14,550,3,2.4),dragonE:T(9,15,900,3.2,2.8),
  kingMush:T(9,15,2500,2.6,3.8),dino:T(9,15,1500,3.2,3.4),
  orcSkull:T(9,15,1400,3,3.2),tribal:T(9,15,1300,3,3.2),
});

// ===== ปราสาท: ขยาย ×3 + เติมรั้วและตกแต่ง =====

function castle(cx,cz) {
  const o=[],add=(k,x,z,h,t,dy)=>o.push([k,cx+x,cz+z,h,t,dy]);
  const S=6;
  for(const s of [-1,1]) for(let x=9;x<=33;x+=S) add('wallL',s*x,-24,Math.PI);
  add('gateL',0,-24,Math.PI);
  for(let x=-33;x<=33;x+=S) add(Math.abs(x)<6?'wallWinL':'wallL',x,24,0);
  for(const s of [-1,1]) for(let z=-18;z<=18;z+=S) add('wallL',s*36,z,Math.PI/2);
  for(const sx of [-1,1]) for(const sz of [-1,1]) add('towerL',sx*36,sz*24,0);
  for(const s of [-1,1]) add('towerM',s*21,-28,0);
  for(const s of [-1,1]) {
    const x=s*18,z=10;
    add('tBaseL',x,z,0,undefined,0); add('tMidWL',x,z,0,undefined,6);
    add('tTopL',x,z,0,undefined,12); add('tRoofL',x,z,0,undefined,20.34);
  }
  // ลานและพื้นที่รอบปราสาทเว้นโล่ง ไม่มีต้นไม้ สิ่งก่อสร้างเสริม หรือของตกแต่ง
  return o;
}
function lighthouse(x,z){
  return [['tBaseM',x,z,0],['tMidWM',x,z,0,undefined,4.8],['tTopM',x,z,0,undefined,9.6],['tRoofM',x,z,0,undefined,16.27]];
}
const at=(k,tag,pts)=>pts.map(([x,z,h=Math.PI])=>[k,x,z,h,tag]);
const pack=(cx,cz,...m)=>m.map(([k,dx,dz,h=Math.PI])=>[k,cx+dx,cz+dz,h,'mob']);
const mobAt=(k,pts)=>at(k,'mob',pts);
const npcs=(k,pts)=>at(k,'npc',pts);
const npcTo=(k,x,z,tx,tz)=>[[k,x,z,Math.atan2(tx-x,tz-z),'npc']];
const line=(k,x1,z1,x2,z2,n,h=0)=>Array.from({length:n},(_,j)=>{const t=n===1?0:j/(n-1);return[k,x1+(x2-x1)*t,z1+(z2-z1)*t,h];});
const ring=(k,cx,cz,r,n,a0=0)=>Array.from({length:n},(_,j)=>{const a=a0+j*Math.PI*2/n;return[k,cx+Math.cos(a)*r,cz+Math.sin(a)*r,a*1.7];});


const CASTLE=[-12,108];
const TOWN=[168,118];
const ARENA=[132,0];

const PATHS=[
  [[-262,6],[300,6]],
  [[-12,6],[-12,60],[-12,84]],
  [[-12,66],[-60,66],[-60,170],[62,170]],
  [[62,170],[106,170],[106,112],[168,112]],
  [[126,6],[126,100],[168,100],[168,112]],[[222,6],[222,100],[168,100]],
  [[-202,6],[-202,-46]],[[-26,6],[-26,-46]],[[182,6],[182,-46]],
  [[-202,-86],[300,-86]],
  [[-26,-46],[-26,-126]],[[-112,-86],[-112,-126]],
];

const KEEPOUT=[
  [-92,44,50,146],[-66,146,2,182],[-132,98,-78,142],
  [66,52,272,186],
  [76,-32,186,32],[228,-30,270,38],[-266,-12,-226,46],[-278,-24,-220,26],
  [-172,-152,-60,-96],[-44,-152,28,-96],[330,-8,364,18],
  [-330,-20,-278,48],[278,-24,326,30],
  [196,-200,232,-168],
];
const RINGS=[[CASTLE[0],CASTLE[1],'#c0392b',9],[ARENA[0],ARENA[1],'#e67e22',6]];

const TX=TOWN[0],TZ=TOWN[1];
// ===== หมู่บ้าน (โซน NPC / สุ่มผล) — บ้านเรียงสองข้างทางเดิน หันหน้าเข้าหาทาง เว้นกลางเมืองโล่ง =====
// ที่ราบสูงเมือง: x 62..278, z 48..192 | กลางเมือง (168,118) มี Mage → ไม่วางอะไรใกล้จุดกลาง
// ทางเดินในเมือง (ตรงกับ PATHS ด้านบน) — บ้านถูกวางห่างจากเส้นทาง ~11 หน่วย และ "หันหน้าเข้าหาทางที่ใกล้ที่สุดอัตโนมัติ"
const TOWN_ROADS=[
  [[126,52],[126,100]], [[126,100],[222,100]], [[222,52],[222,100]],      // ถนนประตูตะวันตก/ตะวันออก + ถนนใหญ่ z=100
  [[168,100],[168,112]], [[106,112],[168,112]],                          // ทางเข้าลานกลาง
  [[106,112],[106,170]], [[62,170],[106,170]],                           // ถนนฝั่งตะวันตก + ทางสะพาน
];
// หันหน้า (แกน +Z ของโมเดล) เข้าหาจุดที่ใกล้ที่สุดบนทางเดิน แล้วปัดเป็นทิศหลัก 4 ทิศ (ใต้/เหนือ/ตะวันตก/ออก) ให้เรียบร้อย
const townFaceRoad=(x,z)=>{
  let best=1e9,bx=x,bz=z;
  for(const [[x1,z1],[x2,z2]] of TOWN_ROADS){
    const t=Math.max(0,Math.min(1,((x-x1)*(x2-x1)+(z-z1)*(z2-z1))/((x2-x1)**2+(z2-z1)**2||1)));
    const px=x1+(x2-x1)*t,pz=z1+(z2-z1)*t,d=Math.hypot(x-px,z-pz);
    if(d<best){best=d;bx=px;bz=pz;}
  }
  return Math.round(Math.atan2(bx-x,bz-z)/(Math.PI/2))*(Math.PI/2);
};
const townB=(k,x,z,h)=>[k,x,z,h===undefined?townFaceRoad(x,z):h];
// ตำแหน่ง/ทิศของ Mage NPC (ศาลาคลุมตัวเขาใช้ค่าเดียวกัน → หันทิศเดียวกันเสมอ) — เลื่อนลงใต้ 10 หน่วยจากกลางเมือง จะได้ชิดกลุ่มตกแต่ง
const MAGE_POS=[TX,TZ-10], MAGE_FACE=Math.PI;
