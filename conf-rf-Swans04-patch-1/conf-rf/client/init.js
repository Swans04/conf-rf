(function init() {
  const raw = localStorage.getItem(LS_DB);
  if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
  if (!db || !db.users || !db.rooms) db = seed();

  /* Миграции */
  if (!Array.isArray(db.emails)) db.emails = [];
  if (!Array.isArray(db.loginAttempts)) db.loginAttempts = [];
  if (!Array.isArray(db.securityLog)) db.securityLog = [];
  if (!Array.isArray(db.securityQuestions)) db.securityQuestions = [];
  if (!Array.isArray(db.equipment)) db.equipment = [];
  if (!Array.isArray(db.bookingEquipment)) db.bookingEquipment = [];
  if (!Array.isArray(db.checkins)) db.checkins = [];
  if (!db.seq) db.seq = {};
  ['users','rooms','bookings','reviews','emails','securityLog','securityQuestions','equipment','bookingEquipment','checkins'].forEach(k => {
    if (typeof db.seq[k] !== 'number') db.seq[k] = 0;
  });

  const sid = Number(localStorage.getItem(LS_SES));
  session = (sid && getUser(sid)) ? sid : null;

  if (currentUser() && currentUser().is_admin) {
    loadAdminScript();
  }

  if (session && typeof startIdleWatch === 'function') startIdleWatch();

  /* --- PWA --- */
  registerServiceWorker();
  watchNetworkStatus();
  watchInstallPrompt();

  renderNav();
  renderAll();
  go('home');
})();

/* ============================================================================
   PWA — регистрация SW, статус сети, установка на рабочий стол
   ============================================================================ */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') {
    console.warn('SW: file:// — service worker недоступен. Запустите через локальный сервер (http://localhost).');
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW зарегистрирован:', reg.scope))
      .catch(err => console.warn('SW ошибка:', err));
  });
}

function watchNetworkStatus() {
  const el = document.getElementById('netStatus');
  if (!el) return;
  const update = () => {
    if (navigator.onLine) {
      el.classList.remove('offline');
      el.textContent = '';
      el.title = 'Подключено';
    } else {
      el.classList.add('offline');
      el.textContent = 'Оффлайн';
      el.title = 'Нет соединения — работаем на локальных данных';
    }
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    window.__installPrompt = e;
    renderNav();
  });
  window.addEventListener('appinstalled', () => {
    window.__installPrompt = null;
    toast('Приложение установлено', 'ok');
    renderNav();
  });
}