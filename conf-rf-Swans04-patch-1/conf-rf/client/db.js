/* Хранилище данных в localStorage. */

const LS_DB  = 'conf_rf_db_v3';
const LS_SES = 'conf_rf_session_v3';

let db = null;
let session = null;

const STATUSES = ['Новая', 'Мероприятие назначено', 'Завершено'];
const PAYMENTS = { offline: 'Очное посещение', sbr: 'Перевод по СБП' };

function saveDB() {
  localStorage.setItem(LS_DB, JSON.stringify(db));
}

/* --- INSERT --- */
function createUser(d) {
  const u = {
    id: ++db.seq.users,
    login: d.login,
    password: hashPwd(d.password),
    full_name: d.full_name,
    phone: d.phone,
    email: d.email,
    is_admin: !!d.is_admin
  };
  db.users.push(u);
  return u;
}

function createRoom(d) {
  const r = { id: ++db.seq.rooms, name: d.name, capacity: +d.capacity };
  db.rooms.push(r);
  return r;
}

function createBooking(d) {
  const b = {
    id: ++db.seq.bookings,
    user_id: +d.user_id,
    room_id: +d.room_id,
    start_datetime: d.start_datetime,
    payment_method: d.payment_method,
    status: d.status || 'Новая',
    created_at: d.created_at || nowISO()
  };
  db.bookings.push(b);
  return b;
}

function createReview(d) {
  const r = {
    id: ++db.seq.reviews,
    booking_id: +d.booking_id,
    text: d.text,
    rating: +d.rating,
    created_at: d.created_at || nowISO()
  };
  db.reviews.push(r);
  return r;
}

function createEmail(d) {
  const e = {
    id: ++db.seq.emails,
    user_id: +d.user_id,
    to: d.to,
    subject: d.subject,
    body: d.body,
    booking_id: d.booking_id ? +d.booking_id : null,
    created_at: d.created_at || nowISO(),
    read: false
  };
  db.emails.push(e);
  return e;
}

/* --- SELECT --- */
const getUser  = id => db.users.find(u => u.id === +id) || null;
const getRoom  = id => db.rooms.find(r => r.id === +id) || null;
const getBooking = id => db.bookings.find(b => b.id === +id) || null;
const getReviewByBooking = id =>
  db.reviews.find(r => r.booking_id === +id) || null;

const getEmail = id => {
  if (!Array.isArray(db.emails)) return null;
  return db.emails.find(e => e.id === +id) || null;
};

const findRoomByName = name => {
  const n = String(name || '').trim().toLowerCase();
  return db.rooms.find(r => r.name.toLowerCase() === n) || null;
};

const findUserByEmail = email => {
  const e = String(email || '').trim().toLowerCase();
  return db.users.find(u => u.email.toLowerCase() === e) || null;
};

const currentUser = () => (session ? getUser(session) : null);

/* --- Сообщения --- */
function unreadEmailsCount() {
  const u = currentUser();
  if (!u || !db || !Array.isArray(db.emails)) return 0;
  return db.emails.filter(e => e.user_id === u.id && !e.read).length;
}

function markAllEmailsRead() {
  const u = currentUser();
  if (!u || !Array.isArray(db.emails)) return;
  db.emails.filter(e => e.user_id === u.id).forEach(e => { e.read = true; });
}

function setUserPassword(userId, newPlainPassword) {
  const u = getUser(userId);
  if (!u) return false;
  u.password = hashPwd(newPlainPassword);
  saveDB();
  return true;
}
  /* ============================================================================
   БЕЗОПАСНОСТЬ: попытки входа, журнал, контрольные вопросы
   ============================================================================ */

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_MINUTES      = 5;

function getLoginAttempt(login) {
  if (!Array.isArray(db.loginAttempts)) db.loginAttempts = [];
  const key = String(login || '').toLowerCase();
  return db.loginAttempts.find(a => a.login === key) || null;
}

function incLoginAttempt(login) {
  if (!Array.isArray(db.loginAttempts)) db.loginAttempts = [];
  const key = String(login || '').toLowerCase();
  let a = db.loginAttempts.find(x => x.login === key);
  if (!a) { a = { login: key, attempts: 0, blocked_until: null }; db.loginAttempts.push(a); }
  a.attempts++;
  if (a.attempts >= MAX_LOGIN_ATTEMPTS) {
    a.blocked_until = Date.now() + BLOCK_MINUTES * 60 * 1000;
  }
  saveDB();
  return a;
}

function resetLoginAttempt(login) {
  if (!Array.isArray(db.loginAttempts)) return;
  const key = String(login || '').toLowerCase();
  db.loginAttempts = db.loginAttempts.filter(a => a.login !== key);
  saveDB();
}

function isLoginBlocked(login) {
  const a = getLoginAttempt(login);
  if (!a || !a.blocked_until) return null;
  if (Date.now() > a.blocked_until) { resetLoginAttempt(login); return null; }
  return a;
}

