let pendingEquipment = [];
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'install-pwa': {
      if (window.__installPrompt) {
        window.__installPrompt.prompt();
        window.__installPrompt.userChoice.then(choice => {
          if (choice.outcome === 'accepted') toast('Устанавливаем…', 'ok');
          window.__installPrompt = null;
          renderNav();
        });
      } else {
        toast('Установка недоступна. Установите через меню браузера → «Установить приложение»', 'err');
      }
      break;
    }
    case 'nav':            go(el.dataset.page); break;
    case 'open-login':     closeModal(); openLogin(); break;
    case 'open-register':  closeModal(); openRegister(); break;
    case 'close-modal':    closeModal(); break;
    case 'close-modal-bg': if (e.target === el) closeModal(); break;

    case 'logout': {
      if (currentUser()) logSecurity('logout', { login: currentUser().login });
      session = null;
      localStorage.removeItem(LS_SES);
      ADMIN_ONLY_PAGES_RESET();
      stopIdleWatch();
      toast('Вы вышли из системы');
      if (currentPage === 'admin' || currentPage === 'er' || currentPage === 'messages') go('home');
      else { renderNav(); renderAll(); }
      break;
    }

    case 'book-room': {
      go('booking');
      setTimeout(() => {
        const input = $('#bRoomName');
        if (input) {
          const r = getRoom(el.dataset.room);
          if (r) input.value = r.name;
          input.focus();
        }
      }, 50);
      break;
    }
        case 'open-ticket':         openTicket(el.dataset.booking); break;
    case 'set-dash-period':     dashPeriod = el.dataset.period; renderAll(); break;
    case 'set-passes-period':   passesPeriod = el.dataset.period; renderPassesPage(); break;

    case 'download-ticket': {
      const bId = el.dataset.booking;
      const qr = document.getElementById('ticketQR');
      const bar = document.getElementById('ticketBar');
      if (qr) downloadCanvasAsPng(qr, 'QR_booking_' + bId + '.png');
      setTimeout(() => {
        if (bar) downloadCanvasAsPng(bar, 'Barcode_booking_' + bId + '.png');
      }, 200);
      toast('QR-код и штрихкод скачаны', 'ok');
      break;
    }

    case 'print-ticket': {
      const card = document.getElementById('ticketCard');
      if (!card) break;
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Пропуск</title>' +
        '<style>body{font-family:Arial;padding:20px}.ticket{border:2px solid #1c3f94;border-radius:12px;padding:20px;max-width:480px}.ticket-head{display:flex;justify-content:space-between;border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:12px}.ticket-brand{font-weight:700;color:#1c3f94}.ticket-name{font-size:20px;font-weight:700;margin-bottom:10px}.ticket-row{margin:4px 0}.ticket-row span{color:#666}.ticket-qr,.ticket-bar{text-align:center;margin-top:12px}</style></head><body>' + card.outerHTML + '</body></html>');
      w.document.close();
      w.print();
      break;
    }

    case 'scan-pass': {
      const input = document.getElementById('scanInput');
      const result = document.getElementById('scanResult');
      if (!input || !result) break;
      const b = scanPassLookup(input.value);
      if (!b) { result.innerHTML = '<div class="card empty" style="padding:12px">Пропуск не найден</div>'; break; }
      const usr  = getUser(b.user_id);
      const room = getRoom(b.room_id);
      const st   = ticketStatusForBooking(b.id);
      result.innerHTML = `
        <div class="card" style="padding:14px">
          <div><b>Заявка №${b.id}</b> — ${esc(usr ? usr.full_name : '—')}</div>
          <div class="small muted">${esc(room ? room.name : '—')} · ${fmtDT(b.start_datetime)}</div>
          <div style="margin-top:8px">Статус: <b>${esc(st)}</b></div>
          <div class="row" style="margin-top:10px;gap:6px">
            <button class="btn btn-primary btn-sm" data-action="checkin-pass" data-booking="${b.id}" data-status="прошел">Впустить</button>
            <button class="btn btn-ghost btn-sm" data-action="checkin-pass" data-booking="${b.id}" data-status="отказ">Отказать</button>
          </div>
        </div>`;
      break;
    }

    case 'checkin-pass': {
      createCheckIn({ booking_id: +el.dataset.booking, status: el.dataset.status });
      saveDB();
      toast('Зафиксировано: ' + el.dataset.status, 'ok');
      renderPassesPage();
      const result = document.getElementById('scanResult');
      if (result) result.innerHTML = '';
      break;
    }

    /* Резервное копирование */
    case 'export-db': {
      const dump = {
        exported_at: nowISO(),
        version: 3,
        users: db.users, rooms: db.rooms, bookings: db.bookings,
        reviews: db.reviews, emails: db.emails,
        equipment: db.equipment, bookingEquipment: db.bookingEquipment,
        checkins: db.checkins, securityLog: db.securityLog,
        securityQuestions: db.securityQuestions,
        loginAttempts: db.loginAttempts,
        seq: db.seq
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conf_rf_backup_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Файл резервной копии сохранён', 'ok');
      break;
    }

    case 'import-db': {
      const input = document.getElementById('importFile');
      if (input) input.click();
      break;
    }
    case 'open-forgot':      closeModal(); openForgotPassword(); break;
    case 'open-change-pwd':  closeModal(); openChangePassword(); break;
    case 'add-equipment':  openEquipmentForm(null); break;
    case 'edit-equipment': openEquipmentForm(getEquipment(el.dataset.id)); break;

    case 'del-equipment': {
      const eq = getEquipment(el.dataset.id);
      if (!eq) break;
      const used = db.bookingEquipment.filter(x => x.equipment_id === eq.id).length;
      if (used) { toast(`Нельзя удалить: используется в ${used} заявках`, 'err'); break; }
      if (!confirm(`Удалить «${eq.name}»?`)) break;
      db.equipment = db.equipment.filter(x => x.id !== eq.id);
      saveDB(); renderAll();
      toast('Оборудование удалено', 'ok');
      break;
    }

    case 'add-pending-equipment': {
      const sel = document.getElementById('pickEquipment');
      const qty = document.getElementById('pickQty');
      if (!sel || !qty) break;
      const eqId = +sel.value;
      const q = +qty.value;
      if (!eqId) { toast('Выберите оборудование', 'err'); break; }
      if (!Number.isInteger(q) || q <= 0) { toast('Количество — целое положительное', 'err'); break; }

      const dateStr = ($('#bDate') && $('#bDate').value) || '';
      const d = parseDateInput(dateStr);
      if (!d) { toast('Сначала укажите корректную дату', 'err'); break; }
      const isoDT = d.toISOString();

      const avail = equipmentAvailableForForm(eqId, isoDT, null, pendingEquipment);
      if (q > avail) { toast(`Доступно только ${avail} шт. на это время`, 'err'); break; }

      const existing = pendingEquipment.find(p => p.equipment_id === eqId);
      if (existing) {
        existing.quantity += q;
      } else {
        pendingEquipment.push({ equipment_id: eqId, quantity: q });
      }

      sel.value = '';
      qty.value = 1;
      renderPendingEquipment();
      break;
    }

    case 'remove-pending-equipment': {
      const idx = +el.dataset.idx;
      pendingEquipment.splice(idx, 1);
      renderPendingEquipment();
      break;
    }
    case 'open-review':  openReview(el.dataset.booking); break;
    case 'add-room':     openRoomForm(null); break;
    case 'edit-room':    openRoomForm(getRoom(el.dataset.id)); break;

    /* --- Сообщения --- */
    case 'open-email': {
      openEmail(el.dataset.id);
      renderNav();
      renderAll();
      break;
    }
    case 'mark-all-emails-read': {
      markAllEmailsRead();
      saveDB();
      renderNav();
      renderAll();
      toast('Все сообщения прочитаны', 'ok');
      break;
    }

    case 'del-room': {
      const room = getRoom(el.dataset.id);
      if (!room) break;
      const used = db.bookings.filter(b => b.room_id === room.id).length;
      if (used) { toast(`Нельзя удалить: по помещению есть ${used} заявок`, 'err'); break; }
      if (!confirm(`Удалить помещение «${room.name}»?`)) break;
      db.rooms = db.rooms.filter(r => r.id !== room.id);
      saveDB(); renderAll();
      toast('Помещение удалено', 'ok');
      break;
    }

    case 'del-user': {
      const user = getUser(el.dataset.id);
      if (!user) break;
      if (user.id === session) { toast('Нельзя удалить себя', 'err'); break; }
      const cnt = db.bookings.filter(b => b.user_id === user.id).length;
      if (cnt) { toast(`Нельзя удалить: у пользователя ${cnt} заявок`, 'err'); break; }
      if (!confirm(`Удалить пользователя ${user.login}?`)) break;
      db.users = db.users.filter(u => u.id !== user.id);
      saveDB(); renderAll();
      toast('Пользователь удалён', 'ok');
      break;
    }

    case 'del-booking': {
      const b = getBooking(el.dataset.id);
      if (!b) break;
      if (!confirm(`Удалить заявку №${b.id}?`)) break;
      db.bookings = db.bookings.filter(x => x.id !== b.id);
      db.reviews  = db.reviews.filter(r => r.booking_id !== b.id);
      saveDB(); renderAll();
      toast('Заявка удалена', 'ok');
      break;
    }

    case 'reset-db':
      if (!confirm('Сбросить все данные и вернуть демо-набор?')) return;
      seed(); session = null;
      localStorage.removeItem(LS_SES);
      myFilter.search = ''; myFilter.status = 'Все';
      myFilter.dateFrom = ''; myFilter.dateTo = '';
      mySort.column = null; mySort.dir = 'asc';
      adminSort.column = null; adminSort.dir = 'asc';
      ADMIN_ONLY_PAGES_RESET();
      go('home');
      toast('Демо-данные восстановлены', 'ok');
      break;

    /* --- Календарь --- */
    case 'cal-prev':  calPrev(); break;
    case 'cal-next':  calNext(); break;
    case 'cal-today': calToday(); break;
    case 'cal-day': {
      const [y, m, d] = el.dataset.date.split('-').map(Number);
      openDayModal(y, m - 1, d);
      break;
    }

    /* --- Сортировки --- */
    case 'sort-my': {
      const col = el.dataset.col;
      if (mySort.column === col) mySort.dir = mySort.dir === 'asc' ? 'desc' : 'asc';
      else { mySort.column = col; mySort.dir = 'asc'; }
      renderMyTable();
      break;
    }
    case 'sort-admin': {
      const col = el.dataset.col;
      if (adminSort.column === col) adminSort.dir = adminSort.dir === 'asc' ? 'desc' : 'asc';
      else { adminSort.column = col; adminSort.dir = 'asc'; }
      renderAll();
      break;
    }

    /* --- Фильтр по датам --- */
    case 'reset-date-filter': {
      myFilter.dateFrom = '';
      myFilter.dateTo = '';
      renderMy();
      break;
    }

    /* --- Экспорт в Excel --- */
    case 'export-bookings': {
      const src = el.dataset.source;
      let list, name;

      if (src === 'my') {
        list = getMyFilteredBookings();
        name = 'Мои_заявки';
      } else {
        list = [...db.bookings];
        if (adminSort.column) list = sortBookings(list, adminSort);
        else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        name = 'Все_заявки';
      }

      if (!list.length) {
        toast('Нечего выгружать — список пуст', 'err');
        break;
      }

      const date = new Date().toISOString().slice(0, 10);
      if (typeof exportBookingsToCSV === 'function') {
        exportBookingsToCSV(list, `${name}_${date}.csv`);
        toast(`Выгружено заявок: ${list.length}`, 'ok');
      } else {
        toast('Функция экспорта не найдена — проверьте utils.js', 'err');
      }
      break;
    }

    /* --- Глобальный поиск --- */
    case 'gr-go': {
      const type = el.dataset.type;
      const id   = +el.dataset.id;
      const box = document.getElementById('globalResults');
      const inp = document.getElementById('globalSearch');
      if (box) box.classList.remove('show');
      if (inp) inp.value = '';

      if (type === 'booking') {
        myFilter.search = ''; myFilter.status = 'Все';
        myFilter.dateFrom = ''; myFilter.dateTo = '';
        go('my');
      }
      if (type === 'room') go('rooms');
      if (type === 'user' && currentUser() && currentUser().is_admin) go('admin');
      break;
    }
  }
});

