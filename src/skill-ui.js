// ===== src/skill-ui.js — ปุ่มสกิลพิเศษ Z / X บนจอมือถือ + ตัวนับคูลดาวน์ (UI ล้วน ไม่มีตรรกะเกม) =====
// ต้องใส่ <script src="src/skill-ui.js"></script> ก่อน src/combat.js — combat.js เป็นคนเรียก init/update
//
//   SkillUI.init({ press(slot), query })   press('z'|'x') = เมื่อกดปุ่ม / ปุ่มวางเป็นเส้นโค้งแบบ MOBA รอบปุ่ม DASH
//   SkillUI.update(infoZ, infoX)           info = { key, empty, name, cd, cdMax, cost, enough, active, busy } จาก Combat.specialInfo
//   SkillUI.dispose()
// ปุ่ม DASH / RUN / ATTACK ไม่ถูกแตะต้อง — ปุ่ม Z/X วางบนส่วนโค้งด้านนอกซ้าย-บนของกลุ่มปุ่ม ไม่ทับกัน
const SkillUI = (() => {
  const SIZE = 60;                                       // เส้นผ่านศูนย์กลางปุ่ม (px)
  const ARC = { z: { ang: 152, r: 152 }, x: { ang: 118, r: 152 } };   // มุม (องศา, 0 = ขวา, 90 = ขึ้น) และรัศมีจากจุดศูนย์กลางปุ่ม DASH
  const FALLBACK = { right: 69, bottom: 77 };            // ถ้าหาปุ่ม DASH ไม่เจอ: ศูนย์กลางห่างขอบขวา/ล่างเท่านี้ (ตรงกับ game.js)
  let root = null, btns = {}, press = null, onResize = null;
  const last = {};

  function findDash() {                                  // หาปุ่ม DASH จาก DOM เพื่อวางโค้งให้ตรงตำแหน่งจริง (ปรับขนาดปุ่มได้อิสระ)
    for (const el of document.body.children) if (el !== root && el.textContent === 'DASH') return el.getBoundingClientRect();
    return null;
  }
  function layout() {
    if (!root) return;
    const r = findDash(), W = innerWidth, H = innerHeight;
    const cx = r ? r.left + r.width / 2 : W - FALLBACK.right, cy = r ? r.top + r.height / 2 : H - FALLBACK.bottom;
    const k = Math.min(1, Math.max(0.7, (H - 20) / 330));   // จอเตี้ย (มือถือแนวนอน) → ย่อโค้งลงเล็กน้อยให้พอดีจอ
    for (const slot in ARC) {
      const a = ARC[slot].ang * Math.PI / 180, R = ARC[slot].r * k;
      let x = cx + Math.cos(a) * R, y = cy - Math.sin(a) * R;
      x = Math.min(W - SIZE / 2 - 6, Math.max(SIZE / 2 + 6, x)); y = Math.max(SIZE / 2 + 56, y);   // เว้นแถบ HUD/ปุ่มเต็มจอด้านบน
      btns[slot].style.left = x + 'px'; btns[slot].style.top = y + 'px';
      btns[slot].style.transform = 'translate(-50%,-50%) scale(' + (0.85 + 0.15 * k) + ')';
    }
  }
  function makeBtn(slot) {
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;width:' + SIZE + 'px;height:' + SIZE + 'px;box-sizing:border-box;border-radius:50%;'
      + 'background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.38),rgba(120,150,200,.22));border:3px solid rgba(235,245,255,.95);'
      + 'box-shadow:0 0 10px rgba(190,220,255,.7),inset 0 0 8px rgba(255,255,255,.35);color:#fff;z-index:20;touch-action:none;'
      + 'user-select:none;-webkit-user-select:none;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:pointer';
    const key = document.createElement('div'); key.textContent = slot.toUpperCase();
    key.style.cssText = 'font:800 22px/1 sans-serif;text-shadow:0 0 6px #9cf,0 1px 3px #000;pointer-events:none';
    const nm = document.createElement('div');
    nm.style.cssText = 'font:700 8px/1 sans-serif;margin-top:2px;opacity:.85;text-shadow:0 1px 2px #000;pointer-events:none;white-space:nowrap';
    const cd = document.createElement('div');           // วงกวาดคูลดาวน์ (conic) + ตัวเลขวินาที
    cd.style.cssText = 'position:absolute;inset:0;border-radius:50%;display:none;align-items:center;justify-content:center;pointer-events:none;font:800 18px sans-serif;text-shadow:0 1px 3px #000';
    b.append(key, nm, cd); b._nm = nm; b._cd = cd;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (press) press(slot); });
    root.appendChild(b); return b;
  }
  function init(o) {
    dispose();
    press = o && o.press;
    root = document.createElement('div'); root.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:20';
    document.body.appendChild(root);
    btns.z = makeBtn('z'); btns.x = makeBtn('x');       // โชว์เฉพาะ Z และ X เท่านั้น
    onResize = () => layout(); addEventListener('resize', onResize); addEventListener('orientationchange', () => setTimeout(layout, 160));
    layout(); setTimeout(layout, 500);                  // วางซ้ำหลัง HUD อื่นสร้างเสร็จ/จอเปลี่ยนขนาด
  }
  function paint(slot, i) {
    const b = btns[slot]; if (!b || !i) return;
    const cdLeft = i.empty ? 0 : i.cd, p = cdLeft > 0 ? Math.round(Math.min(1, cdLeft / i.cdMax) * 100) : 0;
    const text = cdLeft > 0 ? (cdLeft >= 10 ? Math.ceil(cdLeft) : cdLeft.toFixed(1)) : '';
    const state = (i.empty ? 'e' : '') + (i.active ? 'a' : '') + (!i.empty && !i.enough ? 's' : '') + p + '|' + text + (i.name || '');
    if (last[slot] === state) return; last[slot] = state;   // เขียน DOM เฉพาะเมื่อค่าเปลี่ยน
    b._nm.textContent = i.empty ? '—' : (i.name || '');
    b._cd.style.display = p > 0 ? 'flex' : 'none';
    b._cd.style.background = p > 0 ? 'conic-gradient(rgba(0,0,0,.62) ' + p + '%, rgba(0,0,0,0) 0)' : 'none';
    b._cd.textContent = text;
    b.style.opacity = i.empty ? 0.3 : (p > 0 || !i.enough) ? 0.6 : 1;
    b.style.borderColor = i.active ? '#8fd0ff' : (!i.empty && !i.enough) ? 'rgba(255,110,110,.95)' : 'rgba(235,245,255,.95)';   // แดง = Stamina ไม่พอ
    b.style.boxShadow = i.active ? '0 0 18px #9fd8ff,inset 0 0 12px #fff' : '0 0 10px rgba(190,220,255,.7),inset 0 0 8px rgba(255,255,255,.35)';
  }
  function update(iz, ix) { if (root) { paint('z', iz); paint('x', ix); } }
  function dispose() {
    if (onResize) removeEventListener('resize', onResize);
    if (root) root.remove();
    root = null; btns = {}; press = null; onResize = null; for (const k in last) delete last[k];
  }
  return { init, update, dispose };
})();
