// ===== src/player-stats-ui.js — ปุ่ม More + popup (Items / Stats) =====
// สร้างทุกอย่างด้วยโค้ด ไม่ต้องแก้ index.html / CSS — game.js เรียก PlayerStatsUI.init(PlayerStats, CFG.playerStats)
// Items = ที่ว่างไว้ก่อน (ยังไม่ทำระบบไอเทม)
const PlayerStatsUI = (() => {
  const LABELS = {
    melee:  { name: 'Melee',  note: '+5 Max Stamina · +5 ดาเมจหมัด/ประชิด' },
    health: { name: 'Health', note: '+5 Max HP' },
    fruit:  { name: 'Fruit',  note: '+5 ดาเมจ Devil Fruit' },
    sword:  { name: 'Sword',  note: '+5 ดาเมจดาบ' },
  };
  const FONT = 'font-family:sans-serif;';
  const NOTOUCH = 'touch-action:manipulation;user-select:none;-webkit-user-select:none;';
  let PS = null, more = null, menu = null, panel = null, rows = {}, ptsEl = null, lvEl = null;

  const el = (tag, css, parent, text) => {
    const d = document.createElement(tag); d.style.cssText = css;
    if (text != null) d.textContent = text;
    if (parent) parent.appendChild(d); return d;
  };
  // กดบนป๊อปอัปต้องไม่ทะลุไปจอยสติ๊ก/ปุ่มโจมตีด้านล่าง
  const shield = n => ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'click', 'wheel'].forEach(t =>
    n.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  const btn = (label, css, parent, fn) => {
    const b = el('button', `${FONT}${NOTOUCH}cursor:pointer;border:2px solid rgba(255,255,255,.85);border-radius:8px;color:#fff;font-weight:700;${css}`, parent, label);
    b.addEventListener('click', e => { e.preventDefault(); fn(b); });
    return b;
  };
  // โครงป๊อปอัป: พื้นหลังมืด + กล่องกลางจอ (เตี้ยพอสำหรับมือถือแนวนอน: เลื่อนได้ถ้าเกินจอ)
  function overlay(title, z) {
    const ov = el('div', `position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:${z};${FONT}`, document.body);
    const box = el('div', 'box-sizing:border-box;width:min(92vw,380px);max-height:92vh;overflow-y:auto;background:rgba(18,22,32,.96);border:2px solid rgba(255,255,255,.85);border-radius:14px;padding:12px 14px;color:#fff;-webkit-overflow-scrolling:touch', ov);
    el('div', 'font:700 17px sans-serif;text-align:center;margin-bottom:8px;text-shadow:0 1px 3px #000', box, title);
    shield(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.style.display = 'none'; });   // แตะพื้นหลัง = ปิด
    return { ov, box };
  }

  function buildMenu() {
    const m = overlay('More', 40); menu = m.ov;
    const col = el('div', 'display:flex;flex-direction:column;gap:8px', m.box);
    btn('Items', 'height:44px;font-size:16px;background:rgba(255,255,255,.14)', col, () => { menu.style.display = 'none'; itemsPop.style.display = 'flex'; });
    btn('Stats', 'height:44px;font-size:16px;background:rgba(255,200,60,.35)', col, () => { menu.style.display = 'none'; open(); });
    btn('Close', 'height:36px;font-size:14px;background:rgba(0,0,0,.4)', col, () => { menu.style.display = 'none'; });
  }
  let itemsPop = null;
  function buildItems() {   // ที่ว่างไว้ — ยังไม่ทำระบบไอเทม
    const m = overlay('Items', 41); itemsPop = m.ov;
    el('div', 'text-align:center;opacity:.8;font:14px sans-serif;padding:14px 0', m.box, 'Coming soon');
    btn('Back', 'width:100%;height:36px;font-size:14px;background:rgba(0,0,0,.4)', m.box, () => { itemsPop.style.display = 'none'; menu.style.display = 'flex'; });
  }

  function buildStats(cfg) {
    const m = overlay('Stats', 41); panel = m.ov;
    const head = el('div', 'display:flex;justify-content:space-between;align-items:center;font:700 14px sans-serif;margin-bottom:6px', m.box);
    lvEl = el('div', '', head);
    ptsEl = el('div', 'padding:3px 10px;border-radius:12px;background:rgba(255,200,60,.3);border:1px solid rgba(255,220,120,.9)', head);
    PS.KEYS.forEach(k => {
      const row = el('div', 'display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid rgba(255,255,255,.15)', m.box);
      const info = el('div', 'flex:1;min-width:0', row);
      const top = el('div', 'font:700 15px sans-serif', info);
      const nm = el('span', '', top, LABELS[k].name), val = el('span', 'margin-left:8px;color:#ffd75e', top);
      const note = el('div', 'font:11px sans-serif;opacity:.75;margin-top:1px', info, LABELS[k].note);
      const plus = btn('+', 'width:40px;height:36px;font-size:22px;line-height:1;padding:0;background:rgba(80,200,120,.45)', row, () => PS.upgrade(k));
      rows[k] = { val, note, plus };
    });
    const foot = el('div', 'display:flex;gap:8px;margin-top:8px', m.box);
    btn('Reset', 'flex:1;height:38px;font-size:14px;background:rgba(229,72,77,.5)', foot, () => PS.reset());
    btn('Close', 'flex:1;height:38px;font-size:14px;background:rgba(0,0,0,.4)', foot, () => { panel.style.display = 'none'; });
    if (cfg.debugLevelUp) btn('Lv +1 (test)', 'width:100%;height:30px;margin-top:6px;font-size:12px;background:rgba(120,120,255,.35)', m.box, () => PS.addLevel(1));
  }

  function open() { render(); panel.style.display = 'flex'; }

  function render() {
    if (!PS || !panel) return;
    const s = PS.snapshot(), c = PS.cfg.perPoint;
    lvEl.textContent = 'Level ' + s.level;
    ptsEl.textContent = 'Points: ' + s.available;
    const tail = {
      melee: ` (Stamina ${Stamina_max()} · +${(s.stats.melee - 1) * c.meleeDamage} dmg)`,
      health: ` (Max HP ${Hp_max()})`,
      fruit: ` (+${(s.stats.fruit - 1) * c.fruitDamage} dmg)`,
      sword: ` (+${(s.stats.sword - 1) * c.swordDamage} dmg)`,
    };
    PS.KEYS.forEach(k => {
      rows[k].val.textContent = s.stats[k];
      rows[k].note.textContent = LABELS[k].note + tail[k];
      const on = s.available > 0;
      rows[k].plus.disabled = !on; rows[k].plus.style.opacity = on ? 1 : 0.35;
    });
  }
  const Stamina_max = () => (window.Stamina && Stamina.cfg) ? Math.round(Stamina.cfg.max) : '-';
  const Hp_max = () => (typeof Health !== 'undefined' && Health.player) ? Health.player.hpMax : '-';

  function init(playerStats, cfg) {
    if (more) return;                       // กันเรียกซ้ำ
    PS = playerStats; cfg = cfg || {};
    const pos = Object.assign({ right: 10, top: 56 }, cfg.more || {});
    // มุมขวาบน ใต้ปุ่มเต็มจอ (right:10 top:10 ขนาด 40) — ไม่ทับแถบ HP/Stamina (ซ้ายบน), ปุ่ม DASH/RUN/ATTACK (ขวาล่าง), Hotbar (กลางล่าง)
    more = btn('More', `position:fixed;right:${pos.right}px;top:${pos.top}px;min-width:40px;height:26px;padding:0 8px;font-size:12px;background:rgba(0,0,0,.55);z-index:30`, document.body, () => { menu.style.display = 'flex'; });
    shield(more);
    buildMenu(); buildItems(); buildStats(cfg);
    PS.onChange(render);                    // ค่าเปลี่ยนเมื่อไร (อัปเกรด/รีเซ็ต/เลเวลขึ้น) → วาดใหม่
    render();
  }

  return { init, open, render };
})();
window.PlayerStatsUI = PlayerStatsUI;
