/* ============================================================================
   РЕНДЕР СТРАНИЦ
   ============================================================================ */
const myFilter  = { search: '', status: 'Все', dateFrom: '', dateTo: '' };
const mySort    = { column: null, dir: 'asc' };
const adminSort = { column: null, dir: 'asc' };

function renderAll() {
  renderHome();
  renderRooms();
  renderBookingPage();
  renderMy();
  renderReviews();
  renderMessages();
  if (typeof renderER === 'function') renderER();
  renderAdmin();
}

/* Стрелка для активного заголовка */
function sortArrow(state, column) {
  if (state.column !== column) return '';
  return state.dir === 'asc' ? ' ▲' : ' ▼';
}

/* Универсальная сортировка заявок по ID / дате / статусу */
function sortBookings(list, state) {
  if (!state.column) return list;
  const dir = state.dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    let av, bv;
    if (state.column === 'id')      { av = a.id; bv = b.id; }
    else if (state.column === 'dt') { av = new Date(a.start_datetime).getTime();
                                      bv = new Date(b.start_datetime).getTime(); }
    else if (state.column === 'st') { av = a.status; bv = b.status; }
    if (av < bv) return -1 * dir;
    if (av > bv) return  1 * dir;
    return 0;
  });
}

/* ------------------------------ ГЛАВНАЯ ------------------------------- */
function renderHome() {
  const u = currentUser();
  const avg = db.reviews.length
    ? (db.reviews.reduce((s, r) => s + r.rating, 0) / db.reviews.length).toFixed(1)
    : '—';

  $('#page-home').innerHTML = `
    <div class="hero">
      <h1>Конференции.РФ</h1>
      <p>Портал для бронирования помещений (аудиторий, коворкингов,
         кинозалов) под проведение Всероссийских конференций.</p>
      <div class="row">
        <button class="btn btn-red" data-action="nav" data-page="booking">Забронировать помещение</button>
        <button class="btn btn-light" data-action="nav" data-page="rooms">Смотреть помещения</button>
        ${u ? '' : `<button class="btn btn-light" data-action="open-register">Зарегистрироваться</button>`}
      </div>
    </div>

    <div class="grid c4" style="margin-bottom:22px">
      <div class="stat"><div class="num">${db.rooms.length}</div><div class="lbl">Помещений в каталоге</div></div>
      <div class="stat"><div class="num">${db.bookings.length}</div><div class="lbl">Заявок на бронирование</div></div>
      <div class="stat"><div class="num">${db.users.length}</div><div class="lbl">Зарегистрированных пользователей</div></div>
      <div class="stat"><div class="num">${avg}</div><div class="lbl">Средняя оценка (${db.reviews.length} отз.)</div></div>
    </div>

    <div class="grid c2">
      <div class="card">
        <h3>Топ-5 помещений по числу заявок</h3>
        <div id="topRoomsChart"></div>
      </div>
      <div class="card">
        <h3>Топ-5 активных пользователей</h3>
        <div id="topUsersList"></div>
      </div>
    </div>

    <div class="card">
      <h3>Загруженность по дням недели</h3>
      <p class="muted small">В какие дни чаще всего проводятся мероприятия.</p>
      <div id="weekdayChart" class="weekday-chart"></div>
    </div>

    <div class="grid c2">
      <div class="card">
        <h3>Ближайшие мероприятия</h3>
        ${upcomingHTML(4)}
      </div>
      <div class="card">
        <h3>Последние отзывы</h3>
        ${db.reviews.slice(-3).reverse().map(r => {
          const b = getBooking(r.booking_id);
          const room = b ? getRoom(b.room_id) : null;
          return `<div style="border-bottom:1px dashed #eef2f9;padding:9px 0">
            <div class="row" style="justify-content:space-between">
              <b class="small">${esc(room ? room.name : '—')}</b>
              <span class="stars small">${starsHTML(r.rating)}</span>
            </div>
            <div class="small muted">${esc(r.text.slice(0, 110))}${r.text.length > 110 ? '…' : ''}</div>
          </div>`;
        }).join('') || '<div class="empty">Пока нет отзывов</div>'}
      </div>
    </div>
  `;

  if (typeof renderTopRoomsChart === 'function') renderTopRoomsChart();
  if (typeof renderTopUsersList  === 'function') renderTopUsersList();
  if (typeof renderWeekdayChart  === 'function') renderWeekdayChart();
}

