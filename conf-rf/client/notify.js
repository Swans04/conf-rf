/* ============================================================================
   УВЕДОМЛЕНИЯ ЧЕРЕЗ EMAILJS + локальный ящик «Сообщения».
   ============================================================================ */

const EMAILJS_SERVICE_ID  = 'service_quq4gty';
const EMAILJS_TEMPLATE_ID = 'template_fhkn1t8';
const EMAILJS_PUBLIC_KEY  = 'bGWp0g_YoUhHk7EyC';

if (typeof emailjs !== 'undefined') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
} else {
  console.warn('EmailJS SDK не загружен — проверьте <script> в index.html');
}

/* --- Отправка письма + создание локальной копии в db.emails --- */
async function sendStatusEmail(booking, oldStatus, newStatus) {
  const user = getUser(booking.user_id);
  const room = getRoom(booking.room_id);
  if (!user || !user.email) return;

  const params = {
    to_email:   user.email,
    to_name:    user.full_name,
    booking_id: booking.id,
    room_name:  room ? room.name : '—',
    start_dt:   fmtDT(booking.start_datetime),
    old_status: oldStatus,
    new_status: newStatus
  };

  /* 1. Локальная копия для раздела «Сообщения» */
  createEmail({
    user_id:    user.id,
    to:         user.email,
    subject:    `[Конференции.РФ] Заявка №${booking.id}: статус изменён на «${newStatus}»`,
    body: `<p>Здравствуйте, <b>${esc(user.full_name)}</b>!</p>
           <p>Статус вашей заявки №${booking.id} изменён с «${esc(oldStatus)}» на «<b>${esc(newStatus)}</b>».</p>
           <p>Помещение: <b>${esc(room ? room.name : '—')}</b><br>
              Начало: <b>${fmtDT(booking.start_datetime)}</b></p>`,
    booking_id: booking.id
  });
  saveDB();

  /* 2. Реальная отправка через EmailJS */
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    toast(`Письмо отправлено на ${user.email}`, 'ok');
  } catch (e) {
    console.error('EmailJS error:', e);
    toast('Письмо сохранено в «Сообщения», но EmailJS не ответил', 'err');
  }
}

/* --- Просмотр письма из локального ящика --- */
function openEmail(id) {
  const e = getEmail(id);
  if (!e) return;
  e.read = true;
  saveDB();

  openModal(`
    <button class="close" data-action="close-modal">×</button>
    <h3>${esc(e.subject)}</h3>
    <div class="small muted" style="margin-bottom:10px">
      Кому: ${esc(e.to)}<br>
      Отправлено: ${fmtDT(e.created_at)}
    </div>
    <div style="background:#fafcff;border:1px solid var(--line);border-radius:10px;padding:14px;font-size:14px">
      ${e.body}
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:14px">
      <button class="btn btn-primary" data-action="close-modal">Закрыть</button>
    </div>
  `);
}