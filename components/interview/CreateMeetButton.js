'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/InterviewButton.module.css';

/**
 * Компонент кнопки для создания Google Meet-ссылки без перезагрузки страницы
 * @param {Object} props - Свойства компонента
 * @param {Function} props.onMeetLinkCreated - Функция, вызываемая после создания ссылки
 * @param {string} props.buttonText - Текст кнопки
 * @param {string} props.className - Дополнительные классы стилей
 * @param {boolean} props.disabled - Флаг отключения кнопки
 * @returns {JSX.Element} Компонент кнопки создания Google Meet
 */
export default function CreateMeetButton({
  onMeetLinkCreated,
  buttonText = 'Создать Google Meet',
  className = '',
  disabled = false,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Обработчик создания Google Meet-ссылки
   */
  const handleCreateMeet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Запрос к API для создания Google Meet-ссылки
      const response = await fetch('/api/create-meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Ошибка при создании Google Meet-ссылки'
        );
      }

      const data = await response.json();

      console.log('Создана Google Meet-ссылка:', data.meetingLink);

      // Вызываем функцию обратного вызова с полученной ссылкой и ID события
      if (onMeetLinkCreated) {
        onMeetLinkCreated({
          meetingLink: data.meetingLink,
          eventId: data.eventId,
        });
      }
    } catch (error) {
      console.error('Ошибка при создании Google Meet-ссылки:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.createMeetButtonContainer}>
      <button
        className={`${styles.createMeetButton} ${className}`}
        onClick={handleCreateMeet}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Создание ссылки...' : buttonText}
      </button>
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
