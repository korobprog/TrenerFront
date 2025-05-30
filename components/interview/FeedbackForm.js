import { useState } from 'react';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/FeedbackForm.module.css';

/**
 * Компонент формы для оставления отзыва о собеседовании
 * @param {Object} props - Свойства компонента
 * @param {Object} props.interview - Данные о собеседовании
 * @param {Function} props.onSubmitSuccess - Функция, вызываемая после успешной отправки формы
 * @returns {JSX.Element} Компонент формы отзыва
 */
export default function FeedbackForm({ interview, onSubmitSuccess }) {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  const [technicalScore, setTechnicalScore] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Обработчик изменения технической оценки
  const handleScoreChange = (score) => {
    setTechnicalScore(score);
  };

  // Обработчик изменения текста отзыва
  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim()) {
      showError('Пожалуйста, напишите отзыв');
      return;
    }

    try {
      setIsSubmitting(true);

      console.log('Отправка отзыва:', {
        interviewId: interview.id,
        technicalScore,
        feedback: feedback.substring(0, 30) + '...', // Логируем только начало отзыва
      });

      const response = await fetch(
        `/api/mock-interviews/${interview.id}/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            technicalScore,
            feedback,
          }),
        }
      );

      console.log('Ответ сервера:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка при отправке отзыва:', errorData);
        throw new Error(errorData.message || 'Не удалось оставить отзыв');
      }

      showSuccess('Отзыв успешно отправлен');

      // Вызываем функцию успешной отправки
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.feedbackFormContainer}>
      <div className={styles.formHeader}>
        <h2>Оставить отзыв о собеседовании</h2>
        <p className={styles.interviewInfo}>
          Собеседование с{' '}
          <strong>
            {interview.interviewee?.name || 'Неизвестный пользователь'}
          </strong>{' '}
          от{' '}
          {new Date(interview.scheduledTime).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Техническая оценка:</label>
          <div className={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((score) => (
              <div
                key={score}
                className={`${styles.ratingItem} ${
                  technicalScore >= score ? styles.active : ''
                }`}
                onClick={() => handleScoreChange(score)}
              >
                {score}
              </div>
            ))}
          </div>
          <div className={styles.ratingHint}>
            <span>Слабо</span>
            <span>Отлично</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedback">Отзыв и рекомендации:</label>
          <textarea
            id="feedback"
            className={styles.feedbackTextarea}
            value={feedback}
            onChange={handleFeedbackChange}
            placeholder="Опишите сильные и слабые стороны кандидата, дайте рекомендации по улучшению..."
            rows={8}
            required
          />
        </div>

        <div className={styles.feedbackTips}>
          <h3>Советы по написанию отзыва:</h3>
          <ul>
            <li>Будьте конструктивны и объективны</li>
            <li>Укажите конкретные примеры из собеседования</li>
            <li>Предложите практические рекомендации для улучшения</li>
            <li>Отметьте как сильные, так и слабые стороны</li>
          </ul>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push(`/mock-interviews/${interview.id}`)}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
          </button>
        </div>
      </form>
    </div>
  );
}
