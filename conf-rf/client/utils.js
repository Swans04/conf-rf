/* ============================================================================
   УТИЛИТЫ
   ============================================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function pad(n){ return String(n).padStart(2, '0'); }

function hashPwd(s){
  let h = 5381;
  for (let i = 0; i < s.length; i++)
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(16) + '_' + s.length;
}

function fmtDT(iso){
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtD(iso){
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function isoShift(days, hh, mm){
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function nowISO(){ return new Date().toISOString(); }

function todayRu(){
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function parseDateInput(str){
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [_, dd, mm, yyyy, hh, mi, ss] = m;
    const d = new Date(+yyyy, +mm - 1, +dd, +(hh || 0), +(mi || 0), +(ss || 0));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

function maskPhone(v){
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '7') d = '8' + d.slice(1);
  if (d[0] !== '8') d = '8' + d;
  d = d.slice(0, 11);
  let r = '8';
  if (d.length > 1) r += '(' + d.slice(1, 4);
  if (d.length >= 5) r += ')' + d.slice(4, 7);
  if (d.length >= 8) r += '-' + d.slice(7, 9);
  if (d.length >= 10) r += '-' + d.slice(9, 11);
  return r;
}

const V = {
  login: v => /^[A-Za-z0-9]{6,}$/.test(v)
              || 'Логин: только латиница и цифры, не менее 6 символов',
  password: v => v.length >= 8
                 || 'Пароль: минимум 8 символов',
  full_name: v => /^[А-Яа-яЁё][А-Яа-яЁё\s-]*$/.test(v.trim())
                  || 'ФИО: только кириллица и пробелы',
  phone: v => /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/.test(v)
              || 'Телефон в формате 8(XXX)XXX-XX-XX',
  email: v => /^[^\s@]+@[^\s@]+\.[A-Za-zА-Яа-я]{2,}$/.test(v)
              || 'Некорректный адрес электронной почты',
  roomName: v => v.trim().length >= 2
                 || 'Укажите название помещения',
  capacity: v => (Number.isInteger(+v) && +v > 0)
                 || 'Вместимость — целое положительное число',
  name: v => v.trim().length >= 2
             || 'Название: не менее 2 символов',
  text: v => v.trim().length >= 5
             || 'Текст отзыва: не менее 5 символов',
  rating: v => (+v >= 1 && +v <= 5)
               || 'Оценка от 1 до 5',
  dateText: v => parseDateInput(v)
                 ? true
                 : 'Укажите дату в формате ДД.ММ.ГГГГ ЧЧ:ММ'
};

function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = '.3s';
  }, 2800);
  setTimeout(() => t.remove(), 3200);
}

function setField(id, valid, msg){
  const f = document.getElementById(id);
  if (!f) return;
  f.classList.toggle('invalid', !valid);
  const err = f.querySelector('.err');
  if (err && msg) err.textContent = msg;
}

/* ---------------------------------------------------------------------------
   Динамическая загрузка admin.js.
   Обычный клиент этот файл не подключает — он появляется только
   когда в системе вошёл администратор.
   --------------------------------------------------------------------------- */
function loadAdminScript() {
  if (window.__adminLoaded) return;
  window.__adminLoaded = true;

  /* Создаём секцию страницы «Схема данных» — её нет в index.html */
  const main = document.querySelector('main');
  if (!$('#page-er')) {
    const sec = document.createElement('section');
    sec.className = 'page';
    sec.id = 'page-er';
    main.appendChild(sec);
  }

  const s = document.createElement('script');
  s.src = 'admin.js';
  s.onload = () => {
    if (typeof registerAdminPages === 'function') registerAdminPages();
    if (typeof renderAll === 'function') renderAll();
    if (typeof renderNav === 'function') renderNav();
  };
  document.body.appendChild(s);
}
/* ============================================================================
   ЭКСПОРТ ЗАЯВОК В EXCEL (CSV)
   ============================================================================ */
function exportBookingsToCSV(bookings, filename) {
  const rows = [[
    'ID', 'Пользователь', 'Логин', 'Помещение',
    'Дата и время', 'Оплата', 'Статус', 'Создана', 'Отзыв'
  ]];

  bookings.forEach(b => {
    const room = getRoom(b.room_id);
    const usr  = getUser(b.user_id);
    const rev  = getReviewByBooking(b.id);
    rows.push([
      b.id,
      usr ? usr.full_name : '—',
      usr ? usr.login : '',
      room ? room.name : '—',
      fmtDT(b.start_datetime),
      PAYMENTS[b.payment_method] || b.payment_method,
      b.status,
      fmtDT(b.created_at),
      rev ? rev.rating + '/5' : ''
    ]);
  });

  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return '"' + s.replace(/"/g, '""') + '"';
  }).join(';')).join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}