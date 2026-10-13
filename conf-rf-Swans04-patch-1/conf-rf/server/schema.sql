-- ============================================================================
-- Схема данных «Конференции.РФ».
-- Аналог схемы данных в Microsoft Access.
-- Синтаксис приближен к Access DDL, но читается как обычный SQL.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Пользователи
-- ----------------------------------------------------------------------------
CREATE TABLE "User" (
    id         COUNTER      PRIMARY KEY,              -- Счётчик (AutoNumber)
    login      TEXT(80)     NOT NULL UNIQUE,          -- Уникальный логин
    password   TEXT(200)    NOT NULL,                 -- Хеш пароля
    full_name  TEXT(100)    NOT NULL,                 -- ФИО
    phone      TEXT(20)     NOT NULL,                 -- 8(XXX)XXX-XX-XX
    email      TEXT(120)    NOT NULL UNIQUE,          -- Уникальный e-mail
    is_admin   YESNO        NOT NULL DEFAULT NO       -- Логический
);


-- ----------------------------------------------------------------------------
-- 2. Помещения
-- ----------------------------------------------------------------------------
CREATE TABLE "Room" (
    id         COUNTER      PRIMARY KEY,
    name       TEXT(100)    NOT NULL UNIQUE,          -- Уникальное название
    capacity   INTEGER      NOT NULL                  -- Вместимость, человек
);


-- ----------------------------------------------------------------------------
-- 3. Заявки
-- ----------------------------------------------------------------------------
CREATE TABLE "Booking" (
    id              COUNTER  PRIMARY KEY,
    user_id         INTEGER  NOT NULL,                -- FK → User.id
    room_id         INTEGER  NOT NULL,                -- FK → Room.id
    start_datetime  DATETIME NOT NULL,                -- Дата и время начала
    payment_method  TEXT(20) NOT NULL,                -- 'offline' | 'sbr'
    status          TEXT(20) NOT NULL,                -- 'Новая' | 'Мероприятие назначено' | 'Завершено'
    created_at      DATETIME NOT NULL,                -- Дата создания заявки

    FOREIGN KEY (user_id) REFERENCES "User"(id),
    FOREIGN KEY (room_id) REFERENCES "Room"(id)
);


-- ----------------------------------------------------------------------------
-- 4. Отзывы
-- ----------------------------------------------------------------------------
CREATE TABLE "Review" (
    id          COUNTER   PRIMARY KEY,
    booking_id  INTEGER   NOT NULL UNIQUE,            -- 1:1 с Booking
    text        MEMO      NOT NULL,                   -- Длинный текст
    rating      INTEGER   NOT NULL,                   -- 1..5
    created_at  DATETIME  NOT NULL,

    FOREIGN KEY (booking_id) REFERENCES "Booking"(id)
);


-- ============================================================================
-- Связи (в терминах «Схема данных» в Access):
--   User    (1) ──────< (M) Booking   по полю Booking.user_id   → User.id
--   Room    (1) ──────< (M) Booking   по полю Booking.room_id   → Room.id
--   Booking (1) ─────── (1) Review    по полю Review.booking_id → Booking.id
-- ============================================================================


-- ============================================================================
-- Индексы (уникальность задана в определении таблиц через UNIQUE,
-- дополнительно имеет смысл составной индекс для Booking):
-- ============================================================================
CREATE INDEX idx_booking_room_time
    ON "Booking" (room_id, start_datetime);