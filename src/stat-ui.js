// ===== src/stat-ui.js — หน้าต่าง UI อัปเกรดสถานะผู้เล่นแบบโมเดิร์น (Modern Stat Upgrade UI) =====
// ออกแบบให้รองรับทั้งจอมือถือแนวนอน (Landscape) และคอมพิวเตอร์ ไม่บังแผงควบคุมเกมหลัก
const StatUI = (() => {
  'use strict';

  let isOpen = false;
  let rootEl = null;
  let btnEl = null;
  let overlayEl = null;
  let modalEl = null;

  // รายการอัปเกรด 4 ด้านหลักตามข้อกำหนด
  const CATEGORIES = [
    {
      id: 'stamina',
      name: 'Stamina & Fist',
      icon: '⚡',
      accent: '#f59e0b',
      desc: 'Max Stamina +5 & Fist Dmg'
    },
    {
      id: 'hp',
      name: 'Health (HP)',
      icon: '❤️',
      accent: '#ef4444',
      desc: 'Max Health +5'
    },
    {
      id: 'fruit',
      name: 'Fruit Power',
      icon: '🍇',
      accent: '#a855f7',
      desc: 'Fruit Damage +5'
    },
    {
      id: 'sword',
      name: 'Sword Mastery',
      icon: '⚔️',
      accent: '#06b6d4',
      desc: 'Sword Damage +5'
    }
  ];

  function injectStyles() {
    if (document.getElementById('stat-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'stat-ui-styles';
    style.textContent = `
      /* ปุ่มเปิดเมนู STATS มุมบนขวา (ไม่ทับปุ่มเต็มจอ, HP/Stamina หรือจอย) */
      .stat-trigger-btn {
        position: fixed;
        right: calc(env(safe-area-inset-right, 0px) + 58px);
        top: calc(env(safe-area-inset-top, 0px) + 10px);
        height: 40px;
        padding: 0 14px;
        box-sizing: border-box;
        background: rgba(15, 23, 42, 0.88);
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        color: #ffffff;
        font: 700 13px system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 30;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        transition: transform 0.1s, background-color 0.15s, border-color 0.15s;
      }
      .stat-trigger-btn:hover {
        background: rgba(30, 41, 59, 0.95);
        border-color: #38bdf8;
      }
      .stat-trigger-btn:active {
        transform: scale(0.96);
      }
      .stat-trigger-badge {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #000;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 6px;
        margin-left: 2px;
      }

      /* แผ่น Overlay พื้นหลัง */
      .stat-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 150;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 12px;
        box-sizing: border-box;
      }
      .stat-modal-overlay.active {
        display: flex;
      }

      /* กรอบหน้าต่าง Stat Upgrade Modal */
      .stat-modal-card {
        width: 100%;
        max-width: 680px;
        max-height: 92vh;
        max-height: 92dvh;
        background: rgba(15, 23, 42, 0.96);
        border: 1.5px solid rgba(255, 255, 255, 0.22);
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
        animation: statModalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes statModalPop {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      /* ส่วนหัวของ Modal */
      .stat-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 18px;
        background: rgba(30, 41, 59, 0.6);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 12px;
      }
      .stat-header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .stat-lv-pill {
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #fff;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 800;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .stat-points-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(245, 158, 11, 0.2);
        border: 1.5px solid #f59e0b;
        color: #fbbf24;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
      }
      .stat-money-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.45);
        color: #34d399;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
      }
      .stat-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .stat-close-btn:hover {
        background: rgba(239, 68, 68, 0.6);
      }

      /* เนื้อหาใน Modal (2 คอลัมน์) */
      .stat-modal-body {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 14px;
        padding: 14px 18px;
        overflow-y: auto;
        box-sizing: border-box;
      }
      @media (max-width: 600px) {
        .stat-modal-body {
          grid-template-columns: 1fr;
          gap: 12px;
        }
      }

      /* คอลัมน์ที่ 1: การอัปเกรด (4 หมวดหมู่) */
      .stat-section-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #94a3b8;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .stat-upgrades-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .stat-upgrade-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        background: rgba(30, 41, 59, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        transition: border-color 0.15s, background-color 0.15s;
      }
      .stat-upgrade-card:hover {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(30, 41, 59, 0.75);
      }
      .stat-up-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .stat-up-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .stat-up-icon {
        font-size: 15px;
      }
      .stat-up-name {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
      }
      .stat-up-level {
        font-size: 11px;
        font-weight: 800;
        padding: 1px 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.12);
        color: #38bdf8;
      }
      .stat-up-desc {
        font-size: 11px;
        color: #94a3b8;
      }
      .stat-up-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1.5px solid #f59e0b;
        background: rgba(245, 158, 11, 0.22);
        color: #fbbf24;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        transition: transform 0.1s, background-color 0.15s, border-color 0.15s;
        white-space: nowrap;
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
      }
      .stat-up-btn:hover {
        background: rgba(245, 158, 11, 0.35);
        border-color: #fbbf24;
      }
      .stat-up-btn:active {
        transform: scale(0.94);
      }
      .stat-up-btn.disabled {
        border-color: #475569;
        background: rgba(51, 65, 85, 0.35);
        color: #64748b;
        cursor: not-allowed;
        box-shadow: none;
      }

      /* คอลัมน์ที่ 2: สถิติจริง (Effective Stats Breakdown) */
      .stat-overview-box {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        font-size: 12px;
      }
      .stat-row:last-child {
        border-bottom: none;
      }
      .stat-label {
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .stat-val {
        font-weight: 700;
        color: #f8fafc;
        font-feature-settings: 'tnum';
      }
      .stat-val.highlight {
        color: #38bdf8;
      }

      /* แถบด้านล่างสำหรับคำแนะนำและคีย์ลัด */
      .stat-modal-footer {
        padding: 8px 18px;
        background: rgba(15, 23, 42, 0.8);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #64748b;
      }
      .stat-key-hint {
        color: #94a3b8;
      }
      .stat-key-chip {
        display: inline-block;
        padding: 1px 5px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #cbd5e1;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  function createTriggerButton() {
    if (btnEl) return;
    btnEl = document.createElement('div');
    btnEl.className = 'stat-trigger-btn';
    btnEl.setAttribute('role', 'button');
    btnEl.setAttribute('aria-label', 'Open Stats Menu');
    btnEl.innerHTML = `<span>⚡ STATS</span><span id="stat-money-badge" class="stat-trigger-badge">0 PTS</span>`;

    // ป้องกันการส่งต่ออีเวนต์ไปยังการเดิน/การฟัน
    btnEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    document.body.appendChild(btnEl);
  }

  function createModal() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'stat-modal-overlay';

    modalEl = document.createElement('div');
    modalEl.className = 'stat-modal-card';
    modalEl.addEventListener('pointerdown', e => {
      e.stopPropagation(); // กันแตะในกรอบแล้วปิด
    });

    modalEl.innerHTML = `
      <!-- Header -->
      <div class="stat-modal-header">
        <div class="stat-header-title">
          <span>PLAYER STATUS</span>
          <span id="ui-player-lv" class="stat-lv-pill">LV. 1</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="ui-player-points" class="stat-points-pill">
            <span>⭐</span><span id="ui-points-txt">0 POINTS</span>
          </div>
          <div id="ui-player-money" class="stat-money-pill">
            <span>💰</span><span id="ui-money-txt">1,000 ฿</span>
          </div>
          <button id="ui-stat-close" class="stat-close-btn" title="Close (X)">✕</button>
        </div>
      </div>

      <!-- Body -->
      <div class="stat-modal-body">
        <!-- Col 1: Upgrades -->
        <div>
          <div class="stat-section-title">
            <span>UNLIMITED UPGRADES</span>
            <span style="font-size: 10px; color: #64748b;">(No Max Cap)</span>
          </div>
          <div class="stat-upgrades-list" id="ui-upgrades-container">
            <!-- Rendered by renderUpgrades() -->
          </div>
        </div>

        <!-- Col 2: Effective Stats Breakdown -->
        <div>
          <div class="stat-section-title">
            <span>EFFECTIVE ATTRIBUTES</span>
            <span style="font-size: 10px; color: #38bdf8;">Base + Buffs</span>
          </div>
          <div class="stat-overview-box" id="ui-stats-overview">
            <!-- Rendered by renderOverview() -->
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="stat-modal-footer">
        <span class="stat-key-hint">กด <span class="stat-key-chip">X</span> หรือ <span class="stat-key-chip">ESC</span> เพื่อปิด · อัปเกรดมีผลกับเกมทันที</span>
        <span style="color: #10b981;">✓ Auto-Saved</span>
      </div>
    `;

    overlayEl.appendChild(modalEl);

    // ปิดเมื่อแตะนอกกล่อง
    overlayEl.addEventListener('pointerdown', e => {
      if (e.target === overlayEl) {
        e.preventDefault();
        close();
      }
    });

    document.body.appendChild(overlayEl);

    const closeBtn = document.getElementById('ui-stat-close');
    if (closeBtn) {
      closeBtn.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        close();
      });
    }
  }

  function renderUpgrades() {
    const container = document.getElementById('ui-upgrades-container');
    if (!container || typeof PlayerStats === 'undefined') return;

    const availablePoints = PlayerStats.getStatPoints ? PlayerStats.getStatPoints() : 0;
    let html = '';
    CATEGORIES.forEach(cat => {
      const level = PlayerStats.getUpgradeLevel(cat.id);
      const canUpgrade = availablePoints >= 1;

      let bonusDesc = cat.desc;
      if (cat.id === 'stamina') {
        const stamBonus = level * 5;
        const fistBonus = level * 1;
        bonusDesc = `+${stamBonus} Max Stamina | +${fistBonus} Fist Dmg`;
      } else if (cat.id === 'hp') {
        bonusDesc = `+${level * 5} Max Health`;
      } else if (cat.id === 'fruit') {
        bonusDesc = `+${level * 5} Fruit Damage`;
      } else if (cat.id === 'sword') {
        bonusDesc = `+${level * 5} Sword Damage`;
      }

      html += `
        <div class="stat-upgrade-card">
          <div class="stat-up-info">
            <div class="stat-up-name-row">
              <span class="stat-up-icon">${cat.icon}</span>
              <span class="stat-up-name">${cat.name}</span>
              <span class="stat-up-level" style="color: ${cat.accent}">+${level}</span>
            </div>
            <div class="stat-up-desc">${bonusDesc}</div>
          </div>
          <button class="stat-up-btn ${canUpgrade ? '' : 'disabled'}" data-category="${cat.id}" title="${canUpgrade ? 'ใช้ 1 พอยท์เพื่ออัปเกรด' : 'ต้องอัปเลเวลเพื่อรับพอยท์สเตตัส'}">
            <span>+</span> <span>${canUpgrade ? '1 PT' : '0 PTS'}</span>
          </button>
        </div>
      `;
    });

    container.innerHTML = html;

    // ผูก Event ปุ่มกดอัปเกรด
    container.querySelectorAll('.stat-up-btn').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        const catId = btn.getAttribute('data-category');
        if (catId && typeof PlayerStats !== 'undefined') {
          const success = PlayerStats.upgrade(catId);
          if (success) {
            refresh();
          }
        }
      });
    });
  }

  function renderOverview() {
    const container = document.getElementById('ui-stats-overview');
    if (!container || typeof PlayerStats === 'undefined') return;

    const stats = PlayerStats.getAll();
    const currHp = (typeof Health !== 'undefined' && Health.player) ? Math.ceil(Health.player.hp) : stats.maxHp.effective;
    const currStam = (typeof window.Stamina !== 'undefined' && window.Stamina.state) ? Math.ceil(window.Stamina.state.value) : stats.maxStamina.effective;

    const rows = [
      { label: '❤️ Health (HP)', val: `${currHp} / ${stats.maxHp.effective}`, highlight: true },
      { label: '⚡ Stamina', val: `${currStam} / ${stats.maxStamina.effective}`, highlight: true },
      { label: '👊 Fist Damage', val: `${stats.fistDamage.effective}` },
      { label: '🍇 Fruit Damage', val: `${stats.fruitDamage.effective}` },
      { label: '⚔️ Sword Damage', val: `${stats.swordDamage.effective}` },
      { label: '🏃 Running Speed', val: `${stats.runSpeed.effective.toFixed(1)} m/s` },
      { label: '💨 Dash Distance', val: `${stats.dashDistance.effective.toFixed(1)} m` },
      { label: '⏱️ Attack Speed', val: `${stats.attackSpeed.effective.toFixed(2)}x` },
      { label: '⌛ Skill Cooldown', val: `${stats.skillCooldown.effective.toFixed(2)}x` }
    ];

    const xp = PlayerStats.getXp ? PlayerStats.getXp() : 0;
    const xpNext = PlayerStats.getXpForNextLevel ? PlayerStats.getXpForNextLevel() : 100;
    const xpPct = Math.min(100, Math.round((xp / xpNext) * 100));

    container.innerHTML = `
      ${rows.map(r => `
        <div class="stat-row">
          <span class="stat-label">${r.label}</span>
          <span class="stat-val ${r.highlight ? 'highlight' : ''}">${r.val}</span>
        </div>
      `).join('')}
      <div style="margin-top: 8px; padding: 8px 10px; background: rgba(30, 41, 59, 0.45); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
          <span style="color: #94a3b8;">EXP Progress</span>
          <span style="color: #38bdf8; font-weight: 700;">${xp} / ${xpNext} (${xpPct}%)</span>
        </div>
        <div style="height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${xpPct}%; background: linear-gradient(90deg, #38bdf8, #0284c7); transition: width 0.2s;"></div>
        </div>
        <div style="font-size: 10px; color: #fbbf24; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
          <span>⭐</span> <span>ทุกการอัปเลเวลได้ +3 พอยท์ (เวล 1 พิเศษ: 0 พอยท์)</span>
        </div>
      </div>
    `;
  }

  function refresh() {
    if (typeof PlayerStats === 'undefined') return;

    // 1. อัปเดตปุ่มเรียกมุมบนขวา
    const triggerBadge = document.getElementById('stat-money-badge');
    if (triggerBadge) {
      const pts = PlayerStats.getStatPoints ? PlayerStats.getStatPoints() : 0;
      triggerBadge.textContent = `${pts} PTS`;
      if (pts > 0) {
        triggerBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        triggerBadge.style.color = '#000';
      } else {
        triggerBadge.style.background = 'rgba(255,255,255,0.18)';
        triggerBadge.style.color = '#cbd5e1';
      }
    }

    if (!isOpen) return;

    // 2. อัปเดตหัว Modal
    const lvEl = document.getElementById('ui-player-lv');
    if (lvEl) lvEl.textContent = `LV. ${PlayerStats.getLevel()}`;

    const pointsTxt = document.getElementById('ui-points-txt');
    if (pointsTxt) pointsTxt.textContent = `${PlayerStats.getStatPoints ? PlayerStats.getStatPoints() : 0} POINTS`;

    const moneyTxt = document.getElementById('ui-money-txt');
    if (moneyTxt) moneyTxt.textContent = PlayerStats.formatCurrency();

    // 3. อัปเดตเนื้อหาทั้งสองคอลัมน์
    renderUpgrades();
    renderOverview();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    if (overlayEl) overlayEl.classList.add('active');
    refresh();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (overlayEl) overlayEl.classList.remove('active');
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  // ---------- จัดการคีย์ลัด X / C / ESC อย่างรอบคอบ (Requirement 7) ----------
  function handleKeyDown(e) {
    // 1. เมื่อหน้าต่าง UI เปิดอยู่:
    if (isOpen) {
      if (e.code === 'KeyX' || e.code === 'Escape' || e.code === 'KeyC') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      // ดักไม่ให้ปุ่มควบคุมเกมอื่นหลุดไปตอนเปิดเมนู
      if (['Space', 'KeyJ', 'KeyK', 'KeyZ'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    // 2. เมื่อหน้าต่าง UI ปิดอยู่:
    // ปุ่ม C หรือ U = เปิดเมนู Status โดยตรงไม่ชนกับสกิลต่อสู้
    if (e.code === 'KeyC' || e.code === 'KeyU') {
      e.preventDefault();
      open();
      return;
    }

    // สำหรับปุ่ม X:
    // ในระบบต่อสู้ของเกม ดาบ/ขวาน/มีด มีสกิล X (specialKeys.x: ['KeyX'])
    // ถ้าผู้เล่นกด Shift+X หรือ Alt+X -> เปิดหน้าต่างสถานะ
    // หรือถ้าผู้เล่นไม่ได้อยู่ในจังหวะกดสกิลหรือตัวละครไม่ได้เคลื่อนไหว -> สกิล X ของเกมยังคงทำงานปกติ
    // และเมื่อเปิดเมนูก็สามารถกด X ปิดได้ทันที
    if (e.code === 'KeyX' && (e.shiftKey || e.altKey)) {
      e.preventDefault();
      open();
    }
  }

  function init() {
    injectStyles();
    createTriggerButton();
    createModal();

    window.addEventListener('keydown', handleKeyDown, true);

    // ผูก listener เมื่อค่าสถานะหรือเงินเปลี่ยน
    if (typeof PlayerStats !== 'undefined') {
      PlayerStats.on('changed', refresh);
      PlayerStats.on('currency:changed', refresh);
      PlayerStats.on('upgraded', refresh);
      PlayerStats.on('statpoints:changed', refresh);
      PlayerStats.on('xp:changed', refresh);
      PlayerStats.on('levelup', refresh);
    }

    refresh();
  }

  return {
    init,
    open,
    close,
    toggle,
    refresh,
    isOpen: () => isOpen
  };
})();
