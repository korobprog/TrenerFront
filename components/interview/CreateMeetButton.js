'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import styles from '../../styles/InterviewButton.module.css';

/**
 * Компонент кнопки для создания Google Meet-ссылки без перезагрузки страницы
 * @param {Object} props - Свойства компонента
 * @param {Function} props.onMeetLinkCreated - Функция, вызываемая после создания ссылки
 * @param {string} props.buttonText - Текст кнопки
 * @param {string} props.className - Дополнительные классы стилей
 * @param {boolean} props.disabled - Флаг отключения кнопки
 * @param {string} props.initialManualLink - Начальное значение для ручной ссылки
 * @returns {JSX.Element} Компонент кнопки создания Google Meet
 */
export default function CreateMeetButton({
  onMeetLinkCreated,
  buttonText = 'Создать Google Meet',
  className = '',
  disabled = false,
  initialManualLink = '',
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [manualLink, setManualLink] = useState(initialManualLink);
  const [useManualLink, setUseManualLink] = useState(false);
  const [showManualLinkInput, setShowManualLinkInput] = useState(false);

  /**
   * Обработчик создания Google Meet-ссылки
   */
  /**
   * Валидация ссылки на Google Meet
   * @param {string} link - Ссылка для проверки
   * @returns {boolean} Результат валидации
   */
  const isValidGoogleMeetLink = (link) => {
    if (!link) return false;

    // Проверяем, что ссылка содержит meet.google.com
    const meetRegex = /meet\.google\.com/i;
    return meetRegex.test(link);
  };

  /**
   * Обработчик создания Google Meet-ссылки
   */
  const handleCreateMeet = async () => {
    setIsLoading(true);
    setError(null);

    // Если используется ручная ссылка, проверяем её валидность
    if (useManualLink) {
      if (!isValidGoogleMeetLink(manualLink)) {
        setError(
          'Пожалуйста, введите корректную ссылку на Google Meet (должна содержать meet.google.com)'
        );
        setIsLoading(false);
        return;
      }

      // Вызываем функцию обратного вызова с ручной ссылкой
      if (onMeetLinkCreated) {
        onMeetLinkCreated({
          meetingLink: manualLink,
          eventId: null, // При ручном вводе нет ID события
          isManual: true,
        });
      }

      setIsLoading(false);
      return;
    }

    try {
      // Запрос к API для создания Google Meet-ссылки
      const response = await fetch('/api/create-meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manualLink: useManualLink ? manualLink : null,
          skipAutoCreation: useManualLink,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Логируем полученные данные об ошибке для отладки
        console.log('Данные об ошибке при создании Google Meet:', errorData);

        // Проверяем, связана ли ошибка с отсутствием Refresh Token или invalid_grant
        if (
          errorData.error === 'missing_refresh_token' ||
          (errorData.error === 'invalid_grant' &&
            (errorData.needsOAuthUrl || errorData.needsManualLink))
        ) {
          // Если нужна ручная ссылка, показываем поле ввода
          if (errorData.needsManualLink) {
            setShowManualLinkInput(true);
            setUseManualLink(true);
            throw new Error(
              'Не удалось автоматически создать ссылку на Google Meet. Пожалуйста, создайте ссылку вручную и введите её ниже.'
            );
          } else {
            setNeedsReauth(true);
            throw new Error(
              'Для создания Google Meet-ссылки необходимо заново авторизоваться через Google'
            );
          }
        } else {
          throw new Error(
            errorData.message || 'Ошибка при создании Google Meet-ссылки'
          );
        }
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

  /**
   * Обработчик повторной авторизации через Google
   */
  const handleReauthorize = async () => {
    setIsLoading(true);
    try {
      // Перенаправляем пользователя на страницу авторизации Google
      await signIn('google', {
        callbackUrl: window.location.href,
        redirect: true,
      });
    } catch (error) {
      console.error('Ошибка при авторизации через Google:', error);
      setError('Не удалось выполнить авторизацию через Google');
      setIsLoading(false);
    }
  };

  /**
   * Обработчик переключения режима ввода ссылки
   */
  const toggleManualLinkMode = () => {
    setUseManualLink(!useManualLink);
    setShowManualLinkInput(!useManualLink);
    setError(null);
  };

  return (
    <div className={styles.createMeetButtonContainer}>
      {needsReauth ? (
        <>
          <div className={styles.errorMessage}>
            Для создания Google Meet-ссылки необходимо заново авторизоваться
            через Google
          </div>
          <button
            className={`${styles.createMeetButton} ${className}`}
            onClick={handleReauthorize}
            disabled={isLoading}
          >
            {isLoading ? 'Перенаправление...' : 'Авторизоваться через Google'}
          </button>
        </>
      ) : (
        <>
          <div className={styles.manualLinkToggle}>
            <label>
              <input
                type="checkbox"
                checked={useManualLink}
                onChange={toggleManualLinkMode}
              />
              Использовать ручной ввод ссылки
            </label>
          </div>

          {(useManualLink || showManualLinkInput) && (
            <div className={styles.manualLinkContainer}>
              <div className={styles.manualLinkInstructions}>
                <h4>Как создать ссылку на Google Meet вручную:</h4>
                <ol>
                  <li>
                    Откройте{' '}
                    <a
                      href="https://meet.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Meet
                    </a>{' '}
                    в новой вкладке
                  </li>
                  <li>
                    Нажмите на кнопку "Новая встреча" или "Создать встречу"
                  </li>
                  <li>
                    Выберите "Создать встречу для дальнейшего использования"
                  </li>
                  <li>Скопируйте ссылку на встречу</li>
                  <li>Вставьте ссылку в поле ниже</li>
                </ol>
                <p className={styles.manualLinkGuideLink}>
                  <a
                    href="/docs/manual-google-meet-guide.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Подробное руководство по созданию ссылок вручную
                  </a>
                </p>
              </div>
              <input
                type="text"
                value={manualLink}
                onChange={(e) => setManualLink(e.target.value)}
                placeholder="Вставьте ссылку на Google Meet (например, https://meet.google.com/abc-defg-hij)"
                className={styles.manualLinkInput}
              />
            </div>
          )}

          <button
            className={`${styles.createMeetButton} ${className}`}
            onClick={handleCreateMeet}
            disabled={
              disabled ||
              isLoading ||
              (useManualLink && !isValidGoogleMeetLink(manualLink))
            }
          >
            {isLoading
              ? 'Создание ссылки...'
              : useManualLink
              ? 'Использовать введенную ссылку'
              : buttonText}
          </button>
          {error && <div className={styles.errorMessage}>{error}</div>}
        </>
      )}
    </div>
  );
}
