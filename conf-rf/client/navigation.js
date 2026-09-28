/* ============================================================================
   НАВИГАЦИЯ (SPA)
   ============================================================================ */
const PAGES = [
  { id: 'home',     title: 'Главная' },
  { id: 'rooms',    title: 'Помещения' },
  { id: 'booking',  title: 'Бронирование' },
  { id: 'my',       title: 'Мои заявки' },
  { id: 'reviews',  title: 'Отзывы' },
  { id: 'messages', title: 'Сообщения', authOnly: true },
  { id: 'admin',    title: 'Панель администратора', adminOnly: true }
];

let currentPage = 'home';

function go(page) {
  const meta = PAGES.find(p => p.id === page);
  const u = currentUser();
  if (meta && meta.adminOnly && !(u && u.is_admin)) {
    toast('Доступ только для администратора', 'err');
    return;
  }
  if (meta && meta.authOnly && !u) {
    toast('Войдите, чтобы посмотреть сообщения', 'err');
    return;
  }
  currentPage = page;
  PAGES.forEach(p => {
    const el = $('#page-' + p.id);
    if (el) el.classList.toggle('active', p.id === page);
  });
  renderNav();
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderNav() {
  const u = currentUser();
  const unread = (typeof unreadEmailsCount === 'function') ? unreadEmailsCount() : 0;
  const activeCount = (typeof queryActiveBookingsCount === 'function') ? queryActiveBookingsCount() : 0;
  $('#nav').innerHTML = PAGES
    .filter(p => !p.adminOnly || (u && u.is_admin))
    .filter(p => !p.authOnly  || u)
    .map(p => {
      let badge = '';
      if (p.id === 'messages' && unread) badge = ` <span class="badge b-adm">${unread}</span>`;
      if (p.id === 'booking'  && activeCount) badge = ` <span class="badge-live">${activeCount}</span>`;
      return `
        <button data-action="nav" data-page="${p.id}"
          class="${currentPage === p.id ? 'active' : ''}">
          ${p.title}${badge}
        </button>`;
    })
    .join('');

  $('#authArea').innerHTML = u
    ? `<div class="who"><b>${esc(u.full_name)}</b>
         ${u.is_admin ? 'Администратор' : 'Пользователь'} · ${esc(u.login)}</div>
       <button class="btn btn-light btn-sm" data-action="logout">Выйти</button>`
    : `<button class="btn btn-light btn-sm" data-action="open-login">Вход</button>
       <button class="btn btn-light btn-sm" data-action="open-register">Регистрация</button>`;
}

/* Добавляется админским файлом admin.js */
function registerAdminPages() {
  if (!PAGES.find(p => p.id === 'er')) {
    PAGES.splice(PAGES.length - 1, 0, { id: 'er', title: 'Схема данных', adminOnly: true });
  }
}