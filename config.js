// ===== config.js — เกาะขยาย X/Z ×3 (183 x 114 ช่อง = 732 x 456 หน่วย) ตามภาพอ้างอิง =====
// ขนาดของตกแต่ง/ตัวละคร/มอนสเตอร์เท่าเดิม — ขยายเฉพาะพื้นที่เกาะ ปราสาท ชายหาด ที่ราบสูง ฯลฯ
const CFG = {
  base: 'assets/',
  faceOffset: 0,
  speed: 9,
  cell: 4,
  lv: { ',': 0, g: 3, h: 6, A: 6, p: 0 },
  step: 3,
  cam: { fov: Math.PI / 2, pitch: 59, dist: 150 },
  scale: 1.25,
  fenceStep: 1, // เติมรั้วทุกช่วง ไม่เว้นช่อง
  farFreeze: 90,
  pathW: 5,
  seaSize: 1600,
  farClip: 900,
  anims: ['characters/Rig_Medium_General.glb', 'characters/Rig_Medium_MovementBasic.glb'],
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

  // ที่ราบสูงส่วนต่อขยายด้านหลังปราสาท ขนาด 5×4 ช่อง (20×16 หน่วย)
  // แผ่นหลัก 5×4 ช่อง; ทำทางเชื่อมแคบเพียง 1 ช่องที่ด้านใต้เพื่อไม่ขยายลานเกินขนาด
  rect(76, 3, 81, 7, 'h');
  rect(76, 7, 77, 9, 'h');

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
  roof:{f:'world/pirate/structure-roof.glb',s:1.8}, house:{f:'world/pirate/structure.glb',s:1.6,r:2.2},
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
};

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
  // ลานด้านในใช้เต็นท์แทนอาคารเพิ่ม ให้ดูเป็นค่ายทหารและคงพื้นที่สู้บอสตรงกลางโล่ง
  add('tent',-26,-9,.15); add('tent',26,-9,-.15);
  // เสบียงจัดเป็นกองเล็ก ๆ ชิดผนัง ไม่วางกลางทางเดิน
  add('barrel',30,17,0); add('crate',29,20,.5);
  add('barrel',-30,18,0); add('crate',-29,21,.3);
  add('flagHL',-9,-32,0); add('flagHL',9,-32,0);
  for(let k=0;k<3;k++) for(const s of [-1,1]) add('flagNL',s*8,-38-9*k,0);
  add('tent',-36,-48,.4); add('tent',36,-48,-.4);
  add('barrel',-28,-46,0); add('barrel',29,-46,0); add('crate',-42,-44,.5);
  add('target',-54,-34,Math.PI); add('target',54,-34,Math.PI);

  // ต้นไม้และโขดหินรอบนอกเป็นกลุ่มสลับชนิด เว้นประตูและแกนทางเดินกลางไว้โล่ง
  for(const s of [-1,1]) {
    add('pine',s*49,-14,0); add('tree',s*51,3,0); add('pine',s*49,19,0);
    add('rockA',s*48,31,.3); add('rockB',s*53,35,1.1); add('rockSAL',s*57,-31,.6);
    add('pine',s*44,-2,.2); add('tree',s*46,7,.7); add('rockC',s*44,14,1.2);
  }
  add('flagPL',-30,-17,0); add('flagPL',30,-17,0);
  // เก็บของจุกจิกออกจากแกนกลางของลาน; เพิ่มเต็นท์ค่ายอีกคู่ไว้ชิดด้านหลัง
  add('tent',-18,13,.2); add('tent',18,13,-.2);
  add('barrel',-30,4,0); add('crate',-30,8,.3);
  add('barrel',30,4,0); add('crateB',30,8,.6);
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
  [[-12,150],[-36,174],[-60,188],[-60,200]], // ทางขึ้น/ทางเดินไปที่ราบสูงด้านหลัง
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
  [-88,184,-30,232], // กันการสุ่มทับที่ราบสูงส่วนต่อขยาย/ทางเดิน
];
const RINGS=[[CASTLE[0],CASTLE[1],'#c0392b',9],[ARENA[0],ARENA[1],'#e67e22',6]];

