/* Топ-5 помещений по числу заявок */
function queryTopRooms(limit = 5) {
  const counts = {};
  db.bookings.forEach(b => {
    counts[b.room_id] = (counts[b.room_id] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([roomId, count]) => ({ room: getRoom(roomId), count }))
    .filter(x => x.room)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function renderTopRoomsChart() {
  const el = document.getElementById('topRoomsChart');
  if (!el) return;
  const data = queryTopRooms(5);
  if (!data.length) { el.innerHTML = '<div class="empty">Нет данных</div>'; return; }
  const max = Math.max(...data.map(x => x.count));
  el.innerHTML = data.map(x => `
    <div class="chart-row">
      <span class="chart-label">${esc(x.room.name)}</span>
      <div class="chart-bar-bg"><div class="chart-bar" style="width:${(x.count / max) * 100}%"></div></div>
      <span class="chart-value">${x.count}</span>
    </div>`).join('');
}

/* Загруженность по дням недели */
function queryWeekdayLoad() {
  const names = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  db.bookings.forEach(b => {
    const d = new Date(b.start_datetime);
    counts[(d.getDay() + 6) % 7]++;
  });
  return names.map((name, i) => ({ name, count: counts[i] }));
}

function renderWeekdayChart() {
  const el = document.getElementById('weekdayChart');
  if (!el) return;
  const data = queryWeekdayLoad();
  const max = Math.max(...data.map(x => x.count), 1);
  el.innerHTML = data.map(x => `
    <div class="wd-col">
      <div class="wd-bar-wrap">
        <div class="wd-bar" style="height:${(x.count / max) * 100}%">
          <span class="wd-count">${x.count}</span>
        </div>
      </div>
      <div class="wd-label">${x.name}</div>
    </div>`).join('');
}

/* Средний рейтинг по помещениям */
function queryAvgRatingByRoom() {
  const map = {};
  db.reviews.forEach(r => {
    const b = getBooking(r.booking_id);
    if (!b) return;
    if (!map[b.room_id]) map[b.room_id] = { sum: 0, n: 0 };
    map[b.room_id].sum += r.rating;
    map[b.room_id].n++;
  });
  return Object.entries(map)
    .map(([rid, v]) => ({ room: getRoom(rid), avg: +(v.sum / v.n).toFixed(1), count: v.n }))
    .filter(x => x.room)
    .sort((a, b) => b.avg - a.avg);
}

function renderAvgRatingList() {
  const el = document.getElementById('avgRatingList');
  if (!el) return;
  const data = queryAvgRatingByRoom();
  if (!data.length) { el.innerHTML = '<div class="empty">Пока нет отзывов</div>'; return; }
  el.innerHTML = data.map(x => `
    <div class="chart-row">
      <span class="chart-label">${esc(x.room.name)}</span>
      <span class="stars">${starsHTML(Math.round(x.avg))}</span>
      <span class="chart-value">${x.avg} <span class="muted small">(${x.count})</span></span>
    </div>`).join('');
}

/* Топ-5 активных пользователей */
function queryTopUsers(limit = 5) {
  const map = {};
  db.bookings.forEach(b => { map[b.user_id] = (map[b.user_id] || 0) + 1; });
  return Object.entries(map)
    .map(([uid, count]) => ({ user: getUser(uid), count }))
    .filter(x => x.user)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function renderTopUsersList() {
  const el = document.getElementById('topUsersList');
  if (!el) return;
  const data = queryTopUsers(5);
  if (!data.length) { el.innerHTML = '<div class="empty">Нет данных</div>'; return; }
  el.innerHTML = data.map(x => `
    <div class="chart-row">
      <span class="chart-label">${esc(x.user.full_name)}</span>
      <span class="chart-value">${x.count}</span>
    </div>`).join('');
}

/* Фильтр по диапазону дат */
function queryBookingsByDateRange(list, from, to) {
  if (!from && !to) return list;
  const fromT = from ? new Date(from).getTime() : -Infinity;
  const toT   = to   ? new Date(to + 'T23:59:59').getTime() : Infinity;
  return list.filter(b => {
    const t = new Date(b.start_datetime).getTime();
    return t >= fromT && t <= toT;
  });
}

/* Глобальный поиск */
function queryGlobalSearch(text) {
  const q = String(text || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];

  db.bookings.forEach(b => {
    const room = getRoom(b.room_id);
    const usr  = getUser(b.user_id);
    const hay  = [String(b.id), room ? room.name : '', usr ? usr.full_name : '', usr ? usr.login : '', b.status]
      .join(' ').toLowerCase();
    if (hay.includes(q)) out.push({
      type: 'booking', id: b.id,
      title: `Заявка №${b.id}`,
      sub: (room ? room.name : '—') + ' · ' + b.status
    });
  });

  db.rooms.forEach(r => {
    if (r.name.toLowerCase().includes(q)) out.push({
      type: 'room', id: r.id,
      title: r.name, sub: 'Помещение · ' + r.capacity + ' мест'
    });
  });

  db.users.forEach(u => {
    if (u.login.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q))
      out.push({
        type: 'user', id: u.id,
        title: u.full_name,
        sub: u.login + ' · ' + (u.is_admin ? 'Администратор' : 'Пользователь')
      });
  });

  return out.slice(0, 8);
}

/* Активные заявки (для бейджа) */
function queryActiveBookingsCount() {
  return db.bookings.filter(b => b.status !== 'Завершено').length;
}

/* Поиск по страницам с подсветкой совпадений */
function highlightMatch(text, query) {
  const s = String(text ?? '');
  if (!query) return esc(s);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(' + q + ')', 'gi');
  return esc(s).replace(re, '<mark>$1</mark>');
}