// ===== src/debug.js — ปุ่มทดสอบชั่วคราว (ลบไฟล์นี้ + <script> ของมันได้เลยเมื่อทำระบบโจมตีจริง) =====
// ปุ่ม K หรือปุ่ม ⚔ บนจอ = ตีมอนที่ใกล้ที่สุดภายใน 10 หน่วย (ดาเมจ 40)
// ปุ่ม L = ฆ่ามอนที่ใกล้ที่สุดทันที (ทดสอบท่าตาย)
(() => {
  const RANGE = 10;
  function nearest() {
    if (typeof player === 'undefined' || !player) return null;
    const p = player.wrap.position; let best = null, bd = RANGE;
    for (const m of mobs) {
      if (m.phase !== 'alive') continue;
      const d = Math.hypot(m.wrap.position.x - p.x, m.wrap.position.z - p.z);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  const hit = () => { const m = nearest(); if (m) Health.damage(m, 40, 'debug'); };
  const kill = () => { const m = nearest(); if (m) Health.damage(m, 999999, 'debug'); };
  addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'k') hit(); else if (k === 'l') kill(); });
  const b = document.createElement('button');
  b.textContent = '⚔';
  b.style.cssText = 'position:fixed;right:18px;bottom:28px;width:64px;height:64px;border-radius:50%;border:2px solid #fff8;background:#0008;color:#fff;font-size:28px;z-index:6;touch-action:manipulation';
  b.addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
  document.body.appendChild(b);
})();