const TX=TOWN[0],TZ=TOWN[1];
const TOWN_PROPS=[
  ['mage',TX,TZ-6,Math.PI,'npc'],['roof',TX,TZ-1,0],
  ...[[140,154],[172,154],[204,154],[236,154],[250,132],[250,100],[76,136],[76,96],[150,70],[194,70]].map(([x,z])=>['houseL',x,z,Math.PI]),
  ...[[84,64],[252,64],[252,188],[84,188]].map(([x,z])=>['towerM',x,z,0]),
  ['flagNL',150,108,0],['flagNL',186,108,0],['flagHL',TX-10,TZ-30,0],['flagHL',TX+10,TZ-30,0],
  ['barrel',146,124,0],['crate',152,126,.4],['crateB',153.2,127.2,1],['barrel',190,124,0],['crate',184,126,.4],['crate',188.5,128,1.2],
  ['palmDS',72,118,0],['palmDB',262,116,0],['palmStr',72,150,0],['palmBend',262,148,0],['palmDS',100,60,0],['palmStr',236,60,0],
  ...npcTo('mush',120,150,TX,112),...npcTo('npcGreen',216,150,TX,112),...npcTo('cat',190,92,TX,112),
  ['rockSAL',96,188,0],['rockSBL',150,184,1],['rockSCL',196,184,2],['rockSAL',240,184,3],['rockSBL',266,146,4],['rockSCL',70,150,5],
  ['rockSAL',266,92,6],['rockSBL',70,100,7],['rockSAL',210,186,.5],['rockSCL',126,186,1.5],
];