function ADMIN_ONLY_PAGES_RESET() {
  if (typeof PAGES !== 'undefined') {
    const i = PAGES.findIndex(p => p.id === 'er');
    if (i >= 0) PAGES.splice(i, 1);
  }
  window.__adminLoaded = false;
  const er = document.getElementById('page-er');
  if (er) er.remove();
}

document.addEventListener('change', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  if (el.dataset.action === 'set-status') {
    const b = getBooking(el.dataset.id);
    if (!b) return;
    const old = b.status;
    b.status = el.value;
    saveDB();
    toast(`Заявка №${b.id}: «${old}» → «${b.status}»`, 'ok');
    if (old !== b.status && typeof sendStatusEmail === 'function') {
      sendStatusEmail(b, old, b.status);
    }
    renderNav();
    renderAll();
    return;
  if (el.dataset.action === 'set-equipment-status') {
    const be = getBookingEquipment(el.dataset.id);
    if (!be) return;
    const old = be.status;
    be.status = el.value;

    if (be.status === 'подтверждено' || be.status === 'выдано') {
      const b = getBooking(be.booking_id);
      if (b) {
        const used = equipmentBookedAtTime(be.equipment_id, b.start_datetime, be.booking_id) + be.quantity;
        const eq = getEquipment(be.equipment_id);
        if (eq && used > eq.total_quantity) {
          be.status = old;
          saveDB();
          toast(`Конфликт: «${eq.name}» — нужно ${used} шт., всего ${eq.total_quantity}`, 'err');
          renderAll();
          return;
        }
      }
    }

    saveDB();
    toast(`Запрос ${be.id}: «${old}» → «${be.status}»`, 'ok');
    renderAll();
  }
  }

  if (el.dataset.action === 'cal-room') {
    calState.roomId = el.value ? +el.value : null;
    renderCalendarBlock();
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'myStatus') {
    myFilter.status = e.target.value;
    renderMyTable();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'rPhone') e.target.value = maskPhone(e.target.value);
    ['rPass', 'pPass', 'cpNew'].forEach(id => {
    if (e.target.id === id) updatePwdMeter(e.target.value, id);
  });
  if (e.target.id === 'mySearch') {
    myFilter.search = e.target.value;
    renderMyTable();
  }
  if (e.target.id === 'myDateFrom') {
    myFilter.dateFrom = e.target.value;
    renderMyTable();
  }
  if (e.target.id === 'myDateTo') {
    myFilter.dateTo = e.target.value;
    renderMyTable();
  }

  if (e.target.id === 'globalSearch') {
    showGlobalResults(e.target.value);
  }
  if (e.target.id === 'bDate') {
    if (typeof renderPendingEquipment === 'function') renderPendingEquipment();
  }
});

