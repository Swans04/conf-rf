/* ============================================================================
   МОДАЛЬНЫЕ ОКНА. Один в один как в исходнике.
   ============================================================================ */

function openModal(html){
  $('#modalRoot').innerHTML = `
    <div class="modal-back" data-action="close-modal-bg" role="dialog" aria-modal="true">
      <div class="modal" tabindex="-1">${html}</div>
    </div>`;
  setTimeout(() => {
    const m = document.querySelector('#modalRoot .modal');
    if (m) m.focus();
  }, 20);
}

function closeModal(){ $('#modalRoot').innerHTML = ''; }

function openLogin(){
  const cap = genMathCaptcha();

  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Авторизация</h3>
    <p class="muted small">Введите логин и пароль зарегистрированного пользователя.</p>
    <form id="loginForm" novalidate data-captcha="${cap.answer}">
      <div class="field" id="fl-login">
        <label for="lLogin">Логин</label>
        <input id="lLogin" name="login" autocomplete="username" placeholder="например, petrov01">
        <div class="err"></div>
      </div>
      <div class="field" id="fl-pass">
        <label for="lPass">Пароль</label>
        <input id="lPass" name="password" type="password" autocomplete="current-password">
        <div class="err"></div>
      </div>
      <div class="field" id="fl-captcha">
        <label for="lCaptcha">Проверка: <b>${cap.question}</b></label>
        <input id="lCaptcha" name="captcha" type="text" inputmode="numeric" placeholder="ответ числом">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">Войти</button>
    </form>

    <div class="switch" style="margin-top:6px">
      <a data-action="open-forgot">Забыли пароль?</a>
    </div>
    <div class="switch">Еще не зарегистрированы?
      <a data-action="open-register">Регистрация</a></div>

    <div class="hint" style="text-align:center;margin-top:12px;line-height:1.6">
      <b>Демо-доступы:</b><br>
      Администратор: <b>Conf2027 / Demo77</b><br>
      Пользователь: <b>petrov01 / petrov123</b>
    </div>
  `);
  setTimeout(() => $('#lLogin') && $('#lLogin').focus(), 50);
}

function openRegister(){
  const qOptions = SECURITY_QUESTIONS.map(q =>
    `<option value="${esc(q)}">${esc(q)}</option>`).join('');

  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Регистрация</h3>
    <p class="muted small">Все поля обязательны.</p>
    <form id="registerForm" novalidate>
      <div class="field" id="fr-login">
        <label for="rLogin">Логин *</label>
        <input id="rLogin" name="login" placeholder="латиница и цифры, не менее 6 символов">
        <div class="hint">Уникальное значение</div>
        <div class="err"></div>
      </div>

      <div class="field" id="fr-password">
        <label for="rPass">Пароль *</label>
        <input id="rPass" name="password" type="password" placeholder="минимум 8 символов">
        <div class="pwd-meter"><div class="pwd-bar" id="rPassBar"></div></div>
        <div class="hint" id="rPassHint">Надёжность пароля: —</div>
        <div class="err"></div>
      </div>

      <div class="field" id="fr-password2">
        <label for="rPass2">Повторите пароль *</label>
        <input id="rPass2" name="password2" type="password" placeholder="ещё раз">
        <div class="err"></div>
      </div>

      <div class="field" id="fr-full_name">
        <label for="rName">ФИО *</label>
        <input id="rName" name="full_name" placeholder="Иванов Иван Иванович">
        <div class="err"></div>
      </div>

      <div class="field" id="fr-phone">
        <label for="rPhone">Телефон *</label>
        <input id="rPhone" name="phone" placeholder="8(XXX)XXX-XX-XX" inputmode="numeric">
        <div class="err"></div>
      </div>

      <div class="field" id="fr-email">
        <label for="rEmail">E-mail *</label>
        <input id="rEmail" name="email" type="email" placeholder="user@example.ru">
        <div class="err"></div>
      </div>

      <div class="field" id="fr-q">
        <label for="rQ">Контрольный вопрос *</label>
        <select id="rQ" name="security_question">${qOptions}</select>
        <div class="err"></div>
      </div>

      <div class="field" id="fr-a">
        <label for="rA">Ответ *</label>
        <input id="rA" name="security_answer" placeholder="ответ (регистр не важен)">
        <div class="hint">Понадобится, если забудете пароль</div>
        <div class="err"></div>
      </div>

      <button class="btn btn-primary" type="submit" style="width:100%">Создать пользователя</button>
    </form>
    <div class="switch">Уже зарегистрированы?
      <a data-action="open-login">Войти</a></div>
  `);
  setTimeout(() => $('#rLogin') && $('#rLogin').focus(), 50);
} 

