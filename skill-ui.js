// ===== Pleasefruit Skill Combat UI + Dash Slash FX =====
// Load AFTER game.js. Installer adds the script tag automatically.
(() => {
  'use strict';
  if (window.__pleasefruitSkillCombatInstalled) return;
  window.__pleasefruitSkillCombatInstalled = true;

  const B = window.BABYLON;
  const C = window.Combat;
  if (!B || !C) {
    console.error('[skill-ui] BABYLON or Combat is missing. Load this file after game.js.');
    return;
  }

  const SLOTS = [
    { id: 'light', key: 'Z', label: 'LIGHT', color: '#75e8ff', x: 0, y: 0 },
    { id: 'heavy', key: 'X', label: 'HEAVY', color: '#c49aff', x: 44, y: 20 },
    { id: 'skillC', key: 'C', label: 'SKILL', color: '#78aaff', x: 88, y: 40 },
    { id: 'skillV', key: 'V', label: 'SKILL', color: '#78aaff', x: 132, y: 60 },
    { id: 'skillF', key: 'F', label: 'SKILL', color: '#78aaff', x: 176, y: 80 }
  ];

  const root = document.createElement('div');
  root.id = 'pf-skill-arc';
  root.style.cssText = [
    'position:fixed','right:122px','bottom:126px','width:230px','height:132px',
    'z-index:26','pointer-events:none','touch-action:none','user-select:none',
    '-webkit-user-select:none','font-family:system-ui,sans-serif'
  ].join(';');

  const heading = document.createElement('div');
  heading.textContent = 'SKILLS';
  heading.style.cssText = 'position:absolute;left:2px;top:-18px;color:rgba(224,238,255,.95);font:900 10px/1 system-ui,sans-serif;letter-spacing:2px;text-shadow:0 0 9px #68bfff';
  root.appendChild(heading);

  const buttons = new Map();
  for (const slot of SLOTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.skill = slot.id;
    button.setAttribute('aria-label', `${slot.key} ${slot.label}`);
    button.style.cssText = [
      'position:absolute', `left:${slot.x}px`, `top:${slot.y}px`,
      'width:48px','height:48px','box-sizing:border-box','padding:0',
      'border-radius:15px', `border:1px solid ${slot.color}`,
      'background:linear-gradient(145deg,rgba(26,39,73,.97),rgba(8,13,29,.96))',
      `box-shadow:inset 0 0 10px rgba(120,170,255,.16),0 0 12px ${slot.color}66`,
      'display:none','align-items:center','justify-content:center','flex-direction:column',
      'gap:2px','pointer-events:auto','touch-action:manipulation',
      '-webkit-tap-highlight-color:transparent','cursor:pointer'
    ].join(';');

    const key = document.createElement('span');
    key.textContent = slot.key;
    key.style.cssText = `font:900 17px/1 system-ui,sans-serif;color:${slot.color};text-shadow:0 0 10px ${slot.color}`;
    const label = document.createElement('span');
    label.textContent = slot.label;
    label.style.cssText = 'font:800 7px/1 system-ui,sans-serif;letter-spacing:.5px;color:rgba(255,255,255,.9)';
    button.append(key, label);
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      if (!button.disabled) C.use(slot.id);
    });
    root.appendChild(button);
    buttons.set(slot.id, button);
  }
  document.body.appendChild(root);

  function layout() {
    const compact = window.innerWidth < 720;
    root.style.transform = compact ? 'scale(.84)' : 'scale(1)';
    root.style.transformOrigin = 'bottom right';
    root.style.right = compact ? '94px' : '122px';
    root.style.bottom = compact ? '118px' : '126px';
  }

  function renderSkills() {
    const weapon = C.weapon;
    const available = new Set((weapon && weapon.skills) || []);
    for (const slot of SLOTS) {
      const button = buttons.get(slot.id);
      const enabled = available.has(slot.id) && !!(C.skills && C.skills[slot.id]);
      button.style.display = enabled ? 'flex' : 'none';
      button.disabled = !enabled;
    }
    heading.style.display = available.size ? 'block' : 'none';
    root.style.display = available.size ? 'block' : 'none';
  }

  // Z/X always mirror the two standard skills; future weapons can add C/V/F by
  // declaring those skill IDs in their weapon.skills array and CFG.skills.
  window.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code === 'KeyZ' && C.weapon && C.weapon.skills.includes('light')) {
      event.preventDefault(); C.use('light');
    } else if (event.code === 'KeyX' && C.weapon && C.weapon.skills.includes('heavy')) {
      event.preventDefault(); C.use('heavy');
    } else {
      const slot = SLOTS.find(item => `Key${item.key}` === event.code);
      if (slot && !['light', 'heavy'].includes(slot.id) &&
          C.weapon && C.weapon.skills.includes(slot.id) && C.skills && C.skills[slot.id]) {
        event.preventDefault(); C.use(slot.id);
      }
    }
  });

  if (window.Events && typeof window.Events.on === 'function') {
    window.Events.on('weapon:equipped', renderSkills);
  }
  window.addEventListener('resize', layout, { passive: true });
  layout();
  renderSkills();

  // Small, self-cleaning additive slash ribbons. The game dispatches a dash-frame
  // event only during a dash; the short lifetime keeps active mesh count bounded.
  const live = [];
  const palette = [
    new B.Color3(0.38, 0.82, 1.0),
    new B.Color3(0.72, 0.38, 1.0),
    new B.Color3(1.0, 0.97, 1.0)
  ];

  function makeSlash(scene, x, y, z, heading) {
    if (!scene || scene.isDisposed || live.length > 24) return;
    const fwd = new B.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const right = new B.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    for (let layer = 0; layer < 3; layer++) {
      const positions = [], indices = [], steps = 8;
      const side = (layer - 1) * 0.2;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const curve = Math.sin(t * Math.PI);
        const center = new B.Vector3(x, y, z)
          .add(right.scale((t - 0.5) * 1.7 + side))
          .add(fwd.scale(0.38 + curve * 0.18));
        center.y += 0.32 + t * 1.25 + curve * (layer - 1) * 0.15;
        const half = curve * (layer === 2 ? 0.095 : 0.055) + 0.008;
        const normal = right.scale(-0.58).add(new B.Vector3(0, 0.82, 0)).normalize().scale(half);
        const a = center.add(normal), b = center.subtract(normal);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        if (i < steps - 1) {
          const k = i * 2;
          indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      const mesh = new B.Mesh('pf-dash-slash', scene);
      const vertexData = new B.VertexData();
      vertexData.positions = positions;
      vertexData.indices = indices;
      vertexData.applyToMesh(mesh, true);
      const material = new B.StandardMaterial('pf-dash-slash-material', scene);
      material.disableLighting = true;
      material.emissiveColor = palette[layer];
      material.diffuseColor = B.Color3.Black();
      material.specularColor = B.Color3.Black();
      material.backFaceCulling = false;
      material.alphaMode = B.Engine.ALPHA_ADD;
      material.alpha = 0.9;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      live.push({ mesh, material, age: 0, life: 0.15 + layer * 0.025 });
    }
  }

  window.addEventListener('pleasefruit:dash-frame', event => {
    const d = event.detail;
    if (d) makeSlash(d.scene, d.x, d.y, d.z, d.heading || 0);
  });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (let i = live.length - 1; i >= 0; i--) {
      const item = live[i];
      item.age += dt;
      const fade = Math.max(0, 1 - item.age / item.life);
      item.material.alpha = fade * 0.9;
      item.mesh.visibility = fade;
      if (item.age >= item.life || item.mesh.isDisposed()) {
        item.mesh.dispose();
        item.material.dispose();
        live.splice(i, 1);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
