#!/usr/bin/env node
'use strict';
// Run from the pleasefruit repository root: node install-skill-combat.js
// Makes backups first and refuses to patch if the expected source patterns changed.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const files = ['game.js', 'index.html'];
for (const f of files) if (!fs.existsSync(f)) {
  console.error(`Missing ${f}. Run this installer from the repository root.`);
  process.exit(1);
}
const gamePath = path.resolve('game.js');
const htmlPath = path.resolve('index.html');
let game = fs.readFileSync(gamePath, 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');

const dashState = "const dash = { lean: 0, on: false, e: 0, dx: 0, dz: 0, cd: 0, buf: 0, trail: 0, fov: 0 };";
const dashStateNew = "const dash = { lean: 0, on: false, e: 0, dx: 0, dz: 0, cd: 0, buf: 0, trail: 0, slash: 0, fov: 0 };";
const dashButton = "const dBtn = el('position:fixed;right:26px;bottom:34px;width:86px;height:86px;border-radius:50%;background:rgba(255,255,255,.22);border:3px solid rgba(255,255,255,.85);color:#fff;font:700 15px sans-serif;display:flex;align-items:center;justify-content:center;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 3px #000');";
const dashButtonNew = "const dBtn = el('position:fixed;right:24px;bottom:30px;width:96px;height:96px;border-radius:50%;background:linear-gradient(145deg,rgba(64,155,255,.48),rgba(18,43,92,.72));border:3px solid rgba(205,235,255,.98);box-shadow:0 0 18px rgba(65,165,255,.42),inset 0 0 14px rgba(255,255,255,.12);color:#fff;font:900 15px sans-serif;letter-spacing:1px;display:flex;align-items:center;justify-content:center;z-index:25;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 4px #000');";
const runButton = "const rBtn = el('position:fixed;right:40px;bottom:134px;width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.22);border:3px solid rgba(255,255,255,.85);color:#fff;font:700 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 3px #000');";
const runButtonNew = "const rBtn = el('position:fixed;right:38px;bottom:142px;width:74px;height:74px;border-radius:50%;background:linear-gradient(145deg,rgba(255,205,76,.42),rgba(102,62,13,.62));border:3px solid rgba(255,238,174,.98);box-shadow:0 0 15px rgba(255,190,55,.32),inset 0 0 12px rgba(255,255,255,.1);color:#fff;font:900 13px sans-serif;letter-spacing:1px;display:flex;align-items:center;justify-content:center;z-index:25;touch-action:none;user-select:none;-webkit-user-select:none;text-shadow:0 1px 4px #000');";
const startDash = "dash.on = true; dash.e = 0; dash.dx = dx; dash.dz = dz; dash.trail = 0; dash.buf = 0;";
const startDashNew = "dash.on = true; dash.e = 0; dash.dx = dx; dash.dz = dz; dash.trail = 0; dash.slash = 0; dash.buf = 0;";
const trail = "if ((dash.trail -= dt) <= 0) { puff(p.x, p.y, p.z); dash.trail = 0.05; }";
const trailNew = trail + "\n  if ((dash.slash -= dt) <= 0) { window.dispatchEvent(new CustomEvent('pleasefruit:dash-frame', { detail: { scene, x: p.x, y: p.y, z: p.z, heading } })); dash.slash = 0.075; }";

function replaceExactly(source, oldText, newText, name) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${name}: expected one match, found ${count}; no files were changed.`);
  return source.replace(oldText, newText);
}
try {
  if (!game.includes(dashStateNew)) game = replaceExactly(game, dashState, dashStateNew, 'dash state');
  if (!game.includes(dashButtonNew)) game = replaceExactly(game, dashButton, dashButtonNew, 'DASH button');
  if (!game.includes(runButtonNew)) game = replaceExactly(game, runButton, runButtonNew, 'RUN button');
  if (!game.includes(startDashNew)) game = replaceExactly(game, startDash, startDashNew, 'startDash');
  if (!game.includes(trailNew)) game = replaceExactly(game, trail, trailNew, 'dash trail');
  if (!html.includes('src/skill-ui.js')) {
    html = replaceExactly(html, '<script src="game.js"></script>', '<script src="game.js"></script>\n<script src="src/skill-ui.js"></script>', 'index.html script order');
  }
  fs.mkdirSync('src', { recursive: true });
  if (!fs.existsSync('src/skill-ui.js')) {
    console.error('Missing src/skill-ui.js. Copy the included src/skill-ui.js into the repo first.');
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(gamePath, `${gamePath}.bak-${stamp}`);
  fs.copyFileSync(htmlPath, `${htmlPath}.bak-${stamp}`);
  fs.writeFileSync(gamePath, game);
  fs.writeFileSync(htmlPath, html);
  for (const f of ['game.js', 'src/skill-ui.js']) {
    const result = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (result.status !== 0) {
      console.error(`Syntax check failed for ${f}:\n${result.stderr}`);
      process.exit(2);
    }
  }
  console.log('Installed Skill Combat UI + Dash FX.');
  console.log('Backups created beside game.js and index.html. Review in browser before committing.');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
