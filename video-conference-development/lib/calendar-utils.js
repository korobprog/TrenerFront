import moment from 'moment';
import 'moment/locale/ru';

// Настройка локализации
moment.locale('ru');

/**
 * Утилиты для работы с календарными событиями
 */

/**
 * Валидация данных календарного события
 * @param {Object} eventData - Данные события
 * @returns {Object} - Результат валидации
 */
export function validateEventData(eventData) {
  const errors = [];
  const warnings = [];

  // Проверка обязательных полей
  if (!eventData.title || eventData.title.trim().length === 0) {
    errors.push('Название события обязательно');
  }

  if (!eventData.startTime) {
    errors.push('Время начала события обязательно');
  }

  if (!eventData.endTime) {
    errors.push('Время окончания события обязательно');
  }

  // Проверка корректности времени
  if (eventData.startTime && eventData.endTime) {
    const startTime = new Date(eventData.startTime);
    const endTime = new Date(eventData.endTime);

    if (isNaN(startTime.getTime())) {
      errors.push('Некорректное время начала события');
    }

    if (isNaN(endTime.getTime())) {
      errors.push('Некорректное время окончания события');
    }

    if (startTime >= endTime) {
      errors.push('Время начала должно быть раньше времени окончания');
    }

    // Проверка на прошедшее время
    const now = new Date();
    if (startTime < now) {
      warnings.push('Событие запланировано на прошедшее время');
    }

    // Проверка продолжительности
    const duration = endTime - startTime;
    const maxDuration = 24 * 60 * 60 * 1000; // 24 часа
    if (duration > maxDuration) {
      warnings.push('Событие длится более 24 часов');
    }

    const minDuration = 5 * 60 * 1000; // 5 минут
    if (duration < minDuration) {
      warnings.push('Событие длится менее 5 минут');
    }
  }

  // Проверка типа события
  const validEventTypes = ['meeting', 'interview', 'training'];
  if (eventData.eventType && !validEventTypes.includes(eventData.eventType)) {
    errors.push('Некорректный тип события');
  }

  // Проверка участников
  if (eventData.attendeeIds && !Array.isArray(eventData.attendeeIds)) {
    errors.push('Список участников должен быть массивом');
  }

  // Проверка напоминания
  if (eventData.reminderMinutes !== undefined) {
    const reminder = parseInt(eventData.reminderMinutes);
    if (isNaN(reminder) || reminder < 0 || reminder > 10080) {
      // максимум неделя
      errors.push('Время напоминания должно быть от 0 до 10080 минут');
    }
  }

  // Проверка правила повторения
  if (eventData.isRecurring && !eventData.recurrenceRule) {
    errors.push(
      'Для повторяющихся событий необходимо указать правило повторения'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Форматирование даты и времени для отображения
 * @param {Date|string} date - Дата
 * @param {string} format - Формат (short, long, time, date)
 * @returns {string} - Отформатированная дата
 */
export function formatDateTime(date, format = 'long') {
  if (!date) return '';

  const momentDate = moment(date);

  switch (format) {
    case 'short':
      return momentDate.format('DD.MM.YYYY HH:mm');
    case 'long':
      return momentDate.format('DD MMMM YYYY, HH:mm');
    case 'time':
      return momentDate.format('HH:mm');
    case 'date':
      return momentDate.format('DD MMMM YYYY');
    case 'relative':
      return momentDate.fromNow();
    case 'calendar':
      return momentDate.calendar();
    default:
      return momentDate.format(format);
  }
}

/**
 * Вычисление продолжительности события
 * @param {Date|string} startTime - Время начала
 * @param {Date|string} endTime - Время окончания
 * @returns {Object} - Объект с продолжительностью
 */
export function calculateDuration(startTime, endTime) {
  const start = moment(startTime);
  const end = moment(endTime);
  const duration = moment.duration(end.diff(start));

  return {
    milliseconds: duration.asMilliseconds(),
    seconds: duration.asSeconds(),
    minutes: duration.asMinutes(),
    hours: duration.asHours(),
    days: duration.asDays(),
    humanized: duration.humanize(),
    formatted: formatDuration(duration),
  };
}

/**
 * Форматирование продолжительности
 * @param {moment.Duration} duration - Продолжительность
 * @returns {string} - Отформатированная продолжительность
 */
function formatDuration(duration) {
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else {
    return `${minutes}м`;
  }
}

/**
 * Проверка пересечения событий по времени
 * @param {Object} event1 - Первое событие
 * @param {Object} event2 - Второе событие
 * @returns {boolean} - true если события пересекаются
 */
export function eventsOverlap(event1, event2) {
  const start1 = moment(event1.startTime);
  const end1 = moment(event1.endTime);
  const start2 = moment(event2.startTime);
  const end2 = moment(event2.endTime);

  return start1.isBefore(end2) && start2.isBefore(end1);
}

/**
 * Поиск конфликтующих событий
 * @param {Object} newEvent - Новое событие
 * @param {Array} existingEvents - Существующие события
 * @returns {Array} - Массив конфликтующих событий
 */
export function findConflictingEvents(newEvent, existingEvents) {
  return existingEvents.filter((event) => {
    // Исключаем само событие при редактировании
    if (event.id === newEvent.id) return false;

    // Исключаем отмененные события
    if (event.status === 'cancelled') return false;

    return eventsOverlap(newEvent, event);
  });
}

/**
 * Генерация временных слотов для дня
 * @param {Date} date - Дата
 * @param {number} intervalMinutes - Интервал в минутах
 * @param {number} startHour - Час начала (по умолчанию 8)
 * @param {number} endHour - Час окончания (по умолчанию 22)
 * @returns {Array} - Массив временных слотов
 */
export function generateTimeSlots(
  date,
  intervalMinutes = 30,
  startHour = 8,
  endHour = 22
) {
  const slots = [];
  const startTime = moment(date).hour(startHour).minute(0).second(0);
  const endTime = moment(date).hour(endHour).minute(0).second(0);

  let currentTime = startTime.clone();

  while (currentTime.isBefore(endTime)) {
    const slotEnd = currentTime.clone().add(intervalMinutes, 'minutes');

    slots.push({
      start: currentTime.toDate(),
      end: slotEnd.toDate(),
      startFormatted: currentTime.format('HH:mm'),
      endFormatted: slotEnd.format('HH:mm'),
      label: `${currentTime.format('HH:mm')} - ${slotEnd.format('HH:mm')}`,
    });

    currentTime.add(intervalMinutes, 'minutes');
  }

  return slots;
}

/**
 * Проверка доступности временного слота
 * @param {Object} slot - Временной слот
 * @param {Array} events - Существующие события
 * @param {string} videoRoomId - ID видеокомнаты (опционально)
 * @returns {boolean} - true если слот доступен
 */
export function isSlotAvailable(slot, events, videoRoomId = null) {
  const slotEvent = {
    startTime: slot.start,
    endTime: slot.end,
    videoRoomId,
  };

  const conflicts = findConflictingEvents(slotEvent, events);

  // Если указана видеокомната, проверяем только конфликты для этой комнаты
  if (videoRoomId) {
    return (
      conflicts.filter((event) => event.videoRoomId === videoRoomId).length ===
      0
    );
  }

  return conflicts.length === 0;
}

/**
 * Получение свободных слотов на день
 * @param {Date} date - Дата
 * @param {Array} events - Существующие события
 * @param {Object} options - Опции
 * @returns {Array} - Массив свободных слотов
 */
export function getAvailableSlots(date, events, options = {}) {
  const {
    intervalMinutes = 30,
    startHour = 8,
    endHour = 22,
    videoRoomId = null,
    minDurationMinutes = 30,
  } = options;

  const allSlots = generateTimeSlots(date, intervalMinutes, startHour, endHour);

  return allSlots.filter((slot) => {
    // Проверяем минимальную продолжительность
    const duration = moment(slot.end).diff(moment(slot.start), 'minutes');
    if (duration < minDurationMinutes) return false;

    return isSlotAvailable(slot, events, videoRoomId);
  });
}

/**
 * Парсинг правила повторения (RRULE)
 * @param {string} rrule - Правило повторения
 * @returns {Object} - Распарсенное правило
 */
export function parseRecurrenceRule(rrule) {
  if (!rrule) return null;

  const parts = rrule.split(';');
  const rule = {};

  parts.forEach((part) => {
    const [key, value] = part.split('=');
    rule[key] = value;
  });

  return rule;
}

/**
 * Генерация повторяющихся событий
 * @param {Object} baseEvent - Базовое событие
 * @param {number} count - Количество повторений
 * @returns {Array} - Массив повторяющихся событий
 */
export function generateRecurringEvents(baseEvent, count = 10) {
  if (!baseEvent.isRecurring || !baseEvent.recurrenceRule) {
    return [baseEvent];
  }

  const rule = parseRecurrenceRule(baseEvent.recurrenceRule);
  const events = [baseEvent];

  if (!rule.FREQ) return events;

  const startTime = moment(baseEvent.startTime);
  const endTime = moment(baseEvent.endTime);
  const duration = endTime.diff(startTime);

  let currentStart = startTime.clone();

  for (let i = 1; i < count; i++) {
    switch (rule.FREQ) {
      case 'DAILY':
        currentStart.add(1, 'day');
        break;
      case 'WEEKLY':
        currentStart.add(1, 'week');
        break;
      case 'MONTHLY':
        currentStart.add(1, 'month');
        break;
      case 'YEARLY':
        currentStart.add(1, 'year');
        break;
      default:
        return events;
    }

    const currentEnd = currentStart.clone().add(duration, 'milliseconds');

    events.push({
      ...baseEvent,
      id: `${baseEvent.id}_${i}`,
      startTime: currentStart.toDate(),
      endTime: currentEnd.toDate(),
    });
  }

  return events;
}

/**
 * Группировка событий по дням
 * @param {Array} events - Массив событий
 * @returns {Object} - Объект с событиями, сгруппированными по дням
 */
export function groupEventsByDay(events) {
  const grouped = {};

  events.forEach((event) => {
    const dayKey = moment(event.startTime).format('YYYY-MM-DD');

    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }

    grouped[dayKey].push(event);
  });

  // Сортируем события в каждом дне по времени начала
  Object.keys(grouped).forEach((day) => {
    grouped[day].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  });

  return grouped;
}

/**
 * Получение статистики событий
 * @param {Array} events - Массив событий
 * @returns {Object} - Статистика
 */
export function getEventsStatistics(events) {
  const stats = {
    total: events.length,
    byType: {},
    byStatus: {},
    totalDuration: 0,
    averageDuration: 0,
    upcomingEvents: 0,
    pastEvents: 0,
  };

  const now = new Date();

  events.forEach((event) => {
    // Подсчет по типам
    const type = event.eventType || 'meeting';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Подсчет по статусам
    const status = event.status || 'scheduled';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Подсчет продолжительности
    const duration = calculateDuration(event.startTime, event.endTime);
    stats.totalDuration += duration.minutes;

    // Подсчет предстоящих и прошедших событий
    if (new Date(event.startTime) > now) {
      stats.upcomingEvents++;
    } else {
      stats.pastEvents++;
    }
  });

  // Вычисляем среднюю продолжительность
  if (events.length > 0) {
    stats.averageDuration = stats.totalDuration / events.length;
  }

  return stats;
}

/**
 * Интеграция с внешними календарями (Google Calendar, Outlook)
 */

/**
 * Конвертация события в формат Google Calendar
 * @param {Object} event - Событие
 * @returns {Object} - Событие в формате Google Calendar
 */
export function convertToGoogleCalendarFormat(event) {
  return {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: moment(event.startTime).toISOString(),
      timeZone: 'Europe/Moscow',
    },
    end: {
      dateTime: moment(event.endTime).toISOString(),
      timeZone: 'Europe/Moscow',
    },
    attendees: event.attendeeIds
      ? event.attendeeIds.map((id) => ({ email: `user-${id}@example.com` }))
      : [],
    reminders: {
      useDefault: false,
      overrides: event.reminderMinutes
        ? [
            { method: 'email', minutes: event.reminderMinutes },
            { method: 'popup', minutes: event.reminderMinutes },
          ]
        : [],
    },
  };
}

/**
 * Конвертация события из формата Google Calendar
 * @param {Object} googleEvent - Событие Google Calendar
 * @returns {Object} - Событие в нашем формате
 */
export function convertFromGoogleCalendarFormat(googleEvent) {
  return {
    title: googleEvent.summary,
    description: googleEvent.description,
    startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
    endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
    isAllDay: !googleEvent.start.dateTime,
    eventType: 'meeting',
    status: 'scheduled',
    reminderMinutes: googleEvent.reminders?.overrides?.[0]?.minutes || 15,
  };
}

/**
 * Генерация ICS файла для события
 * @param {Object} event - Событие
 * @returns {string} - Содержимое ICS файла
 */
export function generateICSFile(event) {
  const startTime = moment(event.startTime).utc().format('YYYYMMDDTHHmmss[Z]');
  const endTime = moment(event.endTime).utc().format('YYYYMMDDTHHmmss[Z]');
  const createdTime = moment().utc().format('YYYYMMDDTHHmmss[Z]');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Video Conference System//Calendar//RU
BEGIN:VEVENT
UID:${event.id}@videoconference.local
DTSTAMP:${createdTime}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
ORGANIZER:CN=${event.organizer?.name || 'Организатор'}:MAILTO:${
    event.organizer?.email || 'noreply@videoconference.local'
  }
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
}

/**
 * Утилиты для работы с часовыми поясами
 */

/**
 * Конвертация времени в другой часовой пояс
 * @param {Date|string} date - Дата
 * @param {string} timezone - Часовой пояс
 * @returns {Date} - Дата в новом часовом поясе
 */
export function convertToTimezone(date, timezone) {
  return moment.tz(date, timezone).toDate();
}

/**
 * Получение списка часовых поясов
 * @returns {Array} - Массив часовых поясов
 */
export function getTimezones() {
  return [
    { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
    { value: 'Europe/London', label: 'Лондон (UTC+0)' },
    { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
    { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)' },
    { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
    { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
    { value: 'Australia/Sydney', label: 'Сидней (UTC+10)' },
  ];
}

export default {
  validateEventData,
  formatDateTime,
  calculateDuration,
  eventsOverlap,
  findConflictingEvents,
  generateTimeSlots,
  isSlotAvailable,
  getAvailableSlots,
  parseRecurrenceRule,
  generateRecurringEvents,
  groupEventsByDay,
  getEventsStatistics,
  convertToGoogleCalendarFormat,
  convertFromGoogleCalendarFormat,
  generateICSFile,
  convertToTimezone,
  getTimezones,
};
