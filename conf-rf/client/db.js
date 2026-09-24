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