/* Закрытие выпадающего списка глобального поиска при клике вне */
document.addEventListener('click', e => {
  const box = document.getElementById('globalResults');
  const inp = document.getElementById('globalSearch');
  if (!box || !inp) return;
  if (!box.contains(e.target) && e.target !== inp) box.classList.remove('show');
});

/* Функция отображения глобальных результатов */
function showGlobalResults(text) {
  const box = document.getElementById('globalResults');
  if (!box) return;

  if (typeof queryGlobalSearch !== 'function') return;

  const list = queryGlobalSearch(text);
  if (!text.trim() || text.trim().length < 2) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }
  if (!list.length) {
    box.innerHTML = '<div class="gr-empty">Ничего не найдено</div>';
    box.classList.add('show');
    return;
  }
  box.innerHTML = list.map(r => `
    <div class="gr-item" data-action="gr-go" data-type="${r.type}" data-id="${r.id}">
      <div><b>${typeof highlightMatch === 'function' ? highlightMatch(r.title, text) : esc(r.title)}</b></div>
      <div class="gr-sub">${typeof highlightMatch === 'function' ? highlightMatch(r.sub, text) : esc(r.sub)}</div>
    </div>`).join('');
  box.classList.add('show');
}

/* --- Отправка форм --- */
document.addEventListener('submit', e => {
  const form = e.target;
  e.preventDefault();

  /* Авторизация */
    if (form.id === 'loginForm') {
    const login   = $('#lLogin').value.trim();
    const pass    = $('#lPass').value;
    const captcha = $('#lCaptcha').value.trim();
    setField('fl-login', true); setField('fl-pass', true); setField('fl-captcha', true);

    if (!login) return setField('fl-login', false, 'Введите логин');
    if (!pass)  return setField('fl-pass',  false, 'Введите пароль');

    /* Блокировка */
    const block = isLoginBlocked(login);
    if (block) {
      const sec = Math.ceil((block.blocked_until - Date.now()) / 1000);
      const min = Math.floor(sec / 60);
      const s   = sec % 60;
      return setField('fl-login', false,
        `Слишком много попыток. Повторите через ${min} мин ${s} сек`);
    }

    /* CAPTCHA */
    if (+captcha !== +form.dataset.captcha) {
      logSecurity('login_fail', { login, reason: 'captcha' });
      return setField('fl-captcha', false, 'Неверный ответ. Попробуйте снова.');
    }

    /* Проверка логина/пароля */
    const u = db.users.find(x => x.login.toLowerCase() === login.toLowerCase());
    if (!u || u.password !== hashPwd(pass)) {
      const a = incLoginAttempt(login);
      logSecurity('login_fail', { login, attempts: a.attempts });
      if (a.blocked_until) {
        const sec = Math.ceil((a.blocked_until - Date.now()) / 1000);
        const min = Math.floor(sec / 60);
        logSecurity('login_blocked', { login, minutes: min });
        return setField('fl-login', false,
          `Аккаунт заблокирован на ${min} мин — превышено ${MAX_LOGIN_ATTEMPTS} попыток`);
      }
      const left = MAX_LOGIN_ATTEMPTS - a.attempts;
      return setField('fl-login', false,
        `Неверный логин или пароль. Осталось попыток: ${left}`);
    }

    /* Успех */
    resetLoginAttempt(login);
    session = u.id;
    localStorage.setItem(LS_SES, String(u.id));
    logSecurity('login_success', { login: u.login });
    closeModal();
    if (u.is_admin && typeof loadAdminScript === 'function') loadAdminScript();
    startIdleWatch();
    renderNav(); renderAll();
    toast(`Добро пожаловать, ${u.full_name.split(' ')[1] || u.login}!`, 'ok');
    return;
  }

  /* Регистрация */
    if (form.id === 'registerForm') {
    const data = {
      login:     $('#rLogin').value.trim(),
      password:  $('#rPass').value,
      password2: $('#rPass2').value,
      full_name: $('#rName').value.trim(),
      phone:     $('#rPhone').value.trim(),
      email:     $('#rEmail').value.trim(),
      question:  $('#rQ').value,
      answer:    $('#rA').value.trim()
    };
    ['login','password','password2','full_name','phone','email','q','a']
      .forEach(k => setField('fr-' + k, true));

    let ok = true;
    for (const k of ['login','password','full_name','phone','email']) {
      const res = V[k](data[k]);
      if (res !== true) { setField('fr-' + k, false, res); ok = false; }
    }
    if (data.password !== data.password2) {
      setField('fr-password2', false, 'Пароли не совпадают'); ok = false;
    }
    if (pwdStrength(data.password) < 2) {
      setField('fr-password', false, 'Слишком слабый пароль — добавьте заглавные, цифры или символы');
      ok = false;
    }
    if (data.answer.length < 2) {
      setField('fr-a', false, 'Ответ должен быть не короче 2 символов'); ok = false;
    }
    if (!ok) return;

    if (db.users.some(u => u.login.toLowerCase() === data.login.toLowerCase()))
      return setField('fr-login', false, 'Такой логин уже занят');
    if (db.users.some(u => u.email.toLowerCase() === data.email.toLowerCase()))
      return setField('fr-email', false, 'Такой e-mail уже зарегистрирован');

    const u = createUser({ ...data, is_admin: false });
    setSecurityQuestion(u.id, data.question, data.answer);
    saveDB();

    session = u.id;
    localStorage.setItem(LS_SES, String(u.id));
    logSecurity('register', { login: u.login });
    closeModal();
    startIdleWatch();
    renderNav(); renderAll();
    toast('Пользователь создан. Добро пожаловать!', 'ok');
    return;
  }
    /* Восстановление: шаг 1 — логин */
  if (form.id === 'forgotForm') {
    const login = $('#fLogin').value.trim();
    setField('ff-login', true);
    if (!login) return setField('ff-login', false, 'Введите логин');

    const u = db.users.find(x => x.login.toLowerCase() === login.toLowerCase());
    if (!u) return setField('ff-login', false, 'Пользователь с таким логином не найден');

    const q = getSecurityQuestion(u.id);
    if (!q) return setField('ff-login', false,
      'У этого пользователя не задан контрольный вопрос. Обратитесь к администратору.');

    openAnswerQuestion(u.id, q.question);
    return;
  }

  /* Восстановление: шаг 2 — ответ */
  if (form.id === 'answerForm') {
    const userId = +form.dataset.user;
    const answer = $('#aAnswer').value.trim();
    setField('fa-answer', true);
    if (!answer) return setField('fa-answer', false, 'Введите ответ');

    if (!checkSecurityAnswer(userId, answer)) {
      const u = getUser(userId);
      logSecurity('password_reset_fail', { login: u ? u.login : null, reason: 'wrong_answer' });
      return setField('fa-answer', false, 'Неверный ответ');
    }
    openResetPassword(userId);
    return;
  }

  /* Восстановление: шаг 3 — новый пароль */
  if (form.id === 'resetForm') {
    const userId = +form.dataset.user;
    const pass1  = $('#pPass').value;
    const pass2  = $('#pPass2').value;
    setField('fp-pass', true); setField('fp-pass2', true);

    if (V.password(pass1) !== true) return setField('fp-pass', false, V.password(pass1));
    if (pwdStrength(pass1) < 2) return setField('fp-pass', false, 'Слишком слабый пароль');
    if (pass1 !== pass2) return setField('fp-pass2', false, 'Пароли не совпадают');

    setUserPassword(userId, pass1);
    const u = getUser(userId);
    logSecurity('password_reset', { login: u ? u.login : null });
    resetLoginAttempt(u ? u.login : '');
    closeModal();
    toast('Пароль успешно изменён. Войдите с новым паролем.', 'ok');
    openLogin();
    return;
  }

  /* Смена пароля в ЛК */
  if (form.id === 'changePwdForm') {
    const u = currentUser();
    if (!u) return;
    const oldP = $('#cpOld').value;
    const newP = $('#cpNew').value;
    const newP2= $('#cpNew2').value;
    setField('cp-old', true); setField('cp-new', true); setField('cp-new2', true);

    if (u.password !== hashPwd(oldP))
      return setField('cp-old', false, 'Неверный текущий пароль');
    if (V.password(newP) !== true) return setField('cp-new', false, V.password(newP));
    if (pwdStrength(newP) < 2) return setField('cp-new', false, 'Слишком слабый пароль');
    if (newP !== newP2) return setField('cp-new2', false, 'Пароли не совпадают');

    setUserPassword(u.id, newP);
    logSecurity('password_change', { login: u.login });
    closeModal();
    toast('Пароль успешно изменён.', 'ok');
    return;
  }
  /* Отзыв */
  if (form.id === 'reviewForm') {
    const bid = +form.dataset.booking;
    const rating = $('#vRating').value;
    const text = $('#vText').value.trim();
    setField('fv-rating', true); setField('fv-text', true);

    let ok = true;
    if (V.rating(rating) !== true) { setField('fv-rating', false, V.rating(rating)); ok = false; }
    if (V.text(text) !== true)     { setField('fv-text',   false, V.text(text));     ok = false; }
    if (!ok) return;

    const b = getBooking(bid);
    if (!b) return;
    if (b.status !== 'Завершено') return toast('Отзыв только к завершённому мероприятию', 'err');
    if (getReviewByBooking(bid)) return toast('К этой заявке уже есть отзыв', 'err');

    createReview({ booking_id: bid, text, rating: +rating });
    saveDB();
    closeModal(); renderAll();
    toast('Спасибо! Отзыв опубликован.', 'ok');
    return;
  }

  /* Помещение */
  if (form.id === 'roomForm') {
    const name = $('#mName').value.trim();
    const cap  = $('#mCap').value;
    setField('fm-name', true); setField('fm-capacity', true);

    let ok = true;
    if (V.name(name) !== true)    { setField('fm-name',     false, V.name(name));    ok = false; }
    if (V.capacity(cap) !== true) { setField('fm-capacity', false, V.capacity(cap)); ok = false; }
    if (!ok) return;

    const editId = form.dataset.id ? +form.dataset.id : null;
    const dup = db.rooms.find(r => r.name.toLowerCase() === name.toLowerCase() && r.id !== editId);
    if (dup) return setField('fm-name', false, 'Помещение с таким названием уже есть');

    if (editId) {
      const r = getRoom(editId);
      r.name = name; r.capacity = +cap;
      toast('Помещение обновлено', 'ok');
    } else {
      createRoom({ name, capacity: +cap });
      toast('Помещение добавлено', 'ok');
    }
    saveDB(); closeModal(); renderAll();
    return;
      /* Оборудование */
  if (form.id === 'equipmentForm') {
    const name = $('#eName').value.trim();
    const qty  = $('#eQty').value;
    const desc = $('#eDesc').value.trim();
    setField('fe-name', true); setField('fe-qty', true);

    let ok = true;
    if (name.length < 2) { setField('fe-name', false, 'Название — не менее 2 символов'); ok = false; }
    if (!Number.isInteger(+qty) || +qty <= 0) { setField('fe-qty', false, 'Целое положительное число'); ok = false; }
    if (!ok) return;

    const editId = form.dataset.id ? +form.dataset.id : null;
    const dup = db.equipment.find(x => x.name.toLowerCase() === name.toLowerCase() && x.id !== editId);
    if (dup) return setField('fe-name', false, 'Оборудование с таким названием уже есть');

    if (editId) {
      const e = getEquipment(editId);
      e.name = name; e.total_quantity = +qty; e.description = desc;
      toast('Оборудование обновлено', 'ok');
    } else {
      createEquipment({ name, total_quantity: +qty, description: desc });
      toast('Оборудование добавлено', 'ok');
    }
    saveDB(); closeModal(); renderAll();
    return;
  }
  }

  /* Бронирование */
    if (form.id === 'bookingForm') {
    const u = currentUser();
    if (!u) return toast('Требуется авторизация', 'err');

    const roomName = $('#bRoomName').value.trim();
    const dateStr  = $('#bDate').value.trim();
    const pay      = $('#bPay').value;

    setField('f-room', true); setField('f-dt', true); setField('f-pay', true);

    if (V.roomName(roomName) !== true) return setField('f-room', false, V.roomName(roomName));
    const room = findRoomByName(roomName);
    if (!room) return setField('f-room', false, 'Помещение не найдено. Проверьте список.');
    if (V.dateText(dateStr) !== true) return setField('f-dt', false, V.dateText(dateStr));

    const d = parseDateInput(dateStr);
    if (d <= new Date()) return setField('f-dt', false, 'Дата должна быть в будущем');
    const isoDT = d.toISOString();

    const conflict = db.bookings.find(b =>
      b.room_id === room.id && b.start_datetime === isoDT && b.status !== 'Завершено');
    if (conflict) return setField('f-dt', false, `Помещение занято (заявка №${conflict.id})`);

    if (!['offline', 'sbr'].includes(pay)) return setField('f-pay', false, 'Недопустимый способ оплаты');

    /* Проверка оборудования до создания заявки */
    const eqErrors = [];
    pendingEquipment.forEach(p => {
      const avail = equipmentAvailable(p.equipment_id, isoDT, null);
      if (p.quantity > avail) {
        const eq = getEquipment(p.equipment_id);
        eqErrors.push(eq ? eq.name : ('#' + p.equipment_id));
      }
    });
    if (eqErrors.length) {
      return toast('Оборудование уже занято: ' + eqErrors.join(', '), 'err');
    }

    const booking = createBooking({
      user_id: u.id, room_id: room.id, start_datetime: isoDT,
      payment_method: pay, status: 'Новая', created_at: nowISO()
    });

    if (pendingEquipment.length) {
      pendingEquipment.forEach(p => {
        createBookingEquipment({
          booking_id: booking.id,
          equipment_id: p.equipment_id,
          quantity: p.quantity,
          status: 'запрошено'
        });
      });
      pendingEquipment = [];
    }

    saveDB();
    toast('Заявка отправлена на рассмотрение администратору', 'ok');
    go('my');
    return;
  }
});

