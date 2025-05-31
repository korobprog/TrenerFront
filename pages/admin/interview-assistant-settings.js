import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/admin/InterviewAssistantSettings.module.css';

/**
 * Страница управления настройками интервью-ассистента
 * @returns {JSX.Element} Страница управления настройками интервью-ассистента
 */
export default function InterviewAssistantSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  // Состояние для хранения настроек
  const [settings, setSettings] = useState({
    maxQuestionsPerDay: 10,
    maxTokensPerQuestion: 4000,
    isActive: true,
    apiType: 'openrouter', // Используем только OpenRouter
    // Настройки для OpenRouter
    openRouterApiKey: '',
    openRouterBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterModel: 'google/gemma-3-12b-it:free',
    openRouterTemperature: 0.7,
    openRouterMaxTokens: 4000,
  });

  // Состояние для хранения ошибок валидации
  const [validationErrors, setValidationErrors] = useState({});

  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);
  // Состояние для отслеживания процесса сохранения
  const [saving, setSaving] = useState(false);
  // Состояние для хранения ошибки
  const [error, setError] = useState(null);
  // Состояние для отображения API ключа
  const [showApiKey, setShowApiKey] = useState(false);

  // Проверяем права доступа
  useEffect(() => {
    if (status === 'authenticated') {
      // Проверяем роль пользователя
      if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
        showError('У вас нет прав для доступа к этой странице');
        router.push('/');
      }
    } else if (status === 'unauthenticated') {
      router.push('/admin/signin');
    }
  }, [status, session, router, showError]);

  // Загрузка настроек
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/interview-assistant-settings');

      if (!response.ok) {
        throw new Error('Ошибка при получении настроек');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Ошибка при загрузке настроек:', err);
      setError('Не удалось загрузить настройки. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем настройки при монтировании компонента
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue;

    // Для числовых полей преобразуем значение в число
    if (type === 'number') {
      newValue = parseInt(value, 10);
    } else if (type === 'checkbox') {
      newValue = checked;
    } else {
      newValue = value;
    }

    setSettings({
      ...settings,
      [name]: newValue,
    });
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Проверяем обязательные поля для OpenRouter
    if (!settings.openRouterApiKey) {
      setError('API ключ OpenRouter обязателен');
      setSaving(false);
      return;
    }

    if (!settings.openRouterModel) {
      setError('Модель OpenRouter обязательна');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/interview-assistant-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при сохранении настроек');
      }

      showSuccess('Настройки успешно сохранены');
      // Обновляем настройки после сохранения
      fetchSettings();
    } catch (err) {
      console.error('Ошибка при сохранении настроек:', err);
      setError(
        err.message ||
          'Не удалось сохранить настройки. Пожалуйста, попробуйте позже.'
      );
      showError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  // Если статус загрузки или пользователь не авторизован, показываем загрузку
  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Настройки интервью-ассистента | Админ-панель</title>
        <meta
          name="description"
          content="Управление настройками интервью-ассистента"
        />
      </Head>

      <AdminLayout>
        <div className={styles.settingsPageContainer}>
          <h1 className={styles.settingsPageTitle}>
            Настройки интервью-ассистента
          </h1>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Загрузка настроек...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorMessage}>{error}</p>
              <button onClick={fetchSettings} className={styles.retryButton}>
                Повторить
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.settingsForm}>
              <div className={styles.formGroup}>
                <h2 className={styles.sectionTitle}>
                  Настройки OpenRouter API
                </h2>
                <p className={styles.formHelp}>
                  Настройки для интеграции с OpenRouter API - универсальным
                  шлюзом к различным языковым моделям
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="openRouterApiKey" className={styles.formLabel}>
                  API ключ OpenRouter
                </label>
                <div className={styles.apiKeyContainer}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    id="openRouterApiKey"
                    name="openRouterApiKey"
                    value={settings.openRouterApiKey}
                    onChange={handleChange}
                    className={styles.formInput}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={styles.toggleButton}
                  >
                    {showApiKey ? '🙈 Скрыть' : '👁️ Показать'}
                  </button>
                </div>
                <p className={styles.formHelp}>
                  API ключ для доступа к OpenRouter. Получите ключ на{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.externalLink}
                  >
                    сайте OpenRouter
                  </a>
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="openRouterModel" className={styles.formLabel}>
                  Модель OpenRouter
                </label>
                <select
                  id="openRouterModel"
                  name="openRouterModel"
                  value={settings.openRouterModel}
                  onChange={handleChange}
                  className={styles.formSelect}
                  required
                >
                  <option value="google/gemma-3-12b-it:free">
                    Google Gemma 3 12B (бесплатная)
                  </option>
                  <option value="anthropic/claude-3-opus:2024-05-23">
                    Anthropic Claude 3 Opus
                  </option>
                  <option value="anthropic/claude-3-sonnet:2024-05-23">
                    Anthropic Claude 3 Sonnet
                  </option>
                  <option value="anthropic/claude-3-haiku:2024-05-23">
                    Anthropic Claude 3 Haiku
                  </option>
                  <option value="meta-llama/llama-3-70b-instruct:free">
                    Meta Llama 3 70B (бесплатная)
                  </option>
                  <option value="mistralai/mistral-large-latest">
                    Mistral Large
                  </option>
                  <option value="mistralai/mistral-medium-latest">
                    Mistral Medium
                  </option>
                  <option value="mistralai/mistral-small-latest">
                    Mistral Small
                  </option>
                </select>
                <p className={styles.formHelp}>
                  Выберите модель OpenRouter для использования в запросах
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="openRouterBaseUrl" className={styles.formLabel}>
                  Базовый URL для OpenRouter API
                </label>
                <input
                  type="text"
                  id="openRouterBaseUrl"
                  name="openRouterBaseUrl"
                  value={settings.openRouterBaseUrl}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                />
                <p className={styles.formHelp}>
                  URL для доступа к API OpenRouter (по умолчанию:
                  https://openrouter.ai/api/v1)
                </p>
              </div>

              <div className={styles.formGroup}>
                <label
                  htmlFor="openRouterTemperature"
                  className={styles.formLabel}
                >
                  Температура генерации ({settings.openRouterTemperature})
                </label>
                <input
                  type="range"
                  id="openRouterTemperature"
                  name="openRouterTemperature"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.openRouterTemperature}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                />
                <p className={styles.formHelp}>
                  Температура влияет на случайность генерации. Низкие значения
                  делают ответы более предсказуемыми, высокие - более
                  творческими.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label
                  htmlFor="openRouterMaxTokens"
                  className={styles.formLabel}
                >
                  Максимальное количество токенов для ответа
                </label>
                <input
                  type="number"
                  id="openRouterMaxTokens"
                  name="openRouterMaxTokens"
                  value={settings.openRouterMaxTokens}
                  onChange={handleChange}
                  min="1000"
                  max="10000"
                  className={styles.formInput}
                  required
                />
                <p className={styles.formHelp}>
                  Максимальное количество токенов, которое может быть
                  использовано для ответа
                </p>
              </div>

              <div className={styles.formGroup}>
                <label
                  htmlFor="maxQuestionsPerDay"
                  className={styles.formLabel}
                >
                  Максимальное количество вопросов в день
                </label>
                <input
                  type="number"
                  id="maxQuestionsPerDay"
                  name="maxQuestionsPerDay"
                  value={settings.maxQuestionsPerDay}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className={styles.formInput}
                  required
                />
                <p className={styles.formHelp}>
                  Ограничение на количество вопросов, которые пользователь может
                  задать в день
                </p>
              </div>

              <div className={styles.formGroup}>
                <label
                  htmlFor="maxTokensPerQuestion"
                  className={styles.formLabel}
                >
                  Максимальное количество токенов на вопрос
                </label>
                <input
                  type="number"
                  id="maxTokensPerQuestion"
                  name="maxTokensPerQuestion"
                  value={settings.maxTokensPerQuestion}
                  onChange={handleChange}
                  min="1000"
                  max="10000"
                  className={styles.formInput}
                  required
                />
                <p className={styles.formHelp}>
                  Ограничение на количество токенов, которые могут быть
                  использованы для ответа на один вопрос
                </p>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={settings.isActive}
                    onChange={handleChange}
                    className={styles.formCheckbox}
                  />
                  <label htmlFor="isActive" className={styles.checkboxLabel}>
                    Активировать интервью-ассистента
                  </label>
                </div>
                <p className={styles.formHelp}>
                  Если отключено, интервью-ассистент будет недоступен для
                  пользователей
                </p>
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </div>
            </form>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

// Серверная проверка прав доступа
export async function getServerSideProps(context) {
  return {
    props: {}, // Передаем пустой объект props
  };
}
