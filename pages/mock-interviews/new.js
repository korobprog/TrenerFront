import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import InterviewCalendar from '../../components/interview/InterviewCalendar';
import styles from '../../styles/CreateInterview.module.css';

export default function CreateInterview() {
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      console.log(
        'CreateInterview: onUnauthenticated вызван - пользователь не аутентифицирован'
      );
    },
  });
  const router = useRouter();

  // Добавляем расширенное логирование для отладки
  console.log('CreateInterview: Компонент инициализирован');
  console.log('CreateInterview: Статус сессии:', status);
  console.log('CreateInterview: Данные сессии:', session);
  console.log('CreateInterview: Заголовки запроса недоступны на клиенте');

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: выбор времени, 2: добавление ссылки, 3: подтверждение

  // Получаем текущую дату в формате YYYY-MM-DD для минимальной даты в календаре
  const today = new Date().toISOString().split('T')[0];

  // Генерируем часы для выбора времени (только часы, без минут)
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i < 10 ? `0${i}` : `${i}`;
    return `${hour}:00`;
  });

  // Обработчик изменения даты
  const handleDateChange = (value) => {
    console.log('Получено значение даты:', value);
    setScheduledDate(value);
  };

  // Обработчик изменения времени
  const handleTimeChange = (value) => {
    console.log('Получено значение времени:', value);
    setScheduledTime(value);
  };

  // Обработчик изменения ссылки на встречу
  const handleLinkChange = (e) => {
    setMeetingLink(e.target.value);
  };

  // Переход к следующему шагу
  const handleNextStep = () => {
    if (step === 1 && (!scheduledDate || !scheduledTime)) {
      setError('Пожалуйста, выберите дату и время собеседования');
      return;
    }

    if (step === 2 && !meetingLink) {
      setError('Пожалуйста, добавьте ссылку на Google Meet');
      return;
    }

    if (step === 2 && !isValidMeetingLink(meetingLink)) {
      setError('Пожалуйста, добавьте корректную ссылку на Google Meet');
      return;
    }

    setError(null);
    setStep(step + 1);
  };

  // Переход к предыдущему шагу
  const handlePrevStep = () => {
    setStep(step - 1);
  };

  // Проверка валидности ссылки на Google Meet
  const isValidMeetingLink = (link) => {
    // Простая проверка на наличие meet.google.com в ссылке
    return link.includes('meet.google.com');
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('CreateInterview: Отправка формы создания собеседования');
    console.log('CreateInterview: Статус сессии при отправке:', status);
    console.log('CreateInterview: Данные сессии при отправке:', session);

    // Проверяем localStorage на наличие данных сессии
    console.log('CreateInterview: Проверка localStorage:');
    try {
      const localStorageKeys = Object.keys(localStorage);
      console.log('CreateInterview: Ключи в localStorage:', localStorageKeys);

      // Ищем ключи, связанные с next-auth
      const nextAuthKeys = localStorageKeys.filter((key) =>
        key.includes('next-auth')
      );
      console.log(
        'CreateInterview: Ключи next-auth в localStorage:',
        nextAuthKeys
      );

      // Проверяем cookies
      console.log('CreateInterview: Cookies:', document.cookie);
    } catch (error) {
      console.error(
        'CreateInterview: Ошибка при проверке localStorage:',
        error
      );
    }

    if (!session) {
      console.log(
        'CreateInterview: Сессия отсутствует, перенаправляем на страницу входа'
      );
      router.push('/auth/signin');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Формируем дату и время в формате ISO
      const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
      const scheduledDateTime = new Date(dateTimeString).toISOString();
      console.log('Дата и время собеседования:', scheduledDateTime);
      console.log('Ссылка на встречу:', meetingLink);

      console.log('Отправляем POST-запрос на /api/mock-interviews');
      const response = await fetch('/api/mock-interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledTime: scheduledDateTime,
          meetingLink,
        }),
      });

      console.log('Получен ответ:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка при создании собеседования:', errorData);
        throw new Error(
          errorData.message || 'Не удалось создать собеседование'
        );
      }

      console.log(
        'Собеседование успешно создано, перенаправляем на страницу со списком собеседований'
      );
      // Перенаправляем на страницу со списком собеседований
      router.push('/mock-interviews');
    } catch (err) {
      console.error('Ошибка при отправке формы:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Создание мок-собеседования</h1>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.card}>
          <div className={styles.stepIndicator}>
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
              1
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
              2
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
              3
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className={styles.formStep}>
                <InterviewCalendar
                  selectedDate={scheduledDate}
                  selectedTime={scheduledTime}
                  onDateChange={handleDateChange}
                  onTimeChange={handleTimeChange}
                />
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => router.push('/mock-interviews')}
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    className={styles.nextButton}
                    onClick={handleNextStep}
                  >
                    Далее
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.formStep}>
                <h2>Добавьте ссылку на Google Meet</h2>
                <div className={styles.meetInfo}>
                  <p>Для создания ссылки на Google Meet:</p>
                  <ol>
                    <li>
                      Перейдите на{' '}
                      <a
                        href="https://meet.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        meet.google.com
                      </a>
                    </li>
                    <li>
                      Нажмите "Новая встреча" и выберите "Создать встречу для
                      дальнейшего использования"
                    </li>
                    <li>Скопируйте ссылку на встречу и вставьте её ниже</li>
                  </ol>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="meetingLink">Ссылка на Google Meet:</label>
                  <input
                    type="url"
                    id="meetingLink"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    value={meetingLink}
                    onChange={handleLinkChange}
                    required
                  />
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={handlePrevStep}
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    className={styles.nextButton}
                    onClick={handleNextStep}
                  >
                    Далее
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.formStep}>
                <h2>Подтверждение</h2>
                <div className={styles.confirmationDetails}>
                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>Дата:</span>
                    <span className={styles.confirmationValue}>
                      {new Date(scheduledDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>Время:</span>
                    <span className={styles.confirmationValue}>
                      {scheduledTime}
                    </span>
                  </div>
                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>Ссылка:</span>
                    <span className={styles.confirmationValue}>
                      {meetingLink}
                    </span>
                  </div>
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={handlePrevStep}
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Создание...' : 'Создать собеседование'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
