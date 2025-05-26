import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';
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
  const { showSuccess, showError, showInfo } = useNotification();

  // Добавляем расширенное логирование для отладки
  console.log('CreateInterview: Компонент инициализирован');
  console.log('CreateInterview: Статус сессии:', status);
  console.log('CreateInterview: Данные сессии:', session);
  console.log('CreateInterview: Заголовки запроса недоступны на клиенте');

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: выбор времени, 2: подтверждение, 3: ручной ввод ссылки
  const [manualMeetingLink, setManualMeetingLink] = useState('');
  const [autoLinkError, setAutoLinkError] = useState('');

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

  // Переход к следующему шагу
  const handleNextStep = () => {
    if (step === 1 && (!scheduledDate || !scheduledTime)) {
      showError('Пожалуйста, выберите дату и время собеседования');
      return;
    }

    setStep(step + 1);
  };

  // Переход к предыдущему шагу
  const handlePrevStep = () => {
    setStep(step - 1);
  };

  // Валидация ссылки на Google Meet
  const validateMeetingLink = (link) => {
    if (!link) return false;

    // Простая проверка на наличие meet.google.com в ссылке
    return link.includes('meet.google.com');
  };

  // Обработчик изменения ручной ссылки
  const handleManualLinkChange = (e) => {
    setManualMeetingLink(e.target.value);
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

    // Если мы на шаге ручного ввода ссылки, проверяем её валидность
    if (step === 3) {
      if (!validateMeetingLink(manualMeetingLink)) {
        showError('Пожалуйста, введите корректную ссылку на Google Meet');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Формируем дату и время в формате ISO
      const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
      const scheduledDateTime = new Date(dateTimeString).toISOString();
      console.log('Дата и время собеседования:', scheduledDateTime);

      // Подготавливаем данные для отправки
      const requestData = {
        scheduledTime: scheduledDateTime,
      };

      // Если есть ручная ссылка, добавляем её
      if (step === 3 && manualMeetingLink) {
        requestData.manualMeetingLink = manualMeetingLink;
      }

      console.log(
        'Отправляем POST-запрос на /api/mock-interviews с данными:',
        requestData
      );
      const response = await fetch('/api/mock-interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Получен ответ:', response.status);
      const responseData = await response.json();

      if (!response.ok) {
        console.error('Ошибка при создании собеседования:', responseData);

        // Если сервер запрашивает ручной ввод ссылки
        if (responseData.needManualLink) {
          setAutoLinkError(
            responseData.message || 'Не удалось автоматически создать ссылку'
          );
          setStep(3); // Переходим на шаг ручного ввода ссылки
          return;
        }

        throw new Error(
          responseData.message || 'Не удалось создать собеседование'
        );
      }

      showSuccess('Собеседование успешно создано');
      console.log(
        'Собеседование успешно создано, перенаправляем на страницу со списком собеседований'
      );
      // Перенаправляем на страницу со списком собеседований
      router.push('/mock-interviews');
    } catch (err) {
      console.error('Ошибка при отправке формы:', err);
      showError(err.message);
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
                    <span className={styles.confirmationLabel}>
                      Примечание:
                    </span>
                    <span className={styles.confirmationValue}>
                      Ссылка на Google Meet будет создана автоматически
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

            {step === 3 && (
              <div className={styles.formStep}>
                <h2>Ручной ввод ссылки</h2>
                <div className={styles.manualLinkContainer}>
                  <p className={styles.errorMessage}>
                    {autoLinkError ||
                      'Не удалось автоматически создать ссылку на Google Meet. Пожалуйста, введите ссылку вручную.'}
                  </p>

                  <div className={styles.formGroup}>
                    <label htmlFor="manualMeetingLink" className={styles.label}>
                      Ссылка на Google Meet:
                    </label>
                    <input
                      type="text"
                      id="manualMeetingLink"
                      className={styles.input}
                      value={manualMeetingLink}
                      onChange={handleManualLinkChange}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx"
                      required
                    />
                    <p className={styles.hint}>
                      Ссылка должна содержать "meet.google.com"
                    </p>
                  </div>

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
                    disabled={
                      isSubmitting || !validateMeetingLink(manualMeetingLink)
                    }
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