const PLACE=[
  // ===== ปราสาท =====
  ...castle(CASTLE[0],CASTLE[1]),
  ...pack(CASTLE[0],CASTLE[1],['kingMush',0,0],['ghost',21,-12]),
  // มอนสเตอร์ประจำที่ราบสูงส่วนต่อขยายด้านหลัง (เว้นทางเดินหลัก)
  ...pack(-52,210,['golelingE',-3,0],['ghostSkull',3,1],['dragonE',0,5]),
  ...pack(-52,206,['orcL',-3,0],['ghost',3,0]),
  ...pack(-52,214,['tribal',-3,0],['spiky',3,0]),
  // ยามมอนสเตอร์อยู่ด้านข้างปราสาท ไม่ยืนขวางประตูหรือแกนกลางลาน
  ...pack(-82,112,['orcB',0,0],['ghostSkull',-5,6],['golelingE',5,6]),
  ...pack(34,112,['ninjaB',0,0],['wizard',5,6],['cactoroL',-5,6]),
  ...mobAt('demon',[[-80,66]]),...mobAt('blueDemon',[[40,114]]),...mobAt('dragonE',[[-88,160]]),
  ...npcTo('chicken',6,58,CASTLE[0],84),
  ...pack(-62,106,['pink',0,0],['gblob',8,-6],['spiky',-7,-10]),
  ...pack(38,108,['pink',0,0],['gblob',8,-7],['mushE',-7,9]),
  ...ring('rockB',-104,120,16,8),['wall',-104,136,0],['wall',-88,120,Math.PI/2],['wall',-120,120,Math.PI/2],
  ['towerM',34,180,0],['towerM',34,160,0],['flagHL',34,170,0],['towerM',78,180,0],['towerM',78,160,0],['flagHL',78,170,0],

  // ===== แนวหลังสุด: ที่ราบสูง 5×4 ช่อง + ทางลาด =====
  ['rockA',-82,188,.2],['rockB',-78,184,.8],['rockC',-45,207,1.4],
  ['rockSAL',-80,181,.4],['rockSBL',-44,207,1.1],['pine',-84,187,0],['tree',-36,187,.5],
  ['pine',-84,181,0],['tree',-36,181,.8],['flagNL',-60,214,0],
  ['tent',-58,214,.2],['tent',-46,214,-.2],
  ['barrel',-80,178,0],['crate',-76,178,.4],['crateB',-44,203,.8],

  // ===== เมือง NPC =====
  ...TOWN_PROPS,

  // ===== ลานทดสอบสกิล =====
  ['barbarian',ARENA[0],ARENA[1],Math.PI,'dummy'],
  ['target',102,-21,Math.PI],['target',132,-24,Math.PI],['target',162,-21,Math.PI],['target',96,21,Math.PI],['target',168,21,Math.PI],
  ['tent',186,-36,2.5],['barrel',177,-36,0],['crate',181,-40,.5],
  ...npcTo('dog',177,-27,ARENA[0],ARENA[1]),...npcTo('mush',33,18,0,2),

  // ===== ค่ายตะวันออก =====
  ['tent',250,18,.2],['tent',252,-24,-.2],['flagPL',240,36,0],['barrel',266,17,0],['crate',254,-8,.4],
  ...pack(300,0,['tribal',0,0],['cactoroL',-15,9],['yeti',15,-9]),
  ...pack(286,24,['pink',0,0],['gblob',9,-5],['spiky',-8,-8]),

  // ===== ป่าตะวันตก =====
  ['tent',-250,30,.6],['tent',-238,12,-.4],['barrel',-244,18,0],['platform',-258,-18,.3],['crate',-254,-10,0],
  ...pack(-300,0,['orcSkull',0,0],['orcL',18,-12],['orcB',15,12]),
  ...pack(-304,33,['frog',-6,-3],['frog',9,3]),
  ...pack(-286,22,['pink',0,0],['gblob',9,-5],['mushE',-8,-8]),

  // ===== ทุ่งกลาง =====
  ...pack(-78,-24,['dino',0,0],['rogue',-15,15]),
  ...pack(-144,-27,['barbarian',6,3],['bunny',-12,-9]),
  ...pack(-190,28,['pink',0,0],['gblob',9,-6],['fish',-6,-9]),
  ...pack(-40,-28,['birb',0,0],['pigeon',8,5]),
  ...pack(95,-30,['spiky',0,0],['mushE',9,5]),
  ...pack(205,30,['ninjaB',0,0],['wizard',9,5]),
  ...pack(-75,-58,['pink',-9,6],['pink',9,-3],['fish',0,-12]),

  // ===== ชายหาด + ท่าเรือ =====
  ['houseL',-150,-104,Math.PI],['barrel',-130,-100,0],['crate',-124,-102,.7],['crateB',-118,-100,.2],
  ['houseL',150,-104,Math.PI],['barrel',130,-100,0],['crate',124,-102,.3],['crateB',170,-100,.5],
  ['barrel',-34,-108,0],['crate',-28,-110,.5],['barrel',20,-106,0],['crate',24,-110,.2],
  ['tent',250,-70,.8],['barrel',240,-72,0],['crate',258,-74,.4],
  ...npcTo('npcGreen',-60,-100,-112,-128),...npcTo('mush',90,-100,-8,-128),
  ['mastL',-160,-127,0],['mastL',-72,-127,.5],['mastL',-160,-145,1],['mastL',-72,-145,0],['flagPL',-150,-127,0],['flagPL',-82,-127,0],
  ['barrel',-98,-132,0],['crate',-92,-136,.4],['crateB',-130,-136,1],['barrel',-136,-130,0],
  ['mastL',-36,-127,1],['mastL',20,-127,0],['mastL',-36,-141,0],['flagPL',-24,-127,0],['flagPL',8,-127,0],['barrel',0,-134,0],['crate',-20,-136,.3],
  ['mastL',340,10,0],['mastL',356,10,0],['flagPL',348,10,0],['barrel',346,2,0],
  ['ship',-124,-178,0],['shipL',-98,-176,0],['ship',-20,-166,0],['shipL',6,-168,0],
  ['wreck',90,-160,.5],['shipL',356,-14,Math.PI/2],['ship',-350,-30,Math.PI/2],

  // ===== เกาะเล็ก + หินกลางทะเล =====
  ...lighthouse(214,-184),
  ['seaB',192,-176,0],['seaA',238,-192,1],['seaC',198,-202,2],['seaA',230,-168,3],['palmDS',204,-176,0],['grass',224,-182,0],['grass',208,-194,1],
  ['palmDS',-286,-172,0],['seaB',-298,-178,0],['seaA',-276,-168,2],
  ['palmStr',298,-156,0],['seaB',306,-160,1],['rockSAL',290,-152,0],
  ['tent',-314,96,.5],['barrel',-306,92,0],['crate',-320,100,.3],['palmDB',-310,104,0],['rockSBL',-322,90,1],
  ['seaA',-344,-20,0],['seaB',-352,70,1],['seaC',-340,150,2],['seaA',-346,-110,3],['seaB',330,-100,1],['seaC',346,60,2],
  ['seaA',-250,-200,0],['seaC',-40,-212,1],['seaB',110,-226,2],['seaA',300,-232,3],['seaB',-90,-222,4],['seaC',340,170,5],['seaA',-330,200,6],
  ['seaB',-300,-120,2],['seaA',260,-130,1],['seaB',-200,-190,3],['seaC',150,-200,0],
];