function openReview(bookingId){
  const b = getBooking(bookingId);
  if (!b) return;
  const room = getRoom(b.room_id);
  openModal(`
    <button class="close" data-action="close-modal">×</button>
    <h3>Отзыв о мероприятии</h3>
    <p class="muted small">Заявка №${b.id} ·
       ${esc(room ? room.name : '')} · ${fmtDT(b.start_datetime)}</p>
    <form id="reviewForm" novalidate data-booking="${b.id}">
      <div class="field" id="fv-rating">
        <label for="vRating">Оценка *</label>
        <select id="vRating" name="rating">
          <option value="5">5 — отлично</option>
          <option value="4">4 — хорошо</option>
          <option value="3">3 — удовлетворительно</option>
          <option value="2">2 — плохо</option>
          <option value="1">1 — очень плохо</option>
        </select>
        <div class="err"></div>
      </div>
      <div class="field" id="fv-text">
        <label for="vText">Текст отзыва *</label>
        <textarea id="vText" name="text"
          placeholder="Расскажите о помещении и организации мероприятия"></textarea>
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">
        Опубликовать отзыв</button>
    </form>
  `);
}

function openRoomForm(room){
  const isEdit = !!room;
  openModal(`
    <button class="close" data-action="close-modal">×</button>
    <h3>${isEdit ? 'Изменение помещения' : 'Новое помещение'}</h3>
    <p class="muted small">Таблица <b>Room</b>: name (Unique), capacity.</p>
    <form id="roomForm" novalidate ${isEdit ? `data-id="${room.id}"` : ''}>
      <div class="field" id="fm-name">
        <label for="mName">Название *</label>
        <input id="mName" name="name"
               value="${isEdit ? esc(room.name) : ''}"
               placeholder="например, Аудитория 101">
        <div class="err"></div>
      </div>
      <div class="field" id="fm-capacity">
        <label for="mCap">Вместимость, чел. *</label>
        <input id="mCap" name="capacity" type="number" min="1" step="1"
               value="${isEdit ? room.capacity : ''}" placeholder="100">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">
        ${isEdit ? 'Сохранить изменения' : 'Добавить помещение'}
      </button>
    </form>
  `);
}
function openForgotPassword(){
  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Восстановление пароля</h3>
    <p class="muted small">Введите логин — система задаст ваш контрольный вопрос.</p>
    <form id="forgotForm" novalidate>
      <div class="field" id="ff-login">
        <label for="fLogin">Логин</label>
        <input id="fLogin" name="login" placeholder="ваш логин" autocomplete="username">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">Продолжить</button>
    </form>
    <div class="switch">Вспомнили пароль? <a data-action="open-login">Войти</a></div>
  `);
  setTimeout(() => $('#fLogin') && $('#fLogin').focus(), 50);
}

function openAnswerQuestion(userId, question){
  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Контрольный вопрос</h3>
    <p class="muted small"><b>${esc(question)}</b></p>
    <form id="answerForm" novalidate data-user="${userId}">
      <div class="field" id="fa-answer">
        <label for="aAnswer">Ответ</label>
        <input id="aAnswer" name="answer" placeholder="регистр не важен">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">Проверить</button>
    </form>
    <div class="switch"><a data-action="open-forgot">← Другой логин</a></div>
  `);
  setTimeout(() => $('#aAnswer') && $('#aAnswer').focus(), 50);
}

