/* ============================================================================
   АДМИНСКАЯ ЧАСТЬ. Подключается динамически, когда вошёл админ.
   ============================================================================ */

const SCHEMA = [
  { name: 'User', title: 'Пользователь', fields: [
    ['id', 'Счётчик', 'PK'], ['login', 'Текстовый (80)', 'UQ'],
    ['password', 'Текстовый (200)', ''], ['full_name', 'Текстовый (100)', ''],
    ['phone', 'Текстовый (20)', ''], ['email', 'Текстовый (120)', 'UQ'],
    ['is_admin', 'Логический (Да/Нет)', '']
  ]},
  { name: 'Room', title: 'Помещение', fields: [
    ['id', 'Счётчик', 'PK'], ['name', 'Текстовый (100)', 'UQ'], ['capacity', 'Числовой (целый)', '']
  ]},
  { name: 'Booking', title: 'Заявка', fields: [
    ['id', 'Счётчик', 'PK'], ['user_id', 'Числовой', 'FK'], ['room_id', 'Числовой', 'FK'],
    ['start_datetime', 'Дата/время', ''], ['payment_method', 'Текстовый (20)', ''],
    ['status', 'Текстовый (20)', ''], ['created_at', 'Дата/время', '']
  ]},
  { name: 'Review', title: 'Отзыв', fields: [
    ['id', 'Счётчик', 'PK'], ['booking_id', 'Числовой', 'FK,UQ'],
    ['text', 'Текстовый (длинный)', ''], ['rating', 'Числовой (1–5)', '']
  ]}
];

function renderER() {
  const el = document.querySelector('#page-er');
  if (!el) return;

  el.innerHTML = `
    <h1>ER-диаграмма (логическая модель)</h1>
    <p class="muted">Нотация «воронья лапка», Microsoft Access.</p>

    <div class="grid c4" style="margin-bottom:20px">
      ${SCHEMA.map(t => `
        <div class="er-box">
          <h4>${t.name} — ${t.title}</h4>
          <ul>
            ${t.fields.map(([f, type, key]) => `
              <li>
                <span>
                  <b>${f}</b>
                  ${key.includes('PK') ? '<span class="pk">PK</span>' : ''}
                  ${key.includes('FK') ? '<span class="fk">FK</span>' : ''}
                  ${key.includes('UQ') ? '<span class="uq">UQ</span>' : ''}
                </span>
                <span class="t">${type}</span>
              </li>`).join('')}
          </ul>
        </div>`).join('')}
    </div>

    <div class="card">
      <h3>Связи между таблицами</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Связь</th><th>Тип</th><th>Поле связи</th><th>Пояснение</th></tr></thead>
          <tbody>
            <tr><td>User → Booking</td><td>1 : M</td><td>Booking.user_id → User.id</td><td>Один пользователь — много заявок</td></tr>
            <tr><td>Room → Booking</td><td>1 : M</td><td>Booking.room_id → Room.id</td><td>Одно помещение — много заявок</td></tr>
            <tr><td>Booking → Review</td><td>1 : 1</td><td>Review.booking_id → Booking.id</td><td>Одна заявка — не более одного отзыва</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (typeof registerAdminPages === 'function') registerAdminPages();
  if (typeof renderNav === 'function') renderNav();
}