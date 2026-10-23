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
// ===== PLAYER XYZ OVERLAY =====
(() => {
  const panel = document.createElement('section');
  panel.style.cssText = 'position:fixed;left:8px;top:52px;z-index:7;width:210px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:10px;border:1px solid #ffffff66;border-radius:10px;background:rgba(10,20,32,.88);color:#fff;font:12px/1.5 system-ui,sans-serif;box-shadow:0 3px 12px #0005;touch-action:manipulation';
  panel.innerHTML = '<b>📍 พิกัดผู้เล่น</b><button id="xyzHide" style="float:right;background:#ffffff22;color:white;border:0;border-radius:4px;padding:3px 6px">ซ่อน</button><div id="xyzValues" style="font:13px/1.8 monospace;margin-top:5px">กำลังรอผู้เล่น…</div><div style="color:#cbd5e1;margin:4px 0 7px">วางของใช้ X,Z · Y คือระดับพื้น</div><button id="xyzCopy" style="width:100%;padding:7px;border:0;border-radius:5px;background:#2563eb;color:white">คัดลอก X,Z</button><button id="xyzPlace" style="width:100%;padding:7px;margin-top:4px;border:0;border-radius:5px;background:#16803d;color:white">คัดลอกบรรทัด PLACE</button><div id="xyzMsg" style="color:#a7f3d0"></div>';
  document.body.appendChild(panel);
  const toggle = document.createElement('button');
  toggle.textContent = '📍 XYZ';
  toggle.style.cssText = 'display:none;position:fixed;left:8px;top:52px;z-index:7;padding:8px;border:1px solid #ffffff66;border-radius:8px;background:#102033dd;color:white';
  document.body.appendChild(toggle);
  let pos = {x:0,y:0,z:0};
  const fmt = n => Number.isFinite(n) ? n.toFixed(2) : '—';
  document.getElementById('xyzHide').onclick = () => { panel.style.display='none'; toggle.style.display='block'; };
  toggle.onclick = () => { panel.style.display='block'; toggle.style.display='none'; };
  async function copy(s) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(s);
      else {
        const t=document.createElement('textarea'); t.value=s; t.style.position='fixed'; t.style.left='-9999px';
        document.body.appendChild(t); t.select(); const ok=document.execCommand('copy'); t.remove(); if(!ok) throw Error();
      }
      document.getElementById('xyzMsg').textContent='คัดลอกแล้ว ✓';
    } catch(e) { document.getElementById('xyzMsg').textContent='คัดลอกไม่ได้ กรุณาจดค่า X,Z'; }
  }
  document.getElementById('xyzCopy').onclick = () => copy(`${fmt(pos.x)}, ${fmt(pos.z)}`);
  document.getElementById('xyzPlace').onclick = () => copy(`['MODEL_KEY', ${fmt(pos.x)}, ${fmt(pos.z)}, 0],`);
  setInterval(() => {
    if (typeof player === 'undefined' || !player || !player.wrap) return;
    const p=player.wrap.position; pos={x:p.x,y:p.y,z:p.z};
    document.getElementById('xyzValues').innerHTML =
      `<div><b style="color:#93c5fd">X</b> = ${fmt(p.x)}</div><div><b style="color:#86efac">Y</b> = ${fmt(p.y)}</div><div><b style="color:#fcd34d">Z</b> = ${fmt(p.z)}</div>`;
  },100);
})();
              