function logSecurity(event, details) {
  if (!Array.isArray(db.securityLog)) db.securityLog = [];
  if (!db.seq.securityLog) db.seq.securityLog = 0;
  const u = currentUser();
  db.securityLog.push({
    id: ++db.seq.securityLog,
    user_id: u ? u.id : null,
    login: (details && details.login) || (u ? u.login : null),
    event,
    details: details || {},
    created_at: nowISO()
  });
  if (db.securityLog.length > 500) db.securityLog = db.securityLog.slice(-500);
  saveDB();
}

function setSecurityQuestion(userId, question, answer) {
  if (!Array.isArray(db.securityQuestions)) db.securityQuestions = [];
  if (!db.seq.securityQuestions) db.seq.securityQuestions = 0;
  db.securityQuestions = db.securityQuestions.filter(q => q.user_id !== +userId);
  db.securityQuestions.push({
    id: ++db.seq.securityQuestions,
    user_id: +userId,
    question,
    answer_hash: hashPwd(answer.trim().toLowerCase())
  });
  saveDB();
}

function getSecurityQuestion(userId) {
  if (!Array.isArray(db.securityQuestions)) return null;
  return db.securityQuestions.find(q => q.user_id === +userId) || null;
}

function checkSecurityAnswer(userId, answer) {
  const q = getSecurityQuestion(userId);
  if (!q) return false;
  return q.answer_hash === hashPwd(String(answer || '').trim().toLowerCase());
}
/* ============================================================================
   ОБОРУДОВАНИЕ (Equipment + BookingEquipment)
   ============================================================================ */

const EQUIPMENT_STATUSES = ['запрошено', 'подтверждено', 'выдано', 'возвращено'];

function createEquipment(d) {
  const e = {
    id: ++db.seq.equipment,
    name: d.name,
    total_quantity: +d.total_quantity,
    description: d.description || ''
  };
  db.equipment.push(e);
  return e;
}

const getEquipment = id => db.equipment.find(e => e.id === +id) || null;
const findEquipmentByName = name => {
  const n = String(name || '').trim().toLowerCase();
  return db.equipment.find(e => e.name.toLowerCase() === n) || null;
};

function createBookingEquipment(d) {
  const be = {
    id: ++db.seq.bookingEquipment,
    booking_id:   +d.booking_id,
    equipment_id: +d.equipment_id,
    quantity:     +d.quantity,
    status:       d.status || 'запрошено'
  };
  db.bookingEquipment.push(be);
  return be;
}

const getBookingEquipment = id =>
  db.bookingEquipment.find(x => x.id === +id) || null;

const getEquipmentForBooking = bookingId =>
  db.bookingEquipment.filter(x => x.booking_id === +bookingId);

const getBookingsForEquipment = equipmentId =>
  db.bookingEquipment.filter(x => x.equipment_id === +equipmentId);

function equipmentBookedAtTime(equipmentId, isoDateTime, excludeBookingId) {
  return db.bookingEquipment
    .filter(be => be.equipment_id === +equipmentId)
    .filter(be => be.status !== 'возвращено')
    .filter(be => be.booking_id !== +excludeBookingId)
    .filter(be => {
      const b = getBooking(be.booking_id);
      return b && b.start_datetime === isoDateTime;
    })
    .reduce((s, be) => s + be.quantity, 0);
}

function equipmentAvailable(equipmentId, isoDateTime, excludeBookingId) {
  const eq = getEquipment(equipmentId);
  if (!eq) return 0;
  return Math.max(0, eq.total_quantity - equipmentBookedAtTime(equipmentId, isoDateTime, excludeBookingId));
}

function equipmentAvailableNow(equipmentId) {
  const today = new Date().toDateString();
  const busy = db.bookingEquipment
    .filter(be => be.equipment_id === +equipmentId)
    .filter(be => be.status !== 'возвращено')
    .filter(be => {
      const b = getBooking(be.booking_id);
      if (!b) return false;
      const d = new Date(b.start_datetime);
      return d.toDateString() === today;
    })
    .reduce((s, be) => s + be.quantity, 0);
  const eq = getEquipment(equipmentId);
  return eq ? Math.max(0, eq.total_quantity - busy) : 0;
}
/* ============================================================================
   ЧЕК-ИНЫ (журнал сканирований пропусков)
   ============================================================================ */

const CHECKIN_STATUSES = ['ожидает', 'прошел', 'отказ'];

function createCheckIn(d) {
  const c = {
    id: ++db.seq.checkins,
    booking_id: +d.booking_id,
    check_in_time: d.check_in_time || nowISO(),
    status: d.status || 'ожидает'
  };
  db.checkins.push(c);
  return c;
}

const getCheckIn = id => db.checkins.find(c => c.id === +id) || null;
const getCheckInsForBooking = bookingId =>
  db.checkins.filter(c => c.booking_id === +bookingId);

const getLastCheckInForBooking = bookingId => {
  const list = getCheckInsForBooking(bookingId);
  return list.length ? list[list.length - 1] : null;
};

function getCheckInsInRange(fromMs, toMs) {
  return db.checkins.filter(c => {
    const t = new Date(c.check_in_time).getTime();
    return t >= fromMs && t <= toMs;
  });
}

function ticketStatusForBooking(bookingId) {
  const last = getLastCheckInForBooking(bookingId);
  return last ? last.status : 'ожидает';
}

function ticketCode(bookingId) {
  return 'CONF-RF-BOOKING-' + bookingId;
}