// ของตกแต่งเป็นหย่อมตามขอบโซน
const SCATTER=[
  ['pine',9,-236,60,-176,184,11],['tree',5,-236,60,-176,184,23],
  ['pine',5,-150,150,40,184,12],['tree',3,-100,150,40,184,13],
  ['pine',4,-20,60,40,160,14],['rockC',3,-66,52,40,160,9],['rockA',3,-66,52,40,160,5],
  ['pine',8,-300,-40,-252,44,21],['tree',4,-300,-40,-252,44,25],
  ['pine',6,-250,34,40,46,31],['pine',5,70,34,290,46,32],
  ['pine',5,-250,-46,40,-34,33],['pine',5,70,-46,300,-34,34],
  ['rockB',3,-250,-46,300,-34,35],['rockC',3,-250,-46,300,-34,36],
  ['pine',6,298,-40,312,40,37],['tree',3,298,-40,312,40,38],
  ['pine',3,-70,-40,-30,-20,39],['pine',3,70,-40,110,-20,40],
  ['palmStr',6,-290,-72,330,-56,41],['palmDS',6,-290,-72,330,-56,42],['palmDB',4,-290,-72,330,-56,43],['palmBend',4,-290,-72,330,-56,44],
  ['rockSA',3,-290,-122,330,-100,45],['rockSB',3,-290,-122,330,-100,46],['rockSC',3,-290,-122,330,-100,47],
  ['grass',24,-290,-100,330,-60,52],['grass',16,-250,-44,300,40,53],
];

const ZONES=[
  {name:'โซนบอส (ปราสาท)',x:CASTLE[0],z:CASTLE[1],r:62},
  {name:'โซน NPC / สุ่มผล',x:TOWN[0],z:TOWN[1],r:100},
  {name:'ที่ราบสูงตะวันตก',x:-110,z:118,r:90},
  {name:'ที่ราบสูงด้านหลังปราสาท',x:-60,z:210,r:32},
  {name:'แม่น้ำกลาง',x:56,z:0,r:30},
  {name:'โซนทดสอบสกิล',x:ARENA[0],z:ARENA[1],r:62},
  {name:'ทุ่งตะวันออก',x:262,z:0,r:56},
  {name:'จุดเกิดมอนสเตอร์ฝั่งซ้าย',x:-300,z:12,r:58},
  {name:'จุดเกิดมอนสเตอร์ฝั่งขวา',x:300,z:12,r:58},
  {name:'ทุ่งมอนสเตอร์',x:-100,z:-6,r:80},
  {name:'ชายหาด',x:0,z:-95,r:330},
];
