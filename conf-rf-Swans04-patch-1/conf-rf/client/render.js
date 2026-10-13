/* ============================================================================
   РЕНДЕР СТРАНИЦ
   ============================================================================ */
const myFilter  = { search: '', status: 'Все', dateFrom: '', dateTo: '' };
const mySort    = { column: null, dir: 'asc' };
const adminSort = { column: null, dir: 'asc' };

function renderAll() {
  renderHome();
  renderRooms();
  renderEquipmentPage();
  renderBookingPage();
  renderMy();
  renderReviews();
  renderMessages();
  renderPassesPage();
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
function renderEquipmentPage() {
  const u = currentUser();
  const cards = db.equipment.map(e => {
    const available = equipmentAvailableNow(e.id);
    return `<div class="room-card">
      <div class="row" style="justify-content:space-between">
        <h3>${esc(e.name)}</h3>
        <span class="badge b-user">ID ${e.id}</span>
      </div>
      <div class="room-cap">Всего: <b>${e.total_quantity}</b> шт.</div>
      <div class="room-cap">Доступно сейчас: <b>${available}</b> шт.</div>
      <div class="room-cap small muted">${esc(e.description || '')}</div>
      ${u && u.is_admin ? `
        <div class="row" style="margin-top:8px">
          <button class="btn btn-ghost btn-sm" data-action="edit-equipment" data-id="${e.id}">Изменить</button>
          <button class="btn btn-ghost btn-sm" data-action="del-equipment" data-id="${e.id}">Удалить</button>
        </div>` : ''}
    </div>`;
  }).join('');

  $('#page-equipment').innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div>
        <h1>Оборудование</h1>
        <p class="muted">Доступное количество на текущий день.</p>
      </div>
      ${u && u.is_admin
        ? '<button class="btn btn-red" data-action="add-equipment">+ Добавить оборудование</button>'
        : ''}
    </div>
    <div class="grid c3">
      ${cards || '<div class="empty">Оборудование не добавлено</div>'}
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

                    <div class="field">
            <label>Оборудование</label>
            <div id="pendingEquipmentBox" style="margin-bottom:8px"></div>
            <div class="row">
              <select id="pickEquipment" style="flex:1;min-width:180px">
                <option value="">— выберите оборудование —</option>
                ${db.equipment.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}
              </select>
              <input id="pickQty" type="number" min="1" step="1" value="1" style="max-width:90px">
              <button class="btn btn-ghost btn-sm" type="button" data-action="add-pending-equipment">+ Добавить</button>
            </div>
            <div class="hint">Доступное количество считается автоматически на выбранную дату.</div>
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
    renderPendingEquipment();
  if (typeof renderCalendarBlock === 'function') renderCalendarBlock();
}
function renderPendingEquipment() {
  const box = document.getElementById('pendingEquipmentBox');
  if (!box) return;

  const dateStr = ($('#bDate') && $('#bDate').value) || '';
  let isoDT = null;
  if (dateStr) {
    const d = parseDateInput(dateStr);
    if (d) isoDT = d.toISOString();
  }

  if (!pendingEquipment.length) {
    box.innerHTML = '<div class="small muted">Оборудование не выбрано</div>';
    return;
  }

  box.innerHTML = pendingEquipment.map((p, i) => {
    const eq = getEquipment(p.equipment_id);
    if (!eq) return '';
    const avail = isoDT
      ? equipmentAvailableForForm(eq.id, isoDT, null, pendingEquipment.filter((_, j) => j !== i))
      : eq.total_quantity;
    return `<div class="row" style="justify-content:space-between;border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin-bottom:4px">
      <span>${esc(eq.name)} — <b>${p.quantity}</b> шт. <span class="small muted">(доступно: ${avail})</span></span>
      <button class="btn btn-ghost btn-sm" type="button"
              data-action="remove-pending-equipment" data-idx="${i}">Убрать</button>
    </div>`;
  }).join('');
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
            <th>Пропуск</th>
            <th>Оборудование</th> 
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
              <td>${b.status === 'Мероприятие назначено'
                ? `<button class="btn btn-primary btn-sm" data-action="open-ticket" data-booking="${b.id}">Пропуск</button>`
                : '<span class="muted small">—</span>'}</td>
              <td class="small">${(() => {
                const eqs = getEquipmentForBooking(b.id);
                if (!eqs.length) return '<span class="muted">—</span>';
                return eqs.map(x => {
                  const eq = getEquipment(x.equipment_id);
                  return `${esc(eq ? eq.name : '—')} x${x.quantity} <span class="muted">(${x.status})</span>`;
                }).join('<br>');
              })()}</td>
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
            <div class="row" style="gap:6px">
        <button class="btn btn-ghost btn-sm" data-action="export-db">Экспорт БД</button>
        <button class="btn btn-ghost btn-sm" data-action="import-db">Импорт БД</button>
        <input type="file" id="importFile" accept=".json" style="display:none">
        <button class="btn btn-ghost btn-sm" data-action="reset-db">Сбросить демо-данные</button>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="reset-db">↺ Сбросить демо-данные</button>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
    <div class="card">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap">
        <div>
          <h3>Дашборд</h3>
          <p class="muted small">Срез: ${esc(periodLabel(dashPeriod))}</p>
        </div>
        <div class="row" style="gap:6px">
          <button class="btn btn-ghost btn-sm ${dashPeriod === 'today' ? 'btn-primary' : ''}" data-action="set-dash-period" data-period="today">Сегодня</button>
          <button class="btn btn-ghost btn-sm ${dashPeriod === '7d' ? 'btn-primary' : ''}"    data-action="set-dash-period" data-period="7d">7 дней</button>
          <button class="btn btn-ghost btn-sm ${dashPeriod === '30d' ? 'btn-primary' : ''}"   data-action="set-dash-period" data-period="30d">30 дней</button>
          <button class="btn btn-ghost btn-sm ${dashPeriod === 'all' ? 'btn-primary' : ''}"   data-action="set-dash-period" data-period="all">Всё время</button>
        </div>
      </div>

      <div class="grid c2" style="margin-top:12px">
        <div>
          <h4>Распределение заявок по статусам</h4>
          <div id="statusPie" class="pie-wrap"></div>
        </div>
        <div>
          <h4>Топ-3 помещения</h4>
          <div id="topRoomsBars" class="bars-wrap"></div>
        </div>
      </div>
    </div>
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
      <h3>Журнал безопасности</h3>
      <p class="muted small">Последние события: входы, выходы, смена пароля, блокировки.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Дата</th><th>Пользователь</th><th>Событие</th><th>Детали</th></tr>
          </thead>
          <tbody>
            ${(() => {
              const list = [...(db.securityLog || [])]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 50);
              if (!list.length)
                return '<tr><td colspan="4" class="empty">Событий пока нет</td></tr>';
              const EV = {
                login_success:      'Вход',
                login_fail:         'Неудачный вход',
                login_blocked:      'Блокировка',
                logout:             'Выход',
                register:           'Регистрация',
                password_change:    'Смена пароля',
                password_reset:     'Сброс пароля',
                password_reset_fail:'Неверный ответ',
                idle_logout:        'Автовыход'
              };
              return list.map(s => `
                <tr>
                  <td class="small">${fmtDT(s.created_at)}</td>
                  <td>${esc(s.login || '—')}</td>
                  <td>${EV[s.event] || esc(s.event)}</td>
                  <td class="small muted">${esc(JSON.stringify(s.details || {}))}</td>
                </tr>`).join('');
            })()}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h3>Справочник оборудования</h3>
      <div class="row" style="margin-bottom:12px">
        <button class="btn btn-red btn-sm" data-action="add-equipment">+ Добавить оборудование</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Название</th><th>Всего</th><th>Описание</th><th></th></tr>
          </thead>
          <tbody>
            ${db.equipment.map(e => `
              <tr>
                <td>${e.id}</td>
                <td><b>${esc(e.name)}</b></td>
                <td>${e.total_quantity}</td>
                <td class="small muted">${esc(e.description || '')}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" data-action="edit-equipment" data-id="${e.id}">Изменить</button>
                  <button class="btn btn-ghost btn-sm" data-action="del-equipment" data-id="${e.id}">Удалить</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="5" class="empty">Нет оборудования</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Запросы оборудования</h3>
      <p class="muted small">Статусы: запрошено, подтверждено, выдано, возвращено.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Заявка</th><th>Пользователь</th><th>Оборудование</th>
                <th>Кол-во</th><th>Дата</th><th>Статус</th></tr>
          </thead>
          <tbody>
            ${[...db.bookingEquipment].sort((a, b) => b.id - a.id).map(be => {
              const b   = getBooking(be.booking_id);
              const eq  = getEquipment(be.equipment_id);
              const usr = b ? getUser(b.user_id) : null;
              return `<tr>
                <td>${be.id}</td>
                <td>${be.booking_id}</td>
                <td>${esc(usr ? usr.full_name : '—')}</td>
                <td>${esc(eq ? eq.name : '—')}</td>
                <td>${be.quantity}</td>
                <td class="small">${b ? fmtDT(b.start_datetime) : '—'}</td>
                <td>
                  <select data-action="set-equipment-status" data-id="${be.id}" style="min-width:160px">
                    ${EQUIPMENT_STATUSES.map(s => `<option ${s === be.status ? 'selected' : ''}>${s}</option>`).join('')}
                  </select>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="7" class="empty">Запросов нет</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Отчёт: загрузка оборудования</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Оборудование</th><th>Всего запросов</th><th>Среднее</th><th>Загрузка</th></tr>
          </thead>
          <tbody>
            ${(() => {
              const stats = db.equipment.map(e => {
                const list = getBookingsForEquipment(e.id).filter(x => x.status !== 'возвращено');
                const sum = list.reduce((s, x) => s + x.quantity, 0);
                return { eq: e, count: list.length, avg: list.length ? +(sum / list.length).toFixed(1) : 0, sum };
              }).sort((a, b) => b.sum - a.sum);
              const maxSum = Math.max(...stats.map(s => s.sum), 1);
              return stats.map((s, i) => `
                <tr>
                  <td><b>${esc(s.eq.name)}</b>${i < 5 ? ' <span class="badge b-adm">топ</span>' : ''}</td>
                  <td>${s.count}</td>
                  <td>${s.avg}</td>
                  <td>
                    <div class="chart-bar-bg" style="height:10px">
                      <div class="chart-bar" style="width:${(s.sum / maxSum) * 100}%"></div>
                    </div>
                  </td>
                </tr>`).join('') || '<tr><td colspan="4" class="empty">Нет данных</td></tr>';
            })()}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <h3>Календарь занятости</h3>
      <div id="calendarBlock"></div>
    </div>
  `;

  if (typeof renderCalendarBlock === 'function') renderCalendarBlock();
  if (typeof renderDashboardCharts === 'function') renderDashboardCharts();
}
/* ============================================================================
   ДАШБОРД
   ============================================================================ */
let dashPeriod = 'all';

function dashboardBookings() {
  const { start, end } = rangeForPeriod(dashPeriod);
  return db.bookings.filter(b => {
    const t = new Date(b.created_at || b.start_datetime).getTime();
    return t >= start && t <= end;
  });
}

function renderDashboardCharts() {
  const pieEl  = document.getElementById('statusPie');
  const barsEl = document.getElementById('topRoomsBars');
  if (!pieEl || !barsEl) return;

  const list = dashboardBookings();
  const total = list.length || 1;

  const byStatus = { 'Новая': 0, 'Мероприятие назначено': 0, 'Завершено': 0 };
  list.forEach(b => { if (byStatus[b.status] !== undefined) byStatus[b.status]++; });

  const colors = {
    'Новая': '#1c3f94',
    'Мероприятие назначено': '#d98a00',
    'Завершено': '#1a9e5c'
  };

  let acc = 0;
  const segs = [];
  Object.keys(byStatus).forEach(k => {
    const deg = (byStatus[k] / total) * 360;
    segs.push(`${colors[k]} ${acc}deg ${acc + deg}deg`);
    acc += deg;
  });
  if (acc < 360) segs.push(`#e3e8f2 ${acc}deg 360deg`);

  pieEl.innerHTML = `
    <div class="pie" style="background: conic-gradient(${segs.join(',')})"></div>
    <div class="pie-legend">
      <div><span class="dot-c" style="background:${colors['Новая']}"></span> Новая: ${byStatus['Новая']}</div>
      <div><span class="dot-c" style="background:${colors['Мероприятие назначено']}"></span> Назначено: ${byStatus['Мероприятие назначено']}</div>
      <div><span class="dot-c" style="background:${colors['Завершено']}"></span> Завершено: ${byStatus['Завершено']}</div>
    </div>
  `;

  const roomCount = {};
  list.forEach(b => { roomCount[b.room_id] = (roomCount[b.room_id] || 0) + 1; });
  const top3 = Object.entries(roomCount)
    .map(([rid, cnt]) => ({ room: getRoom(rid), cnt }))
    .filter(x => x.room)
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 3);

  const maxCnt = Math.max(...top3.map(x => x.cnt), 1);

  barsEl.innerHTML = top3.length
    ? top3.map(x => `
      <div class="bar-row">
        <div class="bar-label">${esc(x.room.name)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(x.cnt / maxCnt) * 100}%"></div></div>
        <div class="bar-value">${x.cnt}</div>
      </div>`).join('')
    : '<div class="empty">Нет данных за выбранный период</div>';
}

/* ============================================================================
   ПРОПУСКА (страница администратора)
   ============================================================================ */
let passesPeriod = 'today';

function renderPassesPage() {
  const u = currentUser();
  const page = $('#page-passes');
  if (!page) return;
  if (!u || !u.is_admin) {
    page.innerHTML = `
      <div class="card empty">
        <div class="big">⛔</div>
        <p>Раздел доступен только администратору.</p>
      </div>`;
    return;
  }

  const { start, end, label } = rangeForPeriod(passesPeriod);
  const inRange = getCheckInsInRange(start, end);

  const passed  = inRange.filter(c => c.status === 'прошел').length;
  const refused = inRange.filter(c => c.status === 'отказ').length;
  const waiting = inRange.filter(c => c.status === 'ожидает').length;

  const activeBookings = db.bookings
    .filter(b => b.status === 'Мероприятие назначено')
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  const logRows = inRange
    .sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time))
    .map(c => {
      const b   = getBooking(c.booking_id);
      const usr = b ? getUser(b.user_id) : null;
      const room = b ? getRoom(b.room_id) : null;
      const stCls = c.status === 'прошел' ? 'b-done'
                  : c.status === 'отказ'  ? 'b-adm'
                  : 'b-new';
      return `<tr>
        <td>${c.id}</td>
        <td>${fmtDT(c.check_in_time)}</td>
        <td>${b ? b.id : '—'}</td>
        <td>${esc(usr ? usr.full_name : '—')}</td>
        <td>${esc(room ? room.name : '—')}</td>
        <td><span class="badge ${stCls}">${esc(c.status)}</span></td>
      </tr>`;
    }).join('');

  page.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <h1>Пропуска и сканирование</h1>
        <p class="muted">Регистрация входа, журнал сканирований, оффлайн-проверка.</p>
      </div>
      <div class="row" style="gap:6px">
        <button class="btn btn-ghost btn-sm ${passesPeriod === 'today' ? 'btn-primary' : ''}" data-action="set-passes-period" data-period="today">Сегодня</button>
        <button class="btn btn-ghost btn-sm ${passesPeriod === '7d' ? 'btn-primary' : ''}"    data-action="set-passes-period" data-period="7d">7 дней</button>
        <button class="btn btn-ghost btn-sm ${passesPeriod === '30d' ? 'btn-primary' : ''}"   data-action="set-passes-period" data-period="30d">30 дней</button>
        <button class="btn btn-ghost btn-sm ${passesPeriod === 'all' ? 'btn-primary' : ''}"   data-action="set-passes-period" data-period="all">Всё время</button>
      </div>
    </div>

    <div class="grid c4" style="margin-bottom:16px">
      <div class="stat"><div class="num">${inRange.length}</div><div class="lbl">Сканирований (${esc(label)})</div></div>
      <div class="stat"><div class="num" style="color:#1a9e5c">${passed}</div><div class="lbl">Прошли</div></div>
      <div class="stat"><div class="num" style="color:#d52b1e">${refused}</div><div class="lbl">Отказано</div></div>
      <div class="stat"><div class="num" style="color:#d98a00">${waiting}</div><div class="lbl">Ожидает</div></div>
    </div>

    <div class="card">
      <h3>Проверка пропуска</h3>
      <p class="muted small">Введите код с пропуска (CONF-RF-BOOKING-&lt;id&gt;) или просто номер заявки. Работает оффлайн, по локальным данным.</p>
      <div class="row">
        <input id="scanInput" type="text" placeholder="CONF-RF-BOOKING-5 или 5" style="max-width:420px">
        <button class="btn btn-primary btn-sm" data-action="scan-pass">Проверить</button>
      </div>
      <div id="scanResult" style="margin-top:12px"></div>
    </div>

    <div class="card">
      <h3>Активные пропуска (${activeBookings.length})</h3>
      <p class="muted small">Заявки со статусом «Мероприятие назначено».</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Заявка</th><th>Участник</th><th>Помещение</th>
              <th>Дата и время</th><th>Статус</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${activeBookings.map(b => {
              const usr  = getUser(b.user_id);
              const room = getRoom(b.room_id);
              const st   = ticketStatusForBooking(b.id);
              const stCls = st === 'прошел' ? 'b-done' : st === 'отказ' ? 'b-adm' : 'b-new';
              return `<tr>
                <td>${b.id}</td>
                <td>${esc(usr ? usr.full_name : '—')}</td>
                <td>${esc(room ? room.name : '—')}</td>
                <td>${fmtDT(b.start_datetime)}</td>
                <td><span class="badge ${stCls}">${esc(st)}</span></td>
                <td>
                  <button class="btn btn-ghost btn-sm" data-action="open-ticket" data-booking="${b.id}">Пропуск</button>
                  <button class="btn btn-primary btn-sm" data-action="checkin-pass" data-booking="${b.id}" data-status="прошел">Впустить</button>
                  <button class="btn btn-ghost btn-sm" data-action="checkin-pass" data-booking="${b.id}" data-status="отказ">Отказать</button>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="6" class="empty">Нет активных заявок</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Журнал сканирований (${esc(label)})</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Время</th><th>Заявка</th>
              <th>Участник</th><th>Помещение</th><th>Статус</th>
            </tr>
          </thead>
          <tbody>${logRows || '<tr><td colspan="6" class="empty">Сканирований пока нет</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

function scanPassLookup(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) return null;
  let id = null;
  const m = raw.match(/CONF-RF-BOOKING-(\d+)/i);
  if (m) id = +m[1];
  else if (/^\d+$/.test(raw)) id = +raw;
  if (!id) return null;
  return getBooking(id);
}