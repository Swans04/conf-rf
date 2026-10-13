function seed() {
  db = {
    users: [], rooms: [], bookings: [], reviews: [], emails: [],
    equipment: [], bookingEquipment: [], checkins: [],
    loginAttempts: [], securityLog: [], securityQuestions: [],
    seq: {
      users: 0, rooms: 0, bookings: 0, reviews: 0, emails: 0,
      equipment: 0, bookingEquipment: 0, checkins: 0,
      securityLog: 0, securityQuestions: 0
    }
  };

  const r1 = createRoom({ name: 'Аудитория 101',            capacity: 120 });
  const r2 = createRoom({ name: 'Аудитория 202',            capacity: 60  });
  const r3 = createRoom({ name: 'Коворкинг «Точка кипения»', capacity: 80 });
  const r4 = createRoom({ name: 'Кинозал «Октябрь»',        capacity: 200 });
  const r5 = createRoom({ name: 'Конференц-зал «Кремль»',   capacity: 300 });
  const r6 = createRoom({ name: 'Переговорная «Байкал»',    capacity: 12  });

  const admin = createUser({
    login: 'Conf2027', password: 'Demo77',
    full_name: 'Администратор Портала',
    phone: '8(495)000-00-01', email: 'admin@conf.rf',
    is_admin: true
  });
  const u2 = createUser({
    login: 'petrov01', password: 'petrov123',
    full_name: 'Петров Пётр Петрович',
    phone: '8(812)222-33-44', email: 'petrov@conf.rf',
    is_admin: false
  });
  const u3 = createUser({
    login: 'smirnova', password: 'smirnova1',
    full_name: 'Смирнова Анна Сергеевна',
    phone: '8(903)555-11-22', email: 'smirnova@conf.rf',
    is_admin: false
  });

  const b1 = createBooking({ user_id: u2.id, room_id: r5.id,
    start_datetime: isoShift(4, 10, 0), payment_method: 'sbr', status: 'Новая',
    created_at: new Date(Date.now() - 86400000).toISOString() });

  const b2 = createBooking({ user_id: u2.id, room_id: r1.id,
    start_datetime: isoShift(-12, 12, 0), payment_method: 'offline', status: 'Завершено',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString() });

  const b3 = createBooking({ user_id: u3.id, room_id: r6.id,
    start_datetime: isoShift(7, 15, 30), payment_method: 'offline', status: 'Мероприятие назначено',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString() });

  const b4 = createBooking({ user_id: admin.id, room_id: r4.id,
    start_datetime: isoShift(-25, 9, 0), payment_method: 'sbr', status: 'Завершено',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString() });

  const b5 = createBooking({ user_id: u3.id, room_id: r2.id,
    start_datetime: isoShift(2, 14, 0), payment_method: 'sbr', status: 'Новая',
    created_at: new Date(Date.now() - 3600000).toISOString() });

  createReview({ booking_id: b2.id, rating: 5,
    text: 'Отличная аудитория, хорошая акустика и проектор. Персонал помог с настройкой оборудования.',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString() });

  createReview({ booking_id: b4.id, rating: 4,
    text: 'Большой кинозал, всем хватило мест. Единственное — не хватало указателей на входе.',
    created_at: new Date(Date.now() - 22 * 86400000).toISOString() });

  /* Демо-письмо */
  createEmail({
    user_id: u2.id, to: u2.email,
    subject: '[Конференции.РФ] Заявка №1 принята',
    body: '<p>Ваша заявка №1 на «Конференц-зал «Кремль»» принята.</p>',
    booking_id: b1.id
  });
  /* Контрольные вопросы */
  setSecurityQuestion(admin.id, 'Девичья фамилия матери?', 'портнова');
  setSecurityQuestion(u2.id,    'Кличка первого питомца?',  'мурзик');
  setSecurityQuestion(u3.id,    'Город, в котором вы родились?', 'казань');
    /* Демо-оборудование */
  const e1 = createEquipment({ name: 'Проектор Epson',    total_quantity: 3, description: 'Full HD, HDMI' });
  const e2 = createEquipment({ name: 'Микрофон Shure',    total_quantity: 6, description: 'Беспроводной ручной' });
  const e3 = createEquipment({ name: 'Трибуна',           total_quantity: 1, description: 'С регулировкой высоты' });
  const e4 = createEquipment({ name: 'Флипчарт',          total_quantity: 4, description: 'Магнитный, 70x100' });
  const e5 = createEquipment({ name: 'Ноутбук Lenovo',    total_quantity: 5, description: 'Для презентаций' });

  createBookingEquipment({ booking_id: b1.id, equipment_id: e1.id, quantity: 1, status: 'запрошено' });
  createBookingEquipment({ booking_id: b1.id, equipment_id: e2.id, quantity: 2, status: 'запрошено' });
  createBookingEquipment({ booking_id: b3.id, equipment_id: e3.id, quantity: 1, status: 'подтверждено' });
  createBookingEquipment({ booking_id: b2.id, equipment_id: e4.id, quantity: 1, status: 'возвращено' });
    /* Демо-чек-ины */
  createCheckIn({ booking_id: b2.id, check_in_time: new Date(Date.now() - 12*86400000).toISOString(), status: 'прошел' });
  createCheckIn({ booking_id: b4.id, check_in_time: new Date(Date.now() - 25*86400000).toISOString(), status: 'прошел' });
  createCheckIn({ booking_id: b2.id, check_in_time: new Date(Date.now() - 12*86400000 + 3600000).toISOString(), status: 'отказ' });
  createCheckIn({ booking_id: b3.id, check_in_time: new Date(Date.now() - 1*86400000).toISOString(), status: 'прошел' });
  saveDB();
  return db;
}