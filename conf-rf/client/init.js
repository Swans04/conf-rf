(function init() {
  const raw = localStorage.getItem(LS_DB);
  if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
  if (!db || !db.users || !db.rooms) db = seed();

  /* Миграция старых сохранений */
  if (!Array.isArray(db.emails)) db.emails = [];
  if (!db.seq) db.seq = {};
  ['users', 'rooms', 'bookings', 'reviews', 'emails'].forEach(k => {
    if (typeof db.seq[k] !== 'number') db.seq[k] = 0;
  });

  const sid = Number(localStorage.getItem(LS_SES));
  session = (sid && getUser(sid)) ? sid : null;

  if (currentUser() && currentUser().is_admin) {
    loadAdminScript();
  }

  renderNav();
  renderAll();
  go('home');
})();