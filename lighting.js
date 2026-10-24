// ===== src/lighting.js — แสงอาทิตย์ + แสงเติม + เงาเรียลไทม์ (เบา เหมาะกับมือถือ) =====
// ต้องใส่ <script src="src/lighting.js"></script> ต่อจาก config.js และก่อน game.js
// ปรับค่าที่ LIGHTING_CONFIG ใน config.js (ไม่ต้องแก้ไฟล์นี้)
//
// หลักการ
//  • ใช้ไฟเดิมของฉาก (DirectionalLight + HemisphericLight) ปรับค่า ไม่สร้างซ้ำ — ถ้าไม่มีค่อยสร้างให้
//  • ShadowGenerator ตัวเดียว ขนาดเริ่มต้น 1024 (PCF คุณภาพต่ำ ถ้า WebGL2 รองรับ ไม่งั้น Poisson)
//  • แผนที่ใหญ่มาก → กรอบเงาเป็นสี่เหลี่ยมคงที่ ตามผู้เล่น/กล้อง และปัดตำแหน่งเป็นช่อง texel กันเงาสั่นตอนเดิน
//  • ตัวที่ทอดเงา = ตัวละคร, มอนสเตอร์ และโมเดลสำคัญตามรายชื่อ (config) / พื้นรับเงา / เอฟเฟกต์-พาร์ติเคิล-ดีบักไม่ทอดเงา
//  • ทอดเงาเฉพาะตัวที่อยู่ในรัศมีใกล้ (ตรวจทุก ~0.25 วิ) ไม่สร้างของใหม่ในแต่ละเฟรม
const Lighting = (() => {
  const DEF = {
    enabled: true, brightness: 1, debug: false,
    sun: { azimuth: -39, elevation: 57, color: [1, 0.95, 0.82], intensity: 1.0 },
    ambient: { intensity: 0.5, sky: [0.85, 0.92, 1], ground: [0.45, 0.42, 0.38] },
    shadows: { enabled: true, size: 1024, radius: 90, darkness: 0.25, filter: 'pcf', quality: 'low',
      bias: 0.0004, normalBias: null, refreshEvery: 1, casterRefresh: 0.25 },
    casters: { characters: true, monsters: true, props: ['^palm', '^pine$', '^tree$', '^tower(L|M)?$', '^house(L)?$', '^tent$', '^mast(L)?$', '^ship(L)?$', '^wreck$'],
      exclude: 'fx|puff|slash|particle|spark|trail|debug|helper|gizmo|hpbar|bar$|^ph$|ring|grip|shadow' },
    receivers: { terrain: true }
  };
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const merge = (a, b) => { const o = Object.assign({}, a); for (const k in (b || {})) o[k] = isObj(o[k]) && isObj(b[k]) ? merge(o[k], b[k]) : b[k]; return o; };

  let S = null;   // สถานะทั้งหมด (null = ยังไม่ init / dispose แล้ว)

  // ---------- เริ่มระบบ ----------
  function init(scene, opts) {
    if (S) dispose();
    const B = (opts && opts.B) || BABYLON;
    const user = typeof LIGHTING_CONFIG !== 'undefined' ? LIGHTING_CONFIG : {};
    S = { B, scene, engine: (opts && opts.engine) || scene.getEngine(), cfg: merge(DEF, user), hemi: null, sun: null, ownHemi: false, ownSun: false,
      gen: null, sig: '', entries: [], map: new Map(), receivers: new Set(), propRx: [], excludeRx: null, acc: 1e9,
      dir: new B.Vector3(0, -1, 0), right: new B.Vector3(1, 0, 0), up: new B.Vector3(0, 0, 1), dist: 0 };
    // ตรวจไฟที่มีอยู่แล้วก่อน — ใช้ตัวเดิม ไม่สร้างซ้ำ
    const lights = scene.lights || [];
    S.sun = lights.find(l => l instanceof B.DirectionalLight) || null;
    S.hemi = lights.find(l => l instanceof B.HemisphericLight) || null;
    if (!S.sun) { S.sun = new B.DirectionalLight('sun', new B.Vector3(0, -1, 0), scene); S.ownSun = true; }
    if (!S.hemi) { S.hemi = new B.HemisphericLight('ambient', new B.Vector3(0, 1, 0), scene); S.ownHemi = true; }
    if (lights.filter(l => l instanceof B.DirectionalLight).length > 1) console.warn('[lighting] มี DirectionalLight หลายดวง — ปรับและทอดเงาเฉพาะดวงแรก');
    scene.onDisposeObservable.addOnce(dispose);
    configure();
    if (S.cfg.debug) console.info('[lighting] เปิดแล้ว | แดด ' + S.sun.intensity.toFixed(2) + ' + แสงเติม ' + S.hemi.intensity.toFixed(2) + ' | เงา ' + (S.gen ? S.cfg.shadows.size + (S.gen.usePercentageCloserFiltering ? ' PCF' : ' Poisson') : 'ปิด'));
    return api;
  }

  // ---------- ตั้งค่าไฟ/เงาจาก cfg (เรียกซ้ำได้ตอนปรับค่า) ----------
  function configure() {
    const { B, cfg, sun, hemi } = S, C = a => new B.Color3(a[0], a[1], a[2]);
    S.propRx = (cfg.casters.props || []).map(s => new RegExp(s, 'i'));
    S.excludeRx = cfg.casters.exclude ? new RegExp(cfg.casters.exclude, 'i') : null;
    // แสงอาทิตย์ (azimuth: ทิศที่แสง "เคลื่อนไป" 0 = +Z, 90 = +X / elevation: องศาเหนือขอบฟ้า)
    const az = cfg.sun.azimuth * Math.PI / 180, el = cfg.sun.elevation * Math.PI / 180;
    S.dir.set(Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    sun.direction = S.dir.clone();                                   // ใช้ setter (ไม่แก้ในที่) ให้ Babylon รู้ว่าไฟเปลี่ยน
    sun.diffuse = C(cfg.sun.color); sun.specular = C(cfg.sun.color); sun.intensity = cfg.enabled ? cfg.sun.intensity * cfg.brightness : 0;
    // แสงเติมเบา ๆ ให้ส่วนในเงายังอ่านออก
    hemi.diffuse = C(cfg.ambient.sky); hemi.groundColor = C(cfg.ambient.ground); hemi.specular = B.Color3.Black();
    hemi.intensity = cfg.ambient.intensity * cfg.brightness;   // brightness = ปุ่มหมุนความสว่างรวม (คูณทั้งแดดและแสงเติม)
    // แกนของระนาบเงา (ใช้ปัดตำแหน่งตาม texel)
    B.Vector3.CrossToRef(B.Vector3.Up(), S.dir, S.right); S.right.normalize();
    B.Vector3.CrossToRef(S.dir, S.right, S.up); S.up.normalize();
    // พื้นรับเงา
    S.receivers.forEach(m => { m.receiveShadows = !!(cfg.enabled && cfg.shadows.enabled); });
    // สร้างเงาใหม่เฉพาะเมื่อค่าที่ต้องสร้างใหม่เปลี่ยน
    const c = cfg.shadows, sig = [cfg.enabled, c.enabled, c.size, c.filter, c.quality, c.radius, c.bias, c.normalBias, c.refreshEvery, c.darkness].join('|');
    if (sig !== S.sig) { S.sig = sig; buildShadow(); }
  }

  function buildShadow() {
    const { B, cfg, sun } = S, c = cfg.shadows;
    if (S.gen) { S.gen.dispose(); S.gen = null; }
    if (!cfg.enabled || !c.enabled) { sun.shadowEnabled = false; return; }
    const gen = new B.ShadowGenerator(c.size, sun);
    const gl2 = (S.engine.webGLVersion || 1) >= 2;
    if (c.filter === 'pcf' && gl2) {                                 // PCF (ต้อง WebGL2)
      gen.usePercentageCloserFiltering = true;
      gen.filteringQuality = { low: B.ShadowGenerator.QUALITY_LOW, medium: B.ShadowGenerator.QUALITY_MEDIUM, high: B.ShadowGenerator.QUALITY_HIGH }[c.quality] ?? B.ShadowGenerator.QUALITY_LOW;
    } else if (c.filter !== 'none') gen.usePoissonSampling = true;   // WebGL1 / ไม่รองรับ PCF → Poisson (เบาและใกล้เคียง)
    const R = c.radius, texel = 2 * R / c.size;
    gen.bias = c.bias;
    gen.normalBias = c.normalBias == null ? texel * 0.6 : c.normalBias;   // ≈ 0.6 texel กัน acne โดยเงาไม่ลอยจากตัว
    gen.setDarkness(c.darkness);
    gen.transparencyShadow = false; gen.forceBackFacesOnly = false;
    // กรอบเงาแบบคงที่ (ไม่คำนวณจากทั้งแผนที่ 700+ หน่วย) → ความละเอียดสูงในรัศมีรอบผู้เล่น
    S.dist = R * 1.4;
    sun.autoUpdateExtends = false; sun.autoCalcShadowZBounds = false;
    sun.shadowFrustumSize = 2 * R; sun.shadowMinZ = 1; sun.shadowMaxZ = S.dist + R * 2.2;   // ครอบความสูงของหอ/ปราสาท
    sun.shadowEnabled = true;
    const sm = gen.getShadowMap(); sm.refreshRate = Math.max(1, c.refreshEvery | 0); sm.renderList.length = 0;
    S.gen = gen; S.acc = 1e9;                                        // บังคับจัดรายการตัวทอดเงาใหม่ในเฟรมหน้า
  }

  // ---------- ตัวทอดเงา / ตัวรับเงา ----------
  // register(root, key, prefab) — game.js เรียกหลัง spawn โมเดล (โหลดทีหลังก็ได้) ตัดสินใจเองว่าควรทอดเงาไหม
  function register(root, key, p) {
    if (!S || !p || p.inst) return 0;                                // ของซ้ำเยอะ (รั้ว/หิน/หญ้า) ไม่ทอดเงา
    const cs = S.cfg.casters;
    const ok = p.char ? cs.characters : p.mon ? cs.monsters : S.propRx.some(r => r.test(key));
    return ok ? addCaster(root) : 0;
  }
  // addCaster(meshOrNode) — เพิ่มตัวทอดเงาเอง (รวมลูก) เช่นอาวุธ ถ้าต้องการ  / removeCaster(meshOrNode)
  function addCaster(node) {
    if (!S) return 0;
    const list = node.getChildMeshes ? node.getChildMeshes(false) : [];
    if (node.getTotalVertices) list.unshift(node);
    let n = 0;
    for (const m of list) {
      if (S.map.has(m) || !m.getTotalVertices || m.getTotalVertices() === 0 || m.getClassName() === 'InstancedMesh') continue;
      if (S.excludeRx && S.excludeRx.test(m.name || '')) continue;
      if (m.metadata && m.metadata.noShadow) continue;
      m.computeWorldMatrix(true);                                    // ให้ตำแหน่งสัมบูรณ์พร้อมก่อนตรวจระยะ (ครั้งเดียวตอนลงทะเบียน)
      const e = { m, obs: m.onDisposeObservable.addOnce(() => removeCaster(m)) };
      S.entries.push(e); S.map.set(m, e); n++;
    }
    if (n) S.acc = 1e9;
    return n;
  }
  function removeCaster(node) {
    if (!S) return;
    const list = node.getChildMeshes ? node.getChildMeshes(false) : [];
    if (node.getTotalVertices) list.unshift(node);
    for (const m of list) {
      const e = S.map.get(m); if (!e) continue;
      S.map.delete(m); m.onDisposeObservable.remove(e.obs);
      const i = S.entries.indexOf(e); if (i >= 0) { S.entries[i] = S.entries[S.entries.length - 1]; S.entries.pop(); }
    }
    S.acc = 1e9;
  }
  function addReceiver(mesh) { if (!S) return; S.receivers.add(mesh); mesh.receiveShadows = !!(S.cfg.enabled && S.cfg.shadows.enabled); }

  // ---------- เรียกทุกเฟรม: ย้ายกรอบเงาตามกล้อง + จัดรายการตัวทอดเงาใกล้ ๆ ----------
  function update(dt, f) {
    if (!S || !S.gen) return;
    const c = S.cfg.shadows, R = c.radius, texel = 2 * R / c.size, d = S.dir, r = S.right, u = S.up;
    // ปัดตำแหน่งตามช่อง texel ในระนาบแสง → เงาไม่สั่น/ว่ายตอนกล้องเลื่อน
    const px = Math.round((f.x * r.x + f.y * r.y + f.z * r.z) / texel) * texel;
    const py = Math.round((f.x * u.x + f.y * u.y + f.z * u.z) / texel) * texel;
    const pd = f.x * d.x + f.y * d.y + f.z * d.z - S.dist;
    S.sun.position.copyFromFloats(r.x * px + u.x * py + d.x * pd, r.y * px + u.y * py + d.y * pd, r.z * px + u.z * py + d.z * pd);
    // เลือกเฉพาะตัวทอดเงาในรัศมี (ใช้อาร์เรย์เดิม ไม่สร้างใหม่)
    S.acc += dt;
    if (S.acc < c.casterRefresh) return;
    S.acc = 0;
    const rl = S.gen.getShadowMap().renderList, lim = (R * 1.3) * (R * 1.3);
    rl.length = 0;
    for (let i = 0; i < S.entries.length; i++) {
      const m = S.entries[i].m, p = m.getAbsolutePosition(), dx = p.x - f.x, dz = p.z - f.z;
      if (dx * dx + dz * dz <= lim) rl.push(m);
    }
  }

  // ---------- ปรับค่าตอนเกมรัน เช่น Lighting.set({ sun: { elevation: 40 }, shadows: { size: 2048 } }) ----------
  function set(patch) { if (!S) return; S.cfg = merge(S.cfg, patch); configure(); }

  // ---------- ล้างทุกอย่าง ----------
  function dispose() {
    if (!S) return;
    const s = S; S = null;
    if (s.gen) s.gen.dispose();
    s.sun.shadowEnabled = false;
    s.entries.forEach(e => e.m.onDisposeObservable.remove(e.obs));
    s.receivers.forEach(m => { m.receiveShadows = false; });
    s.entries.length = 0; s.map.clear(); s.receivers.clear();
    if (s.ownSun) s.sun.dispose();                                   // ไฟที่ระบบนี้สร้างเองเท่านั้นที่ถูกทิ้ง (ไฟเดิมของฉากคงอยู่)
    if (s.ownHemi) s.hemi.dispose();
  }

  const api = { init, register, addCaster, removeCaster, addReceiver, update, set, dispose,
    get config() { return S && S.cfg; }, get casterCount() { return S ? S.entries.length : 0; },
    get shadowGenerator() { return S && S.gen; } };
  return api;
})();