function setField(id, valid, msg) {
  const f = document.getElementById(id);
  if (!f) return;
  f.classList.toggle('invalid', !valid);
  const err = f.querySelector('.err');
  if (err && msg) err.textContent = msg;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
function updatePwdMeter(pwd, inputId) {
  const map = { rPass: ['rPassBar', 'rPassHint'], pPass: ['pPassBar', 'pPassHint'], cpNew: ['cpBar', 'cpHint'] };
  const [barId, hintId] = map[inputId] || [];
  const bar = document.getElementById(barId);
  const hint = document.getElementById(hintId);
  if (!bar || !hint) return;
  const info = pwdStrengthInfo(pwd);
  bar.style.width = info.width + '%';
  bar.style.background = info.color;
  hint.textContent = 'Надёжность пароля: ' + info.label;
}
/* ============================================================================
   АВТОЛОГАУТ ПО БЕЗДЕЙСТВИЮ
   ============================================================================ */
const IDLE_LIMIT_MS = 15 * 60 * 1000;
let _idleTimer = null;

function startIdleWatch() {
  stopIdleWatch();
  if (!session) return;
  _idleTimer = setTimeout(() => {
    const u = currentUser();
    if (u) logSecurity('idle_logout', { login: u.login });
    session = null;
    localStorage.removeItem(LS_SES);
    ADMIN_ONLY_PAGES_RESET();
    toast('Сессия истекла из-за неактивности', 'err');
    go('home');
  }, IDLE_LIMIT_MS);
}

function stopIdleWatch() {
  if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
}

function touchIdle() { if (session) startIdleWatch(); }

['click','keydown','mousemove','touchstart','scroll'].forEach(evt => {
  document.addEventListener(evt, touchIdle, { passive: true });
});
document.addEventListener('change', e => {
  if (e.target.id !== 'importFile') return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data.users) || !Array.isArray(data.bookings)) {
        toast('Неверный формат: нет users или bookings', 'err');
        return;
      }
      const required = ['users', 'rooms', 'bookings', 'reviews'];
      for (const k of required) {
        if (!Array.isArray(data[k])) {
          toast('Неверный формат: пропущено поле ' + k, 'err');
          return;
        }
      }
      if (!confirm('Текущие данные будут перезаписаны. Продолжить?')) return;

      db.users             = data.users;
      db.rooms             = data.rooms;
      db.bookings          = data.bookings;
      db.reviews           = data.reviews;
      db.emails            = Array.isArray(data.emails) ? data.emails : [];
      db.equipment         = Array.isArray(data.equipment) ? data.equipment : [];
      db.bookingEquipment  = Array.isArray(data.bookingEquipment) ? data.bookingEquipment : [];
      db.checkins          = Array.isArray(data.checkins) ? data.checkins : [];
      db.securityLog       = Array.isArray(data.securityLog) ? data.securityLog : [];
      db.securityQuestions = Array.isArray(data.securityQuestions) ? data.securityQuestions : [];
      db.loginAttempts     = Array.isArray(data.loginAttempts) ? data.loginAttempts : [];
      db.seq = data.seq || { users: 0, rooms: 0, bookings: 0, reviews: 0, emails: 0, equipment: 0, bookingEquipment: 0, checkins: 0, securityLog: 0, securityQuestions: 0 };

      saveDB();
      session = null;
      localStorage.removeItem(LS_SES);
      ADMIN_ONLY_PAGES_RESET();
      toast('Данные импортированы', 'ok');
      go('home');
    } catch (err) {
      toast('Ошибка чтения файла: ' + err.message, 'err');
    }
  };
  reader.readAsText(file);
});