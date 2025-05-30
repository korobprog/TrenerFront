import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/CreateVideoConference.module.css';

export default function CreateVideoConference() {
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      console.log('CreateVideoConference: Пользователь не аутентифицирован');
    },
  });
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    maxParticipants: 10,
    isPrivate: false,
    recordingEnabled: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: основная информация, 2: настройки, 3: подтверждение

  // Получаем текущую дату и время для минимальных значений
  const now = new Date();
  const minDateTime = new Date(now.getTime() + 5 * 60000)
    .toISOString()
    .slice(0, 16); // +5 минут

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      showError('Пожалуйста, введите название видеоконференции');
      return false;
    }
    if (!formData.scheduledStartTime) {
      showError('Пожалуйста, выберите время начала');
      return false;
    }

    const startTime = new Date(formData.scheduledStartTime);
    const currentTime = new Date();

    if (startTime <= currentTime) {
      showError('Время начала должно быть в будущем');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (formData.scheduledEndTime) {
      const startTime = new Date(formData.scheduledStartTime);
      const endTime = new Date(formData.scheduledEndTime);

      if (endTime <= startTime) {
        showError('Время окончания должно быть позже времени начала');
        return false;
      }
    }

    if (formData.maxParticipants < 2 || formData.maxParticipants > 50) {
      showError('Количество участников должно быть от 2 до 50');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;

    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!session) {
      showError('Необходимо войти в систему');
      router.push('/auth/signin');
      return;
    }

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    try {
      setIsSubmitting(true);

      console.log('Создание видеоконференции с данными:', formData);

      const response = await fetch('/api/video-conferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message || 'Не удалось создать видеоконференцию'
        );
      }

      showSuccess('Видеоконференция успешно создана');
      router.push(`/video-conferences/${responseData.id}`);
    } catch (err) {
      console.error('Ошибка при создании видеоконференции:', err);
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

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Создание видеоконференции</h1>

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
                <h2>Основная информация</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    Название видеоконференции *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className={styles.input}
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Введите название конференции"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="description" className={styles.label}>
                    Описание
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className={styles.textarea}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Краткое описание конференции (необязательно)"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="scheduledStartTime" className={styles.label}>
                    Время начала *
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledStartTime"
                    name="scheduledStartTime"
                    className={styles.input}
                    value={formData.scheduledStartTime}
                    onChange={handleInputChange}
                    min={minDateTime}
                    required
                  />
                </div>

                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => router.push('/video-conferences')}
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
                <h2>Настройки конференции</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="scheduledEndTime" className={styles.label}>
                    Время окончания (необязательно)
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledEndTime"
                    name="scheduledEndTime"
                    className={styles.input}
                    value={formData.scheduledEndTime}
                    onChange={handleInputChange}
                    min={formData.scheduledStartTime}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="maxParticipants" className={styles.label}>
                    Максимальное количество участников
                  </label>
                  <input
                    type="number"
                    id="maxParticipants"
                    name="maxParticipants"
                    className={styles.input}
                    value={formData.maxParticipants}
                    onChange={handleInputChange}
                    min={2}
                    max={50}
                  />
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="isPrivate"
                      checked={formData.isPrivate}
                      onChange={handleInputChange}
                      className={styles.checkbox}
                    />
                    Приватная конференция
                  </label>
                  <p className={styles.hint}>
                    Приватные конференции не отображаются в общем списке
                  </p>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="recordingEnabled"
                      checked={formData.recordingEnabled}
                      onChange={handleInputChange}
                      className={styles.checkbox}
                    />
                    Включить запись конференции
                  </label>
                  <p className={styles.hint}>
                    Запись будет доступна после окончания конференции
                  </p>
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
                    <span className={styles.confirmationLabel}>Название:</span>
                    <span className={styles.confirmationValue}>
                      {formData.name}
                    </span>
                  </div>

                  {formData.description && (
                    <div className={styles.confirmationItem}>
                      <span className={styles.confirmationLabel}>
                        Описание:
                      </span>
                      <span className={styles.confirmationValue}>
                        {formData.description}
                      </span>
                    </div>
                  )}

                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>
                      Время начала:
                    </span>
                    <span className={styles.confirmationValue}>
                      {new Date(formData.scheduledStartTime).toLocaleString(
                        'ru-RU'
                      )}
                    </span>
                  </div>

                  {formData.scheduledEndTime && (
                    <div className={styles.confirmationItem}>
                      <span className={styles.confirmationLabel}>
                        Время окончания:
                      </span>
                      <span className={styles.confirmationValue}>
                        {new Date(formData.scheduledEndTime).toLocaleString(
                          'ru-RU'
                        )}
                      </span>
                    </div>
                  )}

                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>
                      Максимум участников:
                    </span>
                    <span className={styles.confirmationValue}>
                      {formData.maxParticipants}
                    </span>
                  </div>

                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>Тип:</span>
                    <span className={styles.confirmationValue}>
                      {formData.isPrivate ? 'Приватная' : 'Публичная'}
                    </span>
                  </div>

                  <div className={styles.confirmationItem}>
                    <span className={styles.confirmationLabel}>Запись:</span>
                    <span className={styles.confirmationValue}>
                      {formData.recordingEnabled ? 'Включена' : 'Отключена'}
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
                    {isSubmitting ? 'Создание...' : 'Создать видеоконференцию'}
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