function openResetPassword(userId){
  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Новый пароль</h3>
    <p class="muted small">Придумайте новый пароль.</p>
    <form id="resetForm" novalidate data-user="${userId}">
      <div class="field" id="fp-pass">
        <label for="pPass">Новый пароль</label>
        <input id="pPass" name="password" type="password" placeholder="минимум 8 символов">
        <div class="pwd-meter"><div class="pwd-bar" id="pPassBar"></div></div>
        <div class="hint" id="pPassHint">Надёжность пароля: —</div>
        <div class="err"></div>
      </div>
      <div class="field" id="fp-pass2">
        <label for="pPass2">Повторите пароль</label>
        <input id="pPass2" name="password2" type="password" placeholder="повторите пароль">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">Сохранить новый пароль</button>
    </form>
  `);
  setTimeout(() => $('#pPass') && $('#pPass').focus(), 50);
}

function openChangePassword(){
  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Смена пароля</h3>
    <p class="muted small">Введите текущий пароль и придумайте новый.</p>
    <form id="changePwdForm" novalidate>
      <div class="field" id="cp-old">
        <label for="cpOld">Текущий пароль</label>
        <input id="cpOld" type="password" placeholder="текущий пароль">
        <div class="err"></div>
      </div>
      <div class="field" id="cp-new">
        <label for="cpNew">Новый пароль</label>
        <input id="cpNew" type="password" placeholder="минимум 8 символов">
        <div class="pwd-meter"><div class="pwd-bar" id="cpBar"></div></div>
        <div class="hint" id="cpHint">Надёжность пароля: —</div>
        <div class="err"></div>
      </div>
      <div class="field" id="cp-new2">
        <label for="cpNew2">Повторите новый пароль</label>
        <input id="cpNew2" type="password" placeholder="повторите">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">Сохранить</button>
    </form>
  `);
  setTimeout(() => $('#cpOld') && $('#cpOld').focus(), 50);
}
function openEquipmentForm(eq) {
  const isEdit = !!eq;
  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>${isEdit ? 'Изменение оборудования' : 'Новое оборудование'}</h3>
    <form id="equipmentForm" novalidate ${isEdit ? `data-id="${eq.id}"` : ''}>
      <div class="field" id="fe-name">
        <label for="eName">Название *</label>
        <input id="eName" name="name" value="${isEdit ? esc(eq.name) : ''}"
               placeholder="например, Проектор Epson">
        <div class="err"></div>
      </div>
      <div class="field" id="fe-qty">
        <label for="eQty">Всего единиц *</label>
        <input id="eQty" name="total_quantity" type="number" min="1" step="1"
               value="${isEdit ? eq.total_quantity : ''}" placeholder="3">
        <div class="err"></div>
      </div>
      <div class="field" id="fe-desc">
        <label for="eDesc">Описание</label>
        <input id="eDesc" name="description" value="${isEdit ? esc(eq.description || '') : ''}"
               placeholder="краткое описание">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">
        ${isEdit ? 'Сохранить изменения' : 'Добавить'}
      </button>
    </form>
  `);
  setTimeout(() => $('#eName') && $('#eName').focus(), 50);
}
function openTicket(bookingId) {
  const b = getBooking(bookingId);
  if (!b) return;
  const room = getRoom(b.room_id);
  const usr  = getUser(b.user_id);
  if (!usr) return;

  if (b.status !== 'Мероприятие назначено') {
    toast('Пропуск доступен только для заявок со статусом «Мероприятие назначено»', 'err');
    return;
  }

  const code = ticketCode(b.id);

  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
    <h3>Цифровой пропуск</h3>
    <div class="ticket" id="ticketCard">
      <div class="ticket-head">
        <div class="ticket-brand">Конференции.РФ</div>
        <div class="ticket-code">Заявка №${b.id}</div>
      </div>
      <div class="ticket-body">
        <div class="ticket-name">${esc(usr.full_name)}</div>
        <div class="ticket-row"><span>Помещение:</span> <b>${esc(room ? room.name : '—')}</b></div>
        <div class="ticket-row"><span>Дата и время:</span> <b>${fmtDT(b.start_datetime)}</b></div>
        <div class="ticket-row"><span>Оплата:</span> <b>${PAYMENTS[b.payment_method] || b.payment_method}</b></div>
        <div class="ticket-qr"><canvas id="ticketQR"></canvas></div>
        <div class="ticket-bar"><canvas id="ticketBar"></canvas></div>
        <div class="ticket-hint">Код: ${esc(code)}</div>
      </div>
    </div>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px">
      <button class="btn btn-ghost btn-sm" data-action="print-ticket">Печать</button>
      <button class="btn btn-primary btn-sm" data-action="download-ticket" data-booking="${b.id}">Скачать PNG</button>
    </div>
  `);

  setTimeout(() => {
    const qr = document.getElementById('ticketQR');
    const bar = document.getElementById('ticketBar');
    if (qr) drawQRCode(qr, code, 200);
    if (bar) drawBarcode(bar, code, 420, 80);
  }, 30);
}