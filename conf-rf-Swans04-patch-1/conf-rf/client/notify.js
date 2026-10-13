/* ============================================================================
   УВЕДОМЛЕНИЯ. Локальный ящик «Сообщения» без внешних сервисов.
   ============================================================================ */

async function sendStatusEmail(booking, oldStatus, newStatus) {
  const user = getUser(booking.user_id);
  const room = getRoom(booking.room_id);
  if (!user || !user.email) return;

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
  toast('Уведомление отправлено в «Сообщения»', 'ok');
}

function openEmail(id) {
  const e = getEmail(id);
  if (!e) return;
  e.read = true;
  saveDB();

  openModal(`
    <button class="close" data-action="close-modal" aria-label="Закрыть">×</button>
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