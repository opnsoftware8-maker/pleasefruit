// ===== src/events.js — ระบบส่งข่าวระหว่างระบบ (event bus) =====
// ใช้แบบ: Events.on('monster:killed', e => ...);  Events.emit('monster:killed', { mob });
// ระบบเควสต์/ดรอป/เสียง ฟังข่าวนี้ได้เอง โดยไม่ต้องแก้โค้ดต่อสู้
const Events = (() => {
  const map = {};
  return {
    on(name, fn) { (map[name] = map[name] || []).push(fn); return () => Events.off(name, fn); },
    off(name, fn) { map[name] = (map[name] || []).filter(f => f !== fn); },
    emit(name, data) { (map[name] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error('[Events]', name, e); } }); },
  };
})();
