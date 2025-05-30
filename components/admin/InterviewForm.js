import { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/admin/InterviewDetails.module.css';

/**
 * Компонент формы редактирования собеседования
 * @param {Object} props - Свойства компонента
 * @param {Object} props.interview - Данные собеседования для редактирования
 * @param {Function} props.onUpdate - Функция, вызываемая при успешном обновлении
 * @param {Function} props.onCancel - Функция, вызываемая при отмене редактирования
 * @returns {JSX.Element} Компонент формы редактирования собеседования
 */
export default function InterviewForm({ interview, onUpdate, onCancel }) {
  const { showError, showSuccess } = useNotification();

  // Состояние для хранения данных формы
  const [formData, setFormData] = useState({
    scheduledTime: '',
    status: '',
    meetingLink: '',
    interviewerId: '',
    intervieweeId: '',
  });

  // Состояние для отслеживания загрузки
  const [loading, setLoading] = useState(false);

  // Инициализация формы данными собеседования
  useEffect(() => {
    if (interview) {
      setFormData({
        scheduledTime: interview.scheduledTime
          ? new Date(interview.scheduledTime).toISOString().slice(0, 16)
          : '',
        status: interview.status || '',
        meetingLink: interview.meetingLink || '',
        interviewerId: interview.interviewer?.id || '',
        intervieweeId: interview.interviewee?.id || '',
      });
    }
  }, [interview]);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Выполняем запрос к API для обновления собеседования
      const response = await fetch(`/api/admin/interviews/${interview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении собеседования');
      }

      const updatedInterview = await response.json();

      // Вызываем функцию обновления с обновленными данными
      onUpdate(updatedInterview);
      showSuccess('Собеседование успешно обновлено');
    } catch (error) {
      console.error('Ошибка при обновлении собеседования:', error);
      showError('Не удалось обновить собеседование');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Редактирование собеседования</h2>

      <form onSubmit={handleSubmit} className={styles.interviewForm}>
        <div className={styles.formGroup}>
          <label htmlFor="scheduledTime" className={styles.formLabel}>
            Дата и время собеседования
          </label>
          <input
            type="datetime-local"
            id="scheduledTime"
            name="scheduledTime"
            value={formData.scheduledTime}
            onChange={handleChange}
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="status" className={styles.formLabel}>
            Статус собеседования
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={styles.formSelect}
            required
          >
            <option value="">Выберите статус</option>
            <option value="scheduled">Запланировано</option>
            <option value="completed">Завершено</option>
            <option value="cancelled">Отменено</option>
            <option value="no_show">Неявка</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meetingLink" className={styles.formLabel}>
            Ссылка на встречу
          </label>
          <input
            type="url"
            id="meetingLink"
            name="meetingLink"
            value={formData.meetingLink}
            onChange={handleChange}
            className={styles.formInput}
            placeholder="https://meet.google.com/..."
          />
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  );
}