function upcomingHTML(limit) {
  const now = new Date();
  const list = db.bookings
    .filter(b => new Date(b.start_datetime) >= now && b.status !== 'Завершено')
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, limit);
  if (!list.length) return '<div class="empty">Нет запланированных мероприятий</div>';
  return list.map(b => {
    const room = getRoom(b.room_id);
    const u = getUser(b.user_id);
    return `<div style="border-bottom:1px dashed #eef2f9;padding:9px 0">
      <div class="row" style="justify-content:space-between">
        <b class="small">${esc(room ? room.name : '—')}</b>
        ${statusBadge(b.status)}
      </div>
      <div class="small muted">${fmtDT(b.start_datetime)} · организатор: ${esc(u ? u.full_name : '—')}</div>
    </div>`;
  }).join('');
}

function starsHTML(n) {
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '<span class="off">★</span>';
  return s;
}
function statusBadge(st) {
  const cls = st === 'Новая' ? 'b-new' : st === 'Мероприятие назначено' ? 'b-set' : 'b-done';
  return `<span class="badge ${cls}">${esc(st)}</span>`;
}

/* ------------------------------ ПОМЕЩЕНИЯ ----------------------------- */
function renderRooms() {
  const u = currentUser();
  const cards = db.rooms.map(r => {
    const cnt = db.bookings.filter(b => b.room_id === r.id).length;
    return `<div class="room-card">
      <div class="row" style="justify-content:space-between">
        <h3>${esc(r.name)}</h3>
        <span class="badge b-user">ID ${r.id}</span>
      </div>
      <div class="room-cap">👥 Вместимость: <b>${r.capacity}</b> мест</div>
      <div class="room-cap">📋 Заявок по помещению: ${cnt}</div>
      <div class="row">
        <button class="btn btn-primary btn-sm" data-action="book-room" data-room="${r.id}">Забронировать</button>
        ${u && u.is_admin ? `
          <button class="btn btn-ghost btn-sm" data-action="edit-room" data-id="${r.id}">Изменить</button>
          <button class="btn btn-ghost btn-sm" data-action="del-room" data-id="${r.id}">Удалить</button>` : ''}
      </div>
    </div>`;
  }).join('');

  $('#page-rooms').innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div>
        <h1>Помещения</h1>
        <p class="muted">Доступные залы и аудитории.</p>
      </div>
      ${u && u.is_admin ? '<button class="btn btn-red" data-action="add-room">+ Добавить помещение</button>' : ''}
    </div>
    <div class="grid c3">
      ${cards || '<div class="empty">Помещения не добавлены</div>'}
    </div>
  `;
}

/* ------------------------------ БРОНИРОВАНИЕ -------------------------- */
function renderBookingPage() {
  const u = currentUser();

  $('#page-booking').innerHTML = `
    <h1>Формирование заявки</h1>
    <p class="muted">Укажите название помещения, дату и способ оплаты.</p>

    <div class="grid c2">
      <div class="card">
        <h3>Новая заявка</h3>
        ${u ? `
        <form id="bookingForm" novalidate>
          <div class="field" id="f-room">
            <label for="bRoomName">Название помещения *</label>
            <input id="bRoomName" name="room_name" type="text" list="roomNames" placeholder="например, Аудитория 101">
            <datalist id="roomNames">
              ${db.rooms.map(r => `<option value="${esc(r.name)}"></option>`).join('')}
            </datalist>
            <div class="hint">Доступные помещения: ${db.rooms.map(r => esc(r.name)).join(', ') || '—'}</div>
            <div class="err"></div>
          </div>

          <div class="field" id="f-dt">
            <label for="bDate">Дата и время начала *</label>
            <input id="bDate" name="start_datetime" type="text" placeholder="ДД.ММ.ГГГГ ЧЧ:ММ" value="${todayRu()} 10:00">
            <div class="hint">Например: 25.12.2026 14:30.</div>
            <div class="err"></div>
          </div>

          <div class="field" id="f-pay">
            <label for="bPay">Способ оплаты *</label>
            <select id="bPay" name="payment_method">
              <option value="offline">offline — очное посещение</option>
              <option value="sbr">sbr — перевод по СБП</option>
            </select>
            <div class="err"></div>
          </div>

          <button class="btn btn-primary" type="submit">Отправить</button>
        </form>` : `
        <div class="empty">
          <div class="big">🔒</div>
          <p>Чтобы подать заявку, войдите в систему или зарегистрируйтесь.</p>
          <div class="row" style="justify-content:center">
            <button class="btn btn-primary" data-action="open-login">Вход</button>
            <button class="btn btn-ghost" data-action="open-register">Регистрация</button>
          </div>
        </div>`}
      </div>

      <div class="card">
        <h3>Занятость помещений</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Помещение</th><th>Вместимость</th><th>Активных заявок</th></tr>
            </thead>
            <tbody>
              ${db.rooms.map(r => {
                const cnt = db.bookings.filter(b => b.room_id === r.id && b.status !== 'Завершено').length;
                return `<tr><td>${esc(r.name)}</td><td>${r.capacity}</td><td>${cnt}</td></tr>`;
              }).join('') || '<tr><td colspan="3" class="empty">Нет помещений</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <h3>Календарь занятости</h3>
      <p class="muted small">Выберите помещение или оставьте «Все помещения». Клик по дате покажет заявки.</p>
      <div id="calendarBlock"></div>
    </div>
  `;

  if (typeof renderCalendarBlock === 'function') renderCalendarBlock();
}

/* ------------------------------ МОИ ЗАЯВКИ ---------------------------- */
function renderMy() {
  const u = currentUser();
  if (!u) {
    $('#page-my').innerHTML = `
      <h1>Мои заявки</h1>
      <div class="card empty">
        <div class="big">🔒</div>
        <p>Раздел доступен только авторизованным пользователям.</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-action="open-login">Войти</button>
        </div>
      </div>`;
    return;
  }

  $('#page-my').innerHTML = `
    <h1>Мои заявки</h1>
    <p class="muted">Один пользователь может иметь много заявок.</p>

    <div class="row" style="margin-bottom:14px;justify-content:space-between">
      <div class="row">
        <input id="mySearch" type="text" placeholder="Поиск по названию помещения"
               value="${esc(myFilter.search)}" style="max-width:320px">
        <select id="myStatus" style="max-width:240px">
          <option value="Все"                   ${myFilter.status === 'Все'                   ? 'selected' : ''}>Все</option>
          <option value="Новая"                 ${myFilter.status === 'Новая'                 ? 'selected' : ''}>Новая</option>
          <option value="Мероприятие назначено" ${myFilter.status === 'Мероприятие назначено' ? 'selected' : ''}>Мероприятие назначено</option>
          <option value="Завершено"             ${myFilter.status === 'Завершено'             ? 'selected' : ''}>Завершено</option>
        </select>
      </div>
      <button class="btn btn-ghost btn-sm"
              data-action="export-bookings" data-source="my">
        📥 Выгрузить в Excel
      </button>
    </div>

    <div class="row" style="margin-bottom:14px">
      <label style="margin:0">Дата с:</label>
      <input type="date" id="myDateFrom" value="${myFilter.dateFrom || ''}" style="max-width:180px">
      <label style="margin:0">по:</label>
      <input type="date" id="myDateTo" value="${myFilter.dateTo || ''}" style="max-width:180px">
      <button class="btn btn-ghost btn-sm" data-action="reset-date-filter">Сбросить</button>
    </div>

    <div id="myTableBlock"></div>
  `;

  renderMyTable();
}

function renderMyTable() {
  const u = currentUser();
  const block = document.getElementById('myTableBlock');
  if (!u || !block) return;

  const list = getMyFilteredBookings();

  if (!list.length) {
    block.innerHTML = `<div class="card empty"><div class="big">🔍</div><p>Ничего не найдено</p></div>`;
    return;
  }

  block.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th data-action="sort-my" data-col="id" style="cursor:pointer;user-select:none">ID${sortArrow(mySort, 'id')}</th>
            <th>Помещение</th>
            <th data-action="sort-my" data-col="dt" style="cursor:pointer;user-select:none">Дата и время${sortArrow(mySort, 'dt')}</th>
            <th>Оплата</th>
            <th data-action="sort-my" data-col="st" style="cursor:pointer;user-select:none">Статус${sortArrow(mySort, 'st')}</th>
            <th>Создана</th>
            <th>Отзыв</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(b => {
            const room = getRoom(b.room_id);
            const rev  = getReviewByBooking(b.id);
            let action;
            if (rev) action = `<span class="stars">${starsHTML(rev.rating)}</span>`;
            else if (b.status === 'Завершено')
              action = `<button class="btn btn-ghost btn-sm" data-action="open-review" data-booking="${b.id}">Оставить отзыв</button>`;
            else action = '<span class="muted small">после завершения</span>';

            return `<tr>
              <td>${b.id}</td>
              <td>${esc(room ? room.name : '—')}</td>
              <td>${fmtDT(b.start_datetime)}</td>
              <td class="small">${PAYMENTS[b.payment_method] || b.payment_method}</td>
              <td>${statusBadge(b.status)}</td>
              <td class="small muted">${fmtDT(b.created_at)}</td>
              <td>${action}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

/* Возвращает список «Моих заявок» с учётом поиска, статуса, диапазона дат
   и сортировки. Используется и для отрисовки таблицы, и для выгрузки в Excel. */
function getMyFilteredBookings() {
  const u = currentUser();
  if (!u) return [];

  let list = db.bookings.filter(b => b.user_id === u.id);

  if (myFilter.status !== 'Все') list = list.filter(b => b.status === myFilter.status);

  if (myFilter.search.trim()) {
    const q = myFilter.search.trim().toLowerCase();
    list = list.filter(b => {
      const r = getRoom(b.room_id);
      return r && r.name.toLowerCase().includes(q);
    });
  }

  if (typeof queryBookingsByDateRange === 'function') {
    list = queryBookingsByDateRange(list, myFilter.dateFrom, myFilter.dateTo);
  }

  if (mySort.column) list = sortBookings(list, mySort);
  else list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return list;
}

/* ------------------------------ ОТЗЫВЫ -------------------------------- */
function renderReviews() {
  const list = [...db.reviews].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const avg = list.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : '—';

  $('#page-reviews').innerHTML = `
    <h1>Отзывы</h1>
    <p class="muted">Что говорят участники о помещениях и мероприятиях.</p>

    <div class="grid c3" style="margin-bottom:18px">
      <div class="stat"><div class="num">${list.length}</div><div class="lbl">Всего отзывов</div></div>
      <div class="stat"><div class="num">${avg}</div><div class="lbl">Средняя оценка</div></div>
      <div class="stat"><div class="num">${list.filter(r => r.rating === 5).length}</div><div class="lbl">Оценок «отлично»</div></div>
    </div>

    <div class="card">
      <h3>Средний рейтинг по помещениям</h3>
      <div id="avgRatingList"></div>
    </div>

    ${list.length ? `<div class="grid c2">
      ${list.map(r => {
        const b = getBooking(r.booking_id);
        const room = b ? getRoom(b.room_id) : null;
        const u = b ? getUser(b.user_id) : null;
        return `<div class="review">
          <div class="row" style="justify-content:space-between">
            <b>${esc(room ? room.name : 'Помещение удалено')}</b>
            <span class="stars">${starsHTML(r.rating)}</span>
          </div>
          <div class="small muted" style="margin:4px 0 8px">
            ${esc(u ? u.full_name : 'Пользователь')} ${b ? '· ' + fmtD(b.start_datetime) : ''}
          </div>
          <div>${esc(r.text)}</div>
        </div>`;
      }).join('')}
    </div>` : `<div class="card empty"><div class="big">⭐</div><p>Отзывов пока нет.</p></div>`}
  `;

  if (typeof renderAvgRatingList === 'function') renderAvgRatingList();
}

/* ------------------------------ СООБЩЕНИЯ ----------------------------- */
function renderMessages() {
  const u = currentUser();
  const page = $('#page-messages');
  if (!page) return;

  if (!u) {
    page.innerHTML = `
      <h1>Сообщения</h1>
      <div class="card empty">
        <div class="big">🔒</div>
        <p>Раздел доступен только авторизованным пользователям.</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-action="open-login">Войти</button>
        </div>
      </div>`;
    return;
  }

  if (!Array.isArray(db.emails)) db.emails = [];

  const list = db.emails
    .filter(e => e.user_id === u.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const unread = list.filter(e => !e.read).length;

  page.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div>
        <h1>Сообщения</h1>
        <p class="muted">Уведомления о статусах ваших заявок.</p>
      </div>
      ${unread ? `<button class="btn btn-ghost btn-sm" data-action="mark-all-emails-read">
        Отметить все как прочитанные (${unread})</button>` : ''}
    </div>

    ${list.length ? list.map(e => `
      <div class="mail-item ${e.read ? '' : 'unread'}"
           data-action="open-email" data-id="${e.id}" style="cursor:pointer">
        <div class="row" style="justify-content:space-between;gap:8px">
          <b class="small" style="flex:1">${esc(e.subject)}</b>
          ${e.read ? '' : '<span class="dot"></span>'}
        </div>
        <div class="small muted" style="margin-top:2px">${fmtDT(e.created_at)}</div>
      </div>
    `).join('') : `<div class="card empty"><div class="big">📭</div><p>Сообщений пока нет.</p></div>`}
  `;
}

/* ------------------------------ АДМИНКА ------------------------------- */
function renderAdmin() {
  const u = currentUser();
  if (!u || !u.is_admin) {
    $('#page-admin').innerHTML = `
      <div class="card empty">
        <div class="big">⛔</div>
        <p>Раздел доступен только администратору.</p>
      </div>`;
    return;
  }

  const usersRows = db.users.map(x => `
    <tr>
      <td>${x.id}</td>
      <td><b>${esc(x.login)}</b></td>
      <td>${esc(x.full_name)}</td>
      <td class="small">${esc(x.phone)}</td>
      <td class="small">${esc(x.email)}</td>
      <td>${x.is_admin ? '<span class="badge b-adm">Админ</span>' : '<span class="badge b-user">Пользователь</span>'}</td>
      <td>${db.bookings.filter(b => b.user_id === x.id).length}</td>
      <td><button class="btn btn-ghost btn-sm" data-action="del-user" data-id="${x.id}">Удалить</button></td>
    </tr>`).join('');

  let allBookings = [...db.bookings];
  if (adminSort.column) allBookings = sortBookings(allBookings, adminSort);
  else allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const bookingsRows = allBookings.map(b => {
    const room = getRoom(b.room_id);
    const usr  = getUser(b.user_id);
    const rev  = getReviewByBooking(b.id);
    return `<tr>
      <td>${b.id}</td>
      <td>${esc(usr ? usr.full_name : '—')}<div class="small muted">${esc(usr ? usr.login : '')}</div></td>
      <td>${esc(room ? room.name : '—')}</td>
      <td>${fmtDT(b.start_datetime)}</td>
      <td class="small">${PAYMENTS[b.payment_method] || b.payment_method}</td>
      <td>
        <select data-action="set-status" data-id="${b.id}" style="min-width:190px">
          ${STATUSES.map(s => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${rev ? `<span class="stars">${starsHTML(rev.rating)}</span>` : '<span class="muted small">—</span>'}</td>
      <td><button class="btn btn-ghost btn-sm" data-action="del-booking" data-id="${b.id}">Удалить</button></td>
    </tr>`;
  }).join('');

  const roomsRows = db.rooms.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><b>${esc(r.name)}</b></td>
      <td>${r.capacity}</td>
      <td>${db.bookings.filter(b => b.room_id === r.id).length}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-action="edit-room" data-id="${r.id}">Изменить</button>
        <button class="btn btn-ghost btn-sm" data-action="del-room" data-id="${r.id}">Удалить</button>
      </td>
    </tr>`).join('');

  $('#page-admin').innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div>
        <h1>Панель администратора</h1>
        <p class="muted">Управление заявками, пользователями и помещениями.</p>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="reset-db">↺ Сбросить демо-данные</button>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <h3>Все заявки</h3>
          <p class="muted small">При смене статуса пользователю отправляется письмо и уведомление в раздел «Сообщения».</p>
        </div>
        <button class="btn btn-ghost btn-sm"
                data-action="export-bookings" data-source="admin">
          📥 Выгрузить в Excel
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th data-action="sort-admin" data-col="id" style="cursor:pointer;user-select:none">ID${sortArrow(adminSort, 'id')}</th>
              <th>Пользователь</th>
              <th>Помещение</th>
              <th data-action="sort-admin" data-col="dt" style="cursor:pointer;user-select:none">Дата и время${sortArrow(adminSort, 'dt')}</th>
              <th>Оплата</th>
              <th data-action="sort-admin" data-col="st" style="cursor:pointer;user-select:none">Статус${sortArrow(adminSort, 'st')}</th>
              <th>Отзыв</th><th></th>
            </tr>
          </thead>
          <tbody>${bookingsRows || '<tr><td colspan="8" class="empty">Нет заявок</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Пользователи</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Логин</th><th>ФИО</th><th>Телефон</th><th>E-mail</th><th>Роль</th><th>Заявок</th><th></th></tr>
          </thead>
          <tbody>${usersRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Помещения</h3>
      <div class="row" style="margin-bottom:12px">
        <button class="btn btn-red btn-sm" data-action="add-room">+ Добавить помещение</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Название</th><th>Вместимость</th><th>Заявок</th><th></th></tr>
          </thead>
          <tbody>${roomsRows || '<tr><td colspan="5" class="empty">Нет помещений</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <h3>Календарь занятости</h3>
      <div id="calendarBlock"></div>
    </div>
  `;

  if (typeof renderCalendarBlock === 'function') renderCalendarBlock();
}