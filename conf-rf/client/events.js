document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'nav':            go(el.dataset.page); break;
    case 'open-login':     closeModal(); openLogin(); break;
    case 'open-register':  closeModal(); openRegister(); break;
    case 'close-modal':    closeModal(); break;
    case 'close-modal-bg': if (e.target === el) closeModal(); break;

    case 'logout': {
      session = null;
      localStorage.removeItem(LS_SES);
      ADMIN_ONLY_PAGES_RESET();
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
    const login = $('#lLogin').value.trim();
    const pass  = $('#lPass').value;
    setField('fl-login', true); setField('fl-pass', true);
    if (!login) return setField('fl-login', false, 'Введите логин');
    if (!pass)  return setField('fl-pass',  false, 'Введите пароль');

    const u = db.users.find(x => x.login.toLowerCase() === login.toLowerCase());
    if (!u) return setField('fl-login', false, 'Пользователь с таким логином не найден');
    if (u.password !== hashPwd(pass)) return setField('fl-pass', false, 'Неверный пароль');

    session = u.id;
    localStorage.setItem(LS_SES, String(u.id));
    closeModal();
    if (u.is_admin && typeof loadAdminScript === 'function') loadAdminScript();
    renderNav(); renderAll();
    toast(`Добро пожаловать, ${u.full_name.split(' ')[1] || u.login}!`, 'ok');
    return;
  }

  /* Регистрация */
  if (form.id === 'registerForm') {
    const data = {
      login:     $('#rLogin').value.trim(),
      password:  $('#rPass').value,
      full_name: $('#rName').value.trim(),
      phone:     $('#rPhone').value.trim(),
      email:     $('#rEmail').value.trim()
    };
    ['login','password','full_name','phone','email'].forEach(k => setField('fr-' + k, true));

    let ok = true;
    for (const k of ['login','password','full_name','phone','email']) {
      const res = V[k](data[k]);
      if (res !== true) { setField('fr-' + k, false, res); ok = false; }
    }
    if (!ok) return;
    if (db.users.some(u => u.login.toLowerCase() === data.login.toLowerCase()))
      return setField('fr-login', false, 'Такой логин уже занят');
    if (db.users.some(u => u.email.toLowerCase() === data.email.toLowerCase()))
      return setField('fr-email', false, 'Такой e-mail уже зарегистрирован');

    const u = createUser({ ...data, is_admin: false });
    saveDB();
    session = u.id;
    localStorage.setItem(LS_SES, String(u.id));
    closeModal();
    renderNav(); renderAll();
    toast('Пользователь создан. Добро пожаловать!', 'ok');
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

    createBooking({
      user_id: u.id, room_id: room.id, start_datetime: isoDT,
      payment_method: pay, status: 'Новая', created_at: nowISO()
    });
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