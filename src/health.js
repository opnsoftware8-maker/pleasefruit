// ===== src/health.js — ระบบ HP ของมอนสเตอร์/บอส (ไม่รวม NPC) =====
// ใช้จากระบบอื่น:  Health.damage(mob, 40)   Health.heal(mob, 20)   Health.kill(mob)
// ผู้เล่น:        Health.damagePlayer(15)   Health.healPlayer(20)   (ดูหัวข้อ HP ผู้เล่นด้านล่าง)
// ข่าวที่ส่งออก (Events): monster:damaged / monster:dying / monster:killed / monster:respawned
//
// วงจรชีวิต:  alive → (HP ≤ 0) → dying (ลอยขึ้น + ตัวเป็นสีฟ้าเรืองแสง + หดนิดๆ + วงแหวนฟ้า) → dead (ซ่อน รอเวลา) → เกิดใหม่ที่จุดเกิด (เฟดเข้า)
const Health = (() => {
  const T_DYING = 1.5;      // วินาที: ท่าตาย
  const T_SPAWNFADE = 0.7;  // วินาที: เฟดเข้าตอนเกิดใหม่
  const REGEN_DELAY = 5;    // วินาที: ไม่โดนตีนานเท่านี้ + ยืน idle อยู่ → ค่อยๆ ฟื้น HP
  const REGEN_RATE = 0.25;  // ฟื้นต่อวินาที (สัดส่วนของ hpMax)
  const BAR_SHOW_DIST = 40; // แสดงแถบ HP เฉพาะมอนที่อยู่ในระยะนี้
  const DEFAULT_RESPAWN = 3;

  let ctx = null, bars = null, now = 0;
  const pool = [];
  const BLUE = [0.25, 0.75, 1.0];

  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  function init(c) {          // c = { B, scene, engine, cam, canvas, heightAt, mobs }
    ctx = c;
    bars = document.createElement('div');
    bars.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:5';
    document.body.appendChild(bars);
  }

  function register(m) {
    const ai = m.ai || {};
    m.hpMax = ai.hp || m.hpMax || 1;
    m.hp = m.hpMax;
    m.dead = false;          // true ตั้งแต่เริ่มท่าตาย จนกว่าจะเกิดใหม่ (AI จะข้ามตัวนี้)
    m.phase = 'alive';       // alive | dying | dead
    m.lastHit = -999;
  }

  // ---------- ทำดาเมจ / ฟื้น / ฆ่า ----------
  function damage(m, amount, source) {
    if (!m || m.phase !== 'alive' || !(amount > 0)) return 0;
    const before = m.hp;
    m.hp = Math.max(0, m.hp - amount);      // กันค่าติดลบ
    m.lastHit = now;
    Events.emit('monster:damaged', { mob: m, amount: before - m.hp, hp: m.hp, source });
    if (m.hp <= 0) die(m, source);
    return before - m.hp;
  }
  function heal(m, amount) {
    if (!m || m.phase !== 'alive') return;
    m.hp = Math.min(m.hpMax, m.hp + amount);
  }
  function kill(m, source) { damage(m, m.hpMax + (m.hp || 0) + 1, source); }

  // ---------- เริ่มท่าตาย ----------
  function die(m, source) {
    if (m.phase !== 'alive') return;
    const { B, scene } = ctx;
    if (m.hp > 0) m.hp = 0;                  // ถ้ามีบัคค่าติดลบ/ผิดปกติ → บังคับเป็น 0
    m.phase = 'dying'; m.dead = true; m.t = 0;
    m.state = 'idle';
    m.pause();                               // แช่ท่าเดิมไว้ตอนลอย
    const w = m.wrap;
    w.computeWorldMatrix(true);
    const bb = w.getHierarchyBoundingVectors(true);
    const h = Math.min(12, Math.max(1, bb.max.y - bb.min.y));
    const wd = Math.min(14, Math.max(1, Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z)));
    m.deathY = w.position.y; m.rise = Math.max(1.6, h * 0.9);
    m.meshes = w.getChildMeshes();
    // โคลนวัสดุต่อตัว เพื่อไม่ให้ตัวอื่นชนิดเดียวกันเปลี่ยนสีตามไปด้วย (วัสดุเดิมถูกแชร์กัน)
    m.matSwap = []; const cl = new Map();
    m.meshes.forEach(ms => {
      const o = ms.material; if (!o) return;
      let c = cl.get(o);
      if (!c) {
        c = o.clone(o.name + '_die'); cl.set(o, c);
        c.emissiveColor = new B.Color3(0, 0, 0);
        c._ao = c.albedoColor ? [c.albedoColor.r, c.albedoColor.g, c.albedoColor.b] : null;
        c._do = (!c.albedoColor && c.diffuseColor) ? [c.diffuseColor.r, c.diffuseColor.g, c.diffuseColor.b] : null;
        c.disableLighting = false;
      }
      m.matSwap.push([ms, o]); ms.material = c;
    });
    m.clones = [...cl.values()];
    // วงแหวนฟ้าขยายออกที่พื้น
    const ring = B.MeshBuilder.CreateDisc('dring', { radius: 0.5, tessellation: 40 }, scene);
    ring.rotation.x = Math.PI / 2; ring.isPickable = false;
    ring.position.set(w.position.x, w.position.y + 0.08, w.position.z);
    const rm = new B.StandardMaterial('dringm', scene);
    rm.emissiveColor = new B.Color3(...BLUE); rm.diffuseColor = B.Color3.Black(); rm.specularColor = B.Color3.Black();
    rm.disableLighting = true; rm.backFaceCulling = false; rm.alpha = 0.8;
    ring.material = rm; m.ring = ring; m.ringW = wd;
    Events.emit('monster:dying', { mob: m, source });
  }

  function tint(c, k) {                      // k: 0 → ปกติ, 1 → ฟ้าสว่างสุด
    c.emissiveColor.set(BLUE[0] * k, BLUE[1] * k, BLUE[2] * k);
    if (c._ao) { c.albedoColor.set(c._ao[0] + (0.3 - c._ao[0]) * k * 0.6, c._ao[1] + (0.7 - c._ao[1]) * k * 0.6, c._ao[2] + (1 - c._ao[2]) * k * 0.6); }
    else if (c._do) { c.diffuseColor.set(c._do[0] + (0.3 - c._do[0]) * k * 0.6, c._do[1] + (0.7 - c._do[1]) * k * 0.6, c._do[2] + (1 - c._do[2]) * k * 0.6); }
  }
  function setVis(m, v) { v = Math.min(1, Math.max(0, v)); m.meshes.forEach(ms => { ms.visibility = v; }); }

  function tickDying(m, dt) {
    m.t += dt;
    const t = m.t / T_DYING, w = m.wrap;
    w.position.y = m.deathY + m.rise * ease(t);                     // ลอยขึ้น (เร็วก่อน ช้าทีหลัง)
    w.rotation.y += dt * 2.2 * (1 - Math.min(1, t));                // หมุนช้าๆ ตอนลอย
    const k = Math.min(1, m.t / 0.45);                              // 0–0.45 วิ: ค่อยๆ เป็นสีฟ้าสว่าง
    m.clones.forEach(c => tint(c, k));
    const f = Math.max(0, (t - 0.55) / 0.45);                       // ช่วงท้าย 45%: จางหาย + หดลง
    setVis(m, 1 - f); const s = 1 - 0.4 * f; w.scaling.set(s, s, s);
    if (m.ring) {                                                    // วงแหวนขยาย + จาง
      const r = ease(m.t / 0.9), sc = m.ringW * (0.6 + 1.2 * r);
      m.ring.scaling.set(sc, sc, sc); m.ring.material.alpha = 0.8 * (1 - r);
      if (m.t >= 0.9) disposeRing(m);
    }
    if (m.t >= T_DYING) finishDeath(m);
  }
  function disposeRing(m) { if (m.ring) { m.ring.material.dispose(); m.ring.dispose(); m.ring = null; } }

  function finishDeath(m) {
    disposeRing(m);
    m.phase = 'dead'; m.t = 0;
    m.wrap.setEnabled(false);
    const ai = m.ai || {};
    const g = (typeof MOB_AI !== 'undefined') ? MOB_AI.respawn : undefined;
    m.respawnIn = ai.respawn ?? g ?? DEFAULT_RESPAWN;
    hideBar(m);
    Events.emit('monster:killed', { mob: m });
  }

  // ---------- เกิดใหม่ ----------
  function respawn(m) {
    // คืนวัสดุเดิม ทิ้งตัวโคลน
    (m.matSwap || []).forEach(([ms, o]) => { ms.material = o; });
    (m.clones || []).forEach(c => c.dispose());
    m.matSwap = m.clones = null;
    const w = m.wrap;
    w.position.set(m.home.x, ctx.heightAt(m.home.x, m.home.z), m.home.z);
    w.scaling.set(1, 1, 1);
    m.heading = m.homeRot; w.rotation.y = m.homeRot + m.fo;
    m.hp = m.hpMax; m.lastHit = -999;
    m.state = 'idle'; m.far = false;
    w.setEnabled(true);
    setVis(m, 0);
    m.resume(); m.play('idle');
    m.phase = 'alive'; m.dead = false; m.spawnT = 0;
    Events.emit('monster:respawned', { mob: m });
  }

  // ---------- แถบ HP (HTML ลอยเหนือหัว) ----------
  function getBar() {
    let b = pool.pop();
    if (!b) {
      b = document.createElement('div');
      b.style.cssText = 'position:absolute;left:0;top:0;height:7px;background:rgba(0,0,0,.65);border:1px solid rgba(0,0,0,.85);border-radius:4px;overflow:hidden;will-change:transform';
      b.fill = document.createElement('div'); b.fill.style.cssText = 'height:100%;width:100%';
      b.appendChild(b.fill);
    }
    bars.appendChild(b); return b;
  }
  function hideBar(m) { if (m.bar) { m.bar.remove(); pool.push(m.bar); m.bar = null; } }

  const _v = { x: 0, y: 0 };
  function updateBar(m) {
    const { B, scene, engine, cam, canvas } = ctx;
    const p = m.wrap.position, c = cam.position;
    const show = m.phase === 'alive' && m.hp < m.hpMax && m.wrap.isEnabled() &&
      Math.hypot(p.x - c.x, p.z - c.z) < BAR_SHOW_DIST;
    if (!show) { hideBar(m); return; }
    if (m.topY === undefined) {              // ความสูงหัว (วัดครั้งเดียวตอนเริ่มโชว์แถบ)
      m.wrap.computeWorldMatrix(true);
      const bb = m.wrap.getHierarchyBoundingVectors(true);
      m.topY = Math.min(14, Math.max(1, bb.max.y - m.wrap.position.y)) + 0.35;
    }
    const rw = engine.getRenderWidth(), rh = engine.getRenderHeight();
    const s = B.Vector3.Project(new B.Vector3(p.x, p.y + m.topY, p.z), B.Matrix.IdentityReadOnly, scene.getTransformMatrix(), cam.viewport.toGlobal(rw, rh));
    if (s.z < 0 || s.z > 1) { hideBar(m); return; }     // อยู่หลังกล้อง
    const r = canvas.getBoundingClientRect();
    const x = r.left + s.x * (r.width / rw), y = r.top + s.y * (r.height / rh);
    if (!m.bar) { m.bar = getBar(); m.bar.style.width = (m.hpMax >= 500 ? 90 : 52) + 'px'; }
    const q = Math.max(0, m.hp / m.hpMax);
    m.bar.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
    m.bar.fill.style.width = (q * 100) + '%';
    m.bar.fill.style.background = q > 0.5 ? '#4cd964' : q > 0.25 ? '#ffcc00' : '#ff3b30';
  }


  // =====================================================================
  // ===== HP ผู้เล่น (ปรับค่าที่ CFG.player ใน config.js) + สถิติดาเมจ =====
  // =====================================================================
  // ใช้จากระบบอื่น:  Health.damagePlayer(15, source)   Health.healPlayer(20)   Health.player.stats.power
  // ข่าวที่ส่งออก: player:damaged / player:dying / player:revived
  const P = {
    p: null, hp: 100, hpMax: 100, phase: 'alive', lastHit: -999, t: 0, iT: 0, alt: false,
    stats: { power: 1, defense: 0 },     // power = ตัวคูณดาเมจที่ผู้เล่นทำ (combat.js อ่านค่านี้) / defense = ลดดาเมจที่โดน (0–0.9)
    cfg: {}, hud: null
  };
  const PDEF = { hp: 100, regen: 0, regenDelay: 5, respawn: 3, iframe: 0.5, spawn: { x: 0, z: 0 }, stats: {}, debugKeys: false,
    hud: { left: 16, top: 28, width: 190, height: 16 } };

  function bindPlayer(p, cfg) {
    const c = P.cfg = Object.assign({}, PDEF, cfg || {});
    c.hud = Object.assign({}, PDEF.hud, (cfg && cfg.hud) || {});
    Object.assign(P.stats, { power: 1, defense: 0 }, c.stats || {});
    P.p = p; P.hpMax = P.hp = Math.max(1, c.hp); P.phase = 'alive'; p.dead = false;
    const h = P.hud = { bar: document.createElement('div'), fill: document.createElement('div'), txt: document.createElement('div') };
    h.bar.style.cssText = `position:fixed;left:${c.hud.left}px;top:${c.hud.top}px;width:${c.hud.width}px;height:${c.hud.height}px;background:rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.85);border-radius:9px;overflow:hidden;z-index:20;pointer-events:none`;
    h.fill.style.cssText = 'height:100%;width:100%;background:linear-gradient(#6df08a,#2fb85a);transition:width .12s';
    h.txt.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 11px sans-serif;color:#fff;text-shadow:0 1px 2px #000;line-height:${c.hud.height}px`;
    h.bar.append(h.fill, h.txt); document.body.appendChild(h.bar);
    if (c.debugKeys) addEventListener('keydown', e => { if (e.code === 'KeyH') damagePlayer(15, 'debug'); });   // H = โดน 15 (ทดสอบ HP/ท่า hit/ท่าตาย)
    drawHud();
  }
  function drawHud() {
    const h = P.hud; if (!h) return;
    const q = Math.max(0, P.hp / P.hpMax);
    h.fill.style.width = (q * 100) + '%';
    h.fill.style.background = q > 0.5 ? 'linear-gradient(#6df08a,#2fb85a)' : q > 0.25 ? 'linear-gradient(#ffe36b,#e0a812)' : 'linear-gradient(#ff7a70,#d9362c)';
    h.txt.textContent = Math.ceil(P.hp) + ' / ' + P.hpMax;
  }
  function damagePlayer(amount, source) {
    if (!P.p || P.phase !== 'alive' || !(amount > 0)) return 0;
    if (P.p.invuln || P.iT > 0) return 0;                       // อมตะ: ช่วงต้น Dash หรือหลังโดนตีใหม่ๆ
    const dmg = Math.max(1, Math.round(amount * (1 - Math.min(0.9, Math.max(0, P.stats.defense)))));
    P.hp = Math.max(0, P.hp - dmg); P.lastHit = now; P.iT = P.cfg.iframe;
    Events.emit('player:damaged', { amount: dmg, hp: P.hp, source });
    if (P.hp <= 0) { dieP(source); drawHud(); return dmg; }
    const a = P.p.anim;
    if (a && !a.busy()) { a.act(P.alt ? 'hitAlt' : 'hit'); P.alt = !P.alt; }   // กำลังฟันอยู่ (busy) → ไม่ขัดจังหวะท่า
    drawHud(); return dmg;
  }
  function healPlayer(amount) {
    if (!P.p || P.phase !== 'alive' || !(amount > 0)) return;
    P.hp = Math.min(P.hpMax, P.hp + amount); drawHud();
  }
  function dieP(source) {
    P.phase = 'dead'; P.t = 0; P.hp = 0; P.p.dead = true;
    if (P.p.anim) P.p.anim.act('death');                         // ท่าตายค้างจนกว่า dead เป็น false (ดู anim.loco)
    Events.emit('player:dying', { source });
  }
  function revivePlayer() {
    const p = P.p, c = P.cfg, w = p.wrap;
    P.hp = P.hpMax; P.phase = 'alive'; P.iT = 1.2;               // อมตะสั้นๆ หลังเกิดใหม่
    w.position.set(c.spawn.x, c.heightAt ? c.heightAt(c.spawn.x, c.spawn.z) : w.position.y, c.spawn.z);
    p.dead = false;
    if (p.anim) { p.anim.reset(); p.anim.act('spawnGround'); }
    if (typeof Stamina !== 'undefined') Stamina.refill();
    Events.emit('player:revived', {});
    drawHud();
  }
  function updatePlayer(dt) {
    if (!P.p) return;
    if (P.iT > 0) P.iT -= dt;
    if (P.phase === 'dead') { if ((P.t += dt) >= P.cfg.respawn) revivePlayer(); return; }
    if (P.cfg.regen > 0 && P.hp < P.hpMax && now - P.lastHit > P.cfg.regenDelay) { P.hp = Math.min(P.hpMax, P.hp + P.cfg.regen * dt); drawHud(); }
  }

  // ---------- เรียกทุกเฟรม ----------
  function update(dt) {
    if (!ctx) return;
    now += dt;
    updatePlayer(dt);
    for (const m of ctx.mobs) {
      if (m.phase === 'dying') { tickDying(m, dt); continue; }
      if (m.phase === 'dead') { if ((m.t += dt) >= m.respawnIn) respawn(m); continue; }
      if (!(m.hp > 0)) { die(m); continue; }              // เผื่อมีใครแก้ m.hp ตรงๆ จนเป็น 0/ติดลบ
      if (m.spawnT !== undefined && m.spawnT < T_SPAWNFADE) {   // เฟดเข้าตอนเกิดใหม่
        m.spawnT += dt; setVis(m, Math.min(1, m.spawnT / T_SPAWNFADE));
        if (m.spawnT >= T_SPAWNFADE) setVis(m, 1);
      }
      if (m.state === 'idle' && m.hp < m.hpMax && now - m.lastHit > REGEN_DELAY)
        m.hp = Math.min(m.hpMax, m.hp + m.hpMax * REGEN_RATE * dt);
      updateBar(m);
    }
  }

  return { init, register, damage, heal, kill, update, bindPlayer, damagePlayer, healPlayer, player: P };
})();
