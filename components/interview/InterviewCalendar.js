import { useState, useEffect } from 'react';
import styles from '../../styles/InterviewCalendar.module.css';

/**
 * Компонент календаря для выбора даты и времени собеседования
 * @param {Object} props - Свойства компонента
 * @param {string} props.selectedDate - Выбранная дата в формате YYYY-MM-DD
 * @param {string} props.selectedTime - Выбранное время в формате HH:MM
 * @param {Function} props.onDateChange - Функция обработки изменения даты
 * @param {Function} props.onTimeChange - Функция обработки изменения времени
 * @returns {JSX.Element} Компонент календаря
 */
export default function InterviewCalendar({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}) {
  // Получаем текущую дату в формате YYYY-MM-DD для минимальной даты в календаре
  const today = new Date().toISOString().split('T')[0];

  // Генерируем часы для выбора времени (с шагом в 1 час)
  const [availableHours, setAvailableHours] = useState([]);

  useEffect(() => {
    // Генерируем доступные часы с 8:00 до 22:00 (рабочее время)
    const hours = [];
    for (let i = 8; i <= 22; i++) {
      const hour = i < 10 ? `0${i}` : `${i}`;
      hours.push(`${hour}:00`);
    }
    setAvailableHours(hours);
  }, []);

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <h3>Выберите дату и время собеседования</h3>
      </div>

      <div className={styles.calendarBody}>
        <div className={styles.datePickerContainer}>
          <label htmlFor="date">Дата:</label>
          <input
            type="date"
            id="date"
            className={styles.datePicker}
            min={today}
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            required
          />
        </div>

        <div className={styles.timePickerContainer}>
          <label htmlFor="time">Время:</label>
          <select
            id="time"
            className={styles.timePicker}
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            required
          >
            <option value="">Выберите время</option>
            {availableHours.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDate && selectedTime && (
        <div className={styles.selectionSummary}>
          <p>
            Выбранное время:{' '}
            <strong>
              {new Date(`${selectedDate}T${selectedTime}`).toLocaleString(
                'ru-RU',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
