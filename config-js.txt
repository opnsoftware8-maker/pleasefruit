// ===== config.js — เกาะปรับใหม่: พื้นที่ต่อสู้โล่ง + ของตกแต่งเป็นกลุ่ม =====
const CFG = {
  base: 'assets/',
  faceOffset: 0,
  speed: 6,
  cell: 4,
  step: 2,
  cam: { fov: Math.PI / 2, pitch: 60, dist: 105 },
  scale: 1.25,
  fenceStep: 2,
  farFreeze: 80,
  anims: ['characters/Rig_Medium_General.glb', 'characters/Rig_Medium_MovementBasic.glb'],
};

// MAP ใช้ระบบเดิม 61 x 38 ช่อง; ไม่เปลี่ยนระบบความสูง/การชนใน game.js
// . น้ำ | , ทรายระดับ 0 | g หญ้าระดับ 2 | h/A พื้นสูงระดับ 4 | ลูกศร ทางลาด | = สะพาน | p ท่าเรือ
const MAP = [
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
];

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
  fenceE:{f:'world/camp/fence.glb',s:3.4,inst:true}, dock:{f:'world/pirate/structure.glb',s:1.6,inst:true},
  bridge:{f:'world/camp/bridge.glb',s:4,dy:-1.85},
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

function castle(cx,cz) {
  const o=[],add=(k,x,z,h,t,dy)=>o.push([k,cx+x,cz+z,h,t,dy]);
  for(const s of [-1,1]) for(let x=3;x<=11;x+=2) add('wall',s*x,-8,Math.PI);
  add('gate',0,-8,Math.PI);
  for(let x=-11;x<=11;x+=2) add(Math.abs(x)<2?'wallWin':'wall',x,8,0);
  for(const s of [-1,1]) for(let z=-6;z<=6;z+=2) add('wall',s*12,z,Math.PI/2);
  for(const sx of [-1,1]) for(const sz of [-1,1]) add('tower',sx*12,sz*8,0);
  add('tBase',-6,3,0,undefined,0);add('tMidW',-6,3,0,undefined,2);
  add('tTop',-6,3,0,undefined,4);add('tRoof',-6,3,0,undefined,6.78);
  add('flagH',-2.5,-10.5,0);add('flagH',2.5,-10.5,0);
  add('barrel',6,5,0);add('crate',8,4,.5);add('crateB',8,6.2,1);
  return o;
}
const at=(k,tag,pts)=>pts.map(([x,z,h=Math.PI])=>[k,x,z,h,tag]);
const pack=(cx,cz,...m)=>m.map(([k,dx,dz,h=Math.PI])=>[k,cx+dx,cz+dz,h,'mob']);
const mobAt=(k,pts)=>at(k,'mob',pts);
const npcs=(k,pts)=>at(k,'npc',pts);
const npcTo=(k,x,z,tx,tz)=>[[k,x,z,Math.atan2(tx-x,tz-z),'npc']];
const line=(k,x1,z1,x2,z2,n,h=0)=>Array.from({length:n},(_,j)=>{const t=n===1?0:j/(n-1);return[k,x1+(x2-x1)*t,z1+(z2-z1)*t,h];});

// ทางเดินกว้างเดิม เชื่อมโซนหลัก
const PATHS=[
  [[-46,26],[-46,2]],[[-76,2],[96,2]],[[32,2],[32,26]],[[64,2],[64,26]],
  [[10,26],[78,26]],[[-2,14],[-2,44]],[[-54,2],[-54,-30]],
  [[-6,2],[-6,-40]],[[-6,-30],[-32,-30],[-32,-40]],[[56,2],[56,-40]],
];

