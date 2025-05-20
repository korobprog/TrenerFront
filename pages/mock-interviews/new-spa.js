import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';
import InterviewCalendar from '../../components/interview/InterviewCalendar';
import CreateMeetButton from '../../components/interview/CreateMeetButton';
import styles from '../../styles/CreateInterview.module.css';

/**
 * Страница создания собеседования с использованием SPA-подхода
 * @returns {JSX.Element} Компонент страницы создания собеседования
 */
export default function CreateInterviewSPA() {
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      console.log(
        'CreateInterviewSPA: onUnauthenticated вызван - пользователь не аутентифицирован'
      );
    },
  });
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useNotification();

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: выбор времени, 2: подтверждение, 3: результат
  const [meetingLink, setMeetingLink] = useState('');
  const [eventId, setEventId] = useState('');
  const [createdInterviewId, setCreatedInterviewId] = useState(null);

  // Получаем текущую дату в формате YYYY-MM-DD для минимальной даты в календаре
  const today = new Date().toISOString().split('T')[0];

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

  // Обработчик создания Google Meet-ссылки
  const handleMeetLinkCreated = ({ meetingLink, eventId }) => {
    setMeetingLink(meetingLink);
    setEventId(eventId);

    // Автоматически переходим к созданию собеседования
    handleCreateInterview(meetingLink, eventId);
  };

  // Создание собеседования с полученной ссылкой
  const handleCreateInterview = async (meetLink, calendarEventId) => {
    try {
      setIsSubmitting(true);

      // Формируем дату и время в формате ISO
      const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
      const scheduledDateTime = new Date(dateTimeString).toISOString();
      console.log('Дата и время собеседования:', scheduledDateTime);

      // Подготавливаем данные для отправки
      const requestData = {
        scheduledTime: scheduledDateTime,
        manualMeetingLink: meetLink,
        calendarEventId: calendarEventId,
      };

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
        throw new Error(
          responseData.message || 'Не удалось создать собеседование'
        );
      }

      showSuccess('Собеседование успешно создано');
      console.log('Собеседование успешно создано:', responseData);

      // Сохраняем ID созданного собеседования
      setCreatedInterviewId(responseData.id);

      // Переходим к шагу результата
      setStep(3);
    } catch (err) {
      console.error('Ошибка при отправке формы:', err);
      showError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик перехода к созданному собеседованию
  const handleGoToInterview = () => {
    if (createdInterviewId) {
      // Используем router.push для навигации без перезагрузки
      router.push(`/mock-interviews/${createdInterviewId}`);
    } else {
      // Если ID не сохранен, перенаправляем на список собеседований
      router.push('/mock-interviews');
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
        <h1 className={styles.title}>Создание мок-собеседования (SPA)</h1>

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
                  disabled={!scheduledDate || !scheduledTime}
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
              </div>

              <div className={styles.meetLinkContainer}>
                <p className={styles.meetLinkInfo}>
                  Нажмите кнопку ниже, чтобы создать ссылку на Google Meet и
                  собеседование
                </p>
                <CreateMeetButton
                  onMeetLinkCreated={handleMeetLinkCreated}
                  buttonText="Создать ссылку и собеседование"
                  disabled={isSubmitting}
                  className={styles.createMeetButton}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                >
                  Назад
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.formStep}>
              <h2>Собеседование создано</h2>
              <div className={styles.successContainer}>
                <div className={styles.successIcon}>✓</div>
                <p className={styles.successMessage}>
                  Собеседование успешно создано!
                </p>

                <div className={styles.meetingLinkContainer}>
                  <p className={styles.meetingLinkLabel}>
                    Ссылка на Google Meet:
                  </p>
                  <a
                    href={meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.meetingLink}
                  >
                    {meetingLink}
                  </a>
                </div>

                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.viewButton}
                    onClick={handleGoToInterview}
                  >
                    Перейти к собеседованию
                  </button>
                  <button
                    type="button"
                    className={styles.listButton}
                    onClick={() => router.push('/mock-interviews')}
                  >
                    К списку собеседований
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
