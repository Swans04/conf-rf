/* ============================================================================
   КАЛЕНДАРЬ ЗАНЯТОСТИ ПОМЕЩЕНИЙ
   ============================================================================ */

const CAL_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const CAL_DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const calState = {
  roomId: null,
  year:  new Date().getFullYear(),
  month: new Date().getMonth()
};

function calPrev()  { _calShift(-1); }
function calNext()  { _calShift(+1); }
function calToday() {
  const d = new Date();
  calState.year  = d.getFullYear();
  calState.month = d.getMonth();
  renderCalendarBlock();
}
function _calShift(delta) {
  let m = calState.month + delta;
  let y = calState.year;
  if (m < 0)  { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  calState.month = m;
  calState.year  = y;
  renderCalendarBlock();
}

function calBookingsForDay(y, m, d) {
  return db.bookings.filter(b => {
    if (calState.roomId && b.room_id !== calState.roomId) return false;
    const dt = new Date(b.start_datetime);
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
  });
}

function renderCalendarBlock() {
  const container = document.getElementById('calendarBlock');
  if (!container) return;

  const y = calState.year, m = calState.month;
  const firstDay    = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startDow    = (firstDay.getDay() + 6) % 7;

  const today = new Date(); today.setHours(0,0,0,0);

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const isPast   = cellDate < today;
    const isToday  = cellDate.getTime() === today.getTime();
    const list     = calBookingsForDay(y, m, d);
    const active   = list.filter(b => b.status !== 'Завершено');

    let cls = 'cal-cell';
    if (isPast) cls += ' past';
    if (isToday) cls += ' today';
    if (active.length) cls += ' busy';
    else if (!isPast) cls += ' free';

    const tip = list.map(b => {
      const r = getRoom(b.room_id);
      return `${fmtDT(b.start_datetime)} · ${r ? r.name : '—'} · ${b.status}`;
    }).join('\n');

    cells += `
      <div class="${cls}" data-action="cal-day"
           data-date="${y}-${pad(m + 1)}-${pad(d)}"
           ${tip ? `title="${esc(tip)}"` : ''}>
        <span class="cal-day">${d}</span>
        ${active.length ? `<span class="cal-count">${active.length}</span>` : ''}
      </div>`;
  }

  const roomOptions = db.rooms.map(r =>
    `<option value="${r.id}" ${calState.roomId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:12px;flex-wrap:wrap">
      <div class="row" style="gap:8px">
        <label style="margin:0">Помещение:</label>
        <select id="calRoom" data-action="cal-room" style="width:auto;min-width:200px">
          <option value="">— Все помещения —</option>
          ${roomOptions}
        </select>
      </div>
      <div class="row" style="gap:4px">
        <button class="btn btn-ghost btn-sm" data-action="cal-prev">←</button>
        <b style="min-width:150px;text-align:center;display:inline-block">${CAL_MONTHS[m]} ${y}</b>
        <button class="btn btn-ghost btn-sm" data-action="cal-next">→</button>
        <button class="btn btn-ghost btn-sm" data-action="cal-today">Сегодня</button>
      </div>
    </div>

    <div class="cal-grid">
      ${CAL_DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells}
    </div>

    <div class="cal-legend">
      <span><i class="lg-free"></i> свободно</span>
      <span><i class="lg-busy"></i> есть активные заявки</span>
      <span><i class="lg-past"></i> прошедшие дни</span>
    </div>
  `;
}

function openDayModal(y, m, d) {
  const list = calBookingsForDay(y, m, d);
  const label = `${pad(d)}.${pad(m + 1)}.${y}`;
  openModal(`
    <button class="close" data-action="close-modal">×</button>
    <h3>Занятость на ${label}</h3>
    ${list.length ? list.map(b => {
      const room = getRoom(b.room_id);
      return `<div class="mail-item" style="cursor:default">
        <div class="row" style="justify-content:space-between">
          <b>${esc(room ? room.name : '—')}</b>
          ${statusBadge(b.status)}
        </div>
        <div class="small muted">Начало: ${fmtDT(b.start_datetime)}</div>
        <div class="small">Оплата: ${PAYMENTS[b.payment_method] || b.payment_method}</div>
      </div>`;
    }).join('') : '<div class="empty">На этот день заявок нет</div>'}
  `);
}