// จัดใหม่: โซนต่อสู้แต่ละจุดมีพื้นที่ว่างรอบจุดเกิดมอน; ของตกแต่งย้ายไปเป็นกลุ่มริมขอบ
const PLACE=[
  // ปราสาทและลานบอส
  ...castle(-46,34),
  ...pack(-46,34,['kingMush',0,0],['ghost',7,-4]),
  ...mobAt('demon',[[-62,22]]),...mobAt('blueDemon',[[-22,38]]),...mobAt('dragonE',[[-46,54]]),
  ['flagH',-50,20,0],['flagH',-42,20,0],

  // เมือง NPC: อาคารอยู่ตามขอบ ลานกลางเมืองโล่ง
  ['mage',32,32,Math.PI,'npc'],['roof',32,37,0],
  ['house',18,38,Math.PI],['house',58,38,Math.PI],['house',18,54,Math.PI],['house',58,54,Math.PI],
  ['barrel',27,31,0],['crate',37,31,.4],['crateB',38.2,32.2,1],
  ['flagN',29,40,0],['flagN',35,40,0],['tower',12,58,0],['tower',76,58,0],['tower',76,22,0],
  ['palmDS',10,44,0],['palmDB',70,44,0],['palmStr',10,28,0],['palmBend',70,28,0],
  ...npcTo('mush',19,55,44,38),...npcTo('npcGreen',71,55,44,38),
  ['barrel',22,57,0],['crate',68,57,.4],
  ...npcTo('cat',41,19,32,20),
  ...npcTo('chicken',-2,43,-2,28),['flagH',-6,44,0],['flagH',2,44,0],

  // ลานทดสอบสกิล: พื้นที่กลางโล่ง เป้าซ้อมอยู่ริมลาน
  ['barbarian',44,0,Math.PI,'dummy'],
  ['target',34,-7,Math.PI],['target',44,-8,Math.PI],['target',54,-7,Math.PI],
  ['target',32,7,Math.PI],['target',56,7,Math.PI],
  ['tent',62,-12,2.5],['barrel',59,-12,0],['pine',28,12,0],
  ...npcTo('dog',59,-9,44,0),...npcTo('mush',11,6,0,2),

  // ค่ายฝั่งตะวันออก: มอนอยู่กลางลาน ไม่ล้อมด้วยต้นไม้
  ['tent',100,7,.2],['tent',101,-8,-.2],['flagP',96,12,0],['barrel',103,2,0],
  ...pack(86,0,['tribal',0,0],['cactoroL',-5,3],['yeti',5,-3]),

  // ป่าตะวันตก: ค่ายของตกแต่งชิดขอบ ปล่อยวงต่อสู้ตรงกลาง
  ['tent',-96,11,.6],['tent',-91,5,-.4],['barrel',-94,7,0],['platform',-98,1,.3],['crate',-96,2,0],
  ...pack(-80,0,['orcSkull',0,0],['orcL',6,-4],['orcB',5,4]),
  ...pack(-82,11,['frog',-2,-1],['frog',3,1]),

  // ทุ่งกลาง: เว้นช่องว่างกว้างรอบบอสและมอน
  ...pack(-26,-8,['dino',0,0],['rogue',-5,5]),
  ...pack(-48,-9,['barbarian',2,1],['bunny',-4,-3]),

  // ชายหาดและท่าเรือ
  ['house',-44,-31,0],['barrel',-36,-31,0],['crate',-33,-32,.7],['crateB',-30,-31,.2],
  ['mast',-40.5,-40.5,0],['flagP',-23.5,-40.5,0],['barrel',-24,-43,0],['crate',-40,-43,.5],
  ['mast',-9,-40.5,1],['flagP',-1,-40.5,0],['barrel',11,-34,0],['crate',8,-33,.3],
  ['mast',51,-40.5,.5],['flagP',61,-40.5,0],['barrel',60,-43,0],['crate',52,-43,.4],['crateB',66,-34,.2],
  ...npcTo('npcGreen',-22,-37,-32,-42),...npcTo('mush',62,-37,56,-42),
  ...line('palmStr',-84,-21,-60,-21,3),...line('palmDS',20,-21,48,-21,3),
  ...pack(-75,-27,['pink',-3,2],['pink',3,-1],['fish',0,-4]),

  // เรืออยู่นอกแนวชายฝั่ง
  ['rockSA',-104,12,0],['palmBend',-105.5,10.5,0],['rockSB',108,-46,0],['palmStr',106,-43.5,0],
  ['palmDS',-79,-51,0],['rockSC',-76.5,-53.5,0],
  ['shipL',110,2,Math.PI/2],['ship',-112,-10,Math.PI/2],
  ['ship',-26.5,-52,0],['shipL',1.2,-52,0],['shipL',61.2,-52,0],['wreck',30,-52,.5],
];

// ของตกแต่งเป็นหย่อมตามขอบโซน ไม่สุ่มทับกลางสนามต่อสู้
const SCATTER=[
  ['pine',9,-101,-17,-92,18,11],['tree',4,-100,-18,-91,18,23],
  ['pine',7,-65,-16,-55,15,12],['tree',3,-64,-16,-54,15,24],
  ['rockA',3,-68,-14,-54,14,5],['rockC',3,-68,-14,-54,14,9],
  ['pine',4,24,-14,29,14,17],['rockC',2,24,-14,29,14,19],
  ['pine',5,72,-14,79,14,21],['tree',3,72,-14,79,14,25],
  ['rockB',2,72,-14,79,14,27],['rockC',2,72,-14,79,14,29],
  ['pine',5,-78,20,-69,60,31],['pine',5,-27,20,-17,60,32],['pine',4,-61,49,-31,60,33],
  ['rockB',2,-78,20,-17,60,34],['rockC',2,-78,20,-17,60,35],
  ['palmStr',3,9,20,13,60,41],['palmDS',3,74,20,78,60,42],
  ['rockSA',2,14,56,76,60,43],['palmStr',2,14,56,76,60,44],
  ['palmStr',3,-88,-38,-82,-23,7],['palmDS',2,-88,-38,-82,-23,31],
  ['palmStr',2,-30,-38,-23,-22,13],['palmDS',3,76,-38,91,-22,37],
  ['palmStr',3,76,-38,91,-22,14],['rockSA',2,-88,-38,91,-22,3],
  ['rockSB',2,-88,-38,91,-22,4],['rockSC',2,-88,-38,91,-22,6],
  ['grass',24,-91,-14,-84,14,51],['grass',12,-78,20,-17,60,52],
];

// ชื่อโซนบน HUD
const ZONES=[
  {name:'โซนบอส (ปราสาท)',x:-46,z:36,r:28},
  {name:'โซน NPC / สุ่มผล',x:44,z:38,r:40},
  {name:'หุบเขากลาง',x:-2,z:32,r:16},
  {name:'โซนทดสอบสกิล',x:44,z:0,r:22},
  {name:'ทุ่งตะวันออก',x:86,z:0,r:18},
  {name:'ป่ามอนสเตอร์',x:-76,z:0,r:22},
  {name:'ทุ่งมอนสเตอร์',x:-36,z:-2,r:24},
  {name:'ชายหาด',x:0,z:-30,r:100},
];
