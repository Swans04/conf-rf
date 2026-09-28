/* ============================================================================
   МОДАЛЬНЫЕ ОКНА. Один в один как в исходнике.
   ============================================================================ */

function openModal(html){
  $('#modalRoot').innerHTML = `
    <div class="modal-back" data-action="close-modal-bg">
      <div class="modal">${html}</div>
    </div>`;
}

function closeModal(){ $('#modalRoot').innerHTML = ''; }

function openLogin(){
  openModal(`
    <button class="close" data-action="close-modal">×</button>
    <h3>Авторизация</h3>
    <p class="muted small">Введите логин и пароль зарегистрированного пользователя.</p>
    <form id="loginForm" novalidate>
      <div class="field" id="fl-login">
        <label for="lLogin">Логин</label>
        <input id="lLogin" name="login" autocomplete="username"
               placeholder="например, petrov01">
        <div class="err"></div>
      </div>
      <div class="field" id="fl-pass">
        <label for="lPass">Пароль</label>
        <input id="lPass" name="password" type="password"
               autocomplete="current-password">
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">Войти</button>
    </form>

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
  openModal(`
    <button class="close" data-action="close-modal">×</button>
    <h3>Регистрация</h3>
    <p class="muted small">Поля соответствуют таблице <b>User</b>.
       Все поля обязательны.</p>
    <form id="registerForm" novalidate>
      <div class="field" id="fr-login">
        <label for="rLogin">Логин *</label>
        <input id="rLogin" name="login"
               placeholder="латиница и цифры, не менее 6 символов">
        <div class="hint">Уникальное значение</div>
        <div class="err"></div>
      </div>
      <div class="field" id="fr-password">
        <label for="rPass">Пароль *</label>
        <input id="rPass" name="password" type="password"
               placeholder="минимум 8 символов">
        <div class="hint">Хранится в виде хеша</div>
        <div class="err"></div>
      </div>
      <div class="field" id="fr-full_name">
        <label for="rName">ФИО *</label>
        <input id="rName" name="full_name" placeholder="Иванов Иван Иванович">
        <div class="hint">Только кириллица и пробелы</div>
        <div class="err"></div>
      </div>
      <div class="field" id="fr-phone">
        <label for="rPhone">Телефон *</label>
        <input id="rPhone" name="phone"
               placeholder="8(XXX)XXX-XX-XX" inputmode="numeric">
        <div class="err"></div>
      </div>
      <div class="field" id="fr-email">
        <label for="rEmail">E-mail *</label>
        <input id="rEmail" name="email" type="email"
               placeholder="user@example.ru">
        <div class="hint">Уникальное значение</div>
        <div class="err"></div>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">
        Создать пользователя</button>
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