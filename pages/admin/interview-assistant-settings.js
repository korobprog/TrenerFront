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
    apiKey: '',
    maxQuestionsPerDay: 10,
    maxTokensPerQuestion: 4000,
    isActive: true,
    apiType: 'gemini', // По умолчанию используем Google Gemini
    langdockAssistantId: '',
    langdockBaseUrl: 'https://api.langdock.com/assistant/v1/chat/completions',
    langdockRegion: 'eu',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-pro',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com',
    geminiTemperature: 0.7,
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
    let errors = { ...validationErrors };

    // Для числовых полей преобразуем значение в число
    if (type === 'number') {
      newValue = parseInt(value, 10);
    } else if (type === 'checkbox') {
      newValue = checked;
    } else {
      newValue = value;
    }

    // Валидация для ID ассистента LangDock
    if (name === 'langdockAssistantId' && value) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        errors.langdockAssistantId =
          'ID ассистента должен быть в формате UUID (например: 123e4567-e89b-12d3-a456-426614174000)';
      } else {
        delete errors.langdockAssistantId;
      }
    }

    setValidationErrors(errors);
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

    // Проверяем наличие ошибок валидации
    if (Object.keys(validationErrors).length > 0) {
      setError('Пожалуйста, исправьте ошибки в форме перед сохранением');
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
        throw new Error('Ошибка при сохранении настроек');
      }

      showSuccess('Настройки успешно сохранены');
      // Обновляем настройки после сохранения
      fetchSettings();
    } catch (err) {
      console.error('Ошибка при сохранении настроек:', err);
      setError('Не удалось сохранить настройки. Пожалуйста, попробуйте позже.');
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
                <label className={styles.formLabel}>Тип API</label>
                <div className={styles.radioGroup}>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="apiTypeGemini"
                      name="apiType"
                      value="gemini"
                      checked={settings.apiType === 'gemini'}
                      onChange={handleChange}
                      className={styles.radioInput}
                    />
                    <label
                      htmlFor="apiTypeGemini"
                      className={styles.radioLabel}
                    >
                      Google Gemini
                    </label>
                  </div>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="apiTypeAnthropic"
                      name="apiType"
                      value="anthropic"
                      checked={settings.apiType === 'anthropic'}
                      onChange={handleChange}
                      className={styles.radioInput}
                    />
                    <label
                      htmlFor="apiTypeAnthropic"
                      className={styles.radioLabel}
                    >
                      Anthropic Claude
                    </label>
                  </div>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="apiTypeLangdock"
                      name="apiType"
                      value="langdock"
                      checked={settings.apiType === 'langdock'}
                      onChange={handleChange}
                      className={styles.radioInput}
                    />
                    <label
                      htmlFor="apiTypeLangdock"
                      className={styles.radioLabel}
                    >
                      LangDock API
                    </label>
                  </div>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="apiTypeOpenRouter"
                      name="apiType"
                      value="openrouter"
                      checked={settings.apiType === 'openrouter'}
                      onChange={handleChange}
                      className={styles.radioInput}
                    />
                    <label
                      htmlFor="apiTypeOpenRouter"
                      className={styles.radioLabel}
                    >
                      OpenRouter API
                    </label>
                  </div>
                </div>
                <p className={styles.formHelp}>
                  Выберите API, которое будет использоваться для
                  интервью-ассистента
                </p>
              </div>

              {settings.apiType === 'anthropic' && (
                <div className={styles.formGroup}>
                  <label htmlFor="apiKey" className={styles.formLabel}>
                    API ключ Anthropic Claude
                  </label>
                  <div className={styles.apiKeyContainer}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      id="apiKey"
                      name="apiKey"
                      value={settings.apiKey}
                      onChange={handleChange}
                      className={styles.formInput}
                      required={settings.apiType === 'anthropic'}
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
                    API ключ для доступа к Anthropic Claude. Получите ключ на{' '}
                    <a
                      href="https://console.anthropic.com/account/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.externalLink}
                    >
                      сайте Anthropic
                    </a>
                  </p>
                </div>
              )}

              {settings.apiType === 'langdock' && (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="apiKey" className={styles.formLabel}>
                      API ключ LangDock
                    </label>
                    <div className={styles.apiKeyContainer}>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        id="apiKey"
                        name="apiKey"
                        value={settings.apiKey}
                        onChange={handleChange}
                        className={styles.formInput}
                        required={settings.apiType === 'langdock'}
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
                      API ключ для доступа к LangDock API
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label
                      htmlFor="langdockAssistantId"
                      className={styles.formLabel}
                    >
                      ID ассистента LangDock
                    </label>
                    <input
                      type="text"
                      id="langdockAssistantId"
                      name="langdockAssistantId"
                      value={settings.langdockAssistantId}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        validationErrors.langdockAssistantId
                          ? styles.inputError
                          : ''
                      }`}
                      required={settings.apiType === 'langdock'}
                      placeholder="Например: 123e4567-e89b-12d3-a456-426614174000"
                    />
                    {validationErrors.langdockAssistantId && (
                      <p className={styles.errorMessage}>
                        {validationErrors.langdockAssistantId}
                      </p>
                    )}
                    <p className={styles.formHelp}>
                      Идентификатор ассистента в LangDock в формате UUID
                      (8-4-4-4-12 символов)
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label
                      htmlFor="langdockBaseUrl"
                      className={styles.formLabel}
                    >
                      Базовый URL для LangDock API
                    </label>
                    <input
                      type="text"
                      id="langdockBaseUrl"
                      name="langdockBaseUrl"
                      value={settings.langdockBaseUrl}
                      onChange={handleChange}
                      className={styles.formInput}
                      required={settings.apiType === 'langdock'}
                    />
                    <p className={styles.formHelp}>
                      URL для доступа к API LangDock (по умолчанию:
                      https://api.langdock.com/assistant/v1/chat/completions)
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label
                      htmlFor="langdockRegion"
                      className={styles.formLabel}
                    >
                      Регион API LangDock
                    </label>
                    <select
                      id="langdockRegion"
                      name="langdockRegion"
                      value={settings.langdockRegion}
                      onChange={handleChange}
                      className={styles.formSelect}
                      required={settings.apiType === 'langdock'}
                    >
                      <option value="eu">Европа (EU)</option>
                      <option value="us">США (US)</option>
                    </select>
                    <p className={styles.formHelp}>
                      Выберите регион для API LangDock
                    </p>
                  </div>
                </>
              )}

              {settings.apiType === 'gemini' && (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="geminiApiKey" className={styles.formLabel}>
                      API ключ Google Gemini
                    </label>
                    <div className={styles.apiKeyContainer}>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        id="geminiApiKey"
                        name="geminiApiKey"
                        value={settings.geminiApiKey}
                        onChange={handleChange}
                        className={styles.formInput}
                        required={settings.apiType === 'gemini'}
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
                      API ключ для доступа к Google Gemini. Получите ключ на{' '}
                      <a
                        href="https://ai.google.dev/tutorials/setup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLink}
                      >
                        сайте Google AI Studio
                      </a>
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="geminiModel" className={styles.formLabel}>
                      Модель Gemini
                    </label>
                    <select
                      id="geminiModel"
                      name="geminiModel"
                      value={settings.geminiModel}
                      onChange={handleChange}
                      className={styles.formSelect}
                      required={settings.apiType === 'gemini'}
                    >
                      <option value="gemini-1.5-flash">
                        gemini-1.5-flash (бесплатная)
                      </option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                      <option value="gemini-1.0-pro">gemini-1.0-pro</option>
                      <option value="gemini-pro">gemini-pro</option>
                      <option value="gemini-pro-vision">
                        gemini-pro-vision
                      </option>
                    </select>
                    <p className={styles.formHelp}>
                      Выберите модель Gemini для использования в запросах
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="geminiBaseUrl" className={styles.formLabel}>
                      Базовый URL для Gemini API
                    </label>
                    <input
                      type="text"
                      id="geminiBaseUrl"
                      name="geminiBaseUrl"
                      value={settings.geminiBaseUrl}
                      onChange={handleChange}
                      className={styles.formInput}
                      required={settings.apiType === 'gemini'}
                    />
                    <p className={styles.formHelp}>
                      URL для доступа к API Google Gemini (по умолчанию:
                      https://generativelanguage.googleapis.com)
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label
                      htmlFor="geminiTemperature"
                      className={styles.formLabel}
                    >
                      Температура генерации ({settings.geminiTemperature})
                    </label>
                    <input
                      type="range"
                      id="geminiTemperature"
                      name="geminiTemperature"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.geminiTemperature}
                      onChange={handleChange}
                      className={styles.formInput}
                      required={settings.apiType === 'gemini'}
                    />
                    <p className={styles.formHelp}>
                      Температура влияет на случайность генерации. Низкие
                      значения делают ответы более предсказуемыми, высокие -
                      более творческими.
                    </p>
                  </div>
                </>
              )}

              {settings.apiType === 'openrouter' && (
                <>
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="openRouterApiKey"
                      className={styles.formLabel}
                    >
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
                        required={settings.apiType === 'openrouter'}
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
                    <label
                      htmlFor="openRouterModel"
                      className={styles.formLabel}
                    >
                      Модель OpenRouter
                    </label>
                    <select
                      id="openRouterModel"
                      name="openRouterModel"
                      value={settings.openRouterModel}
                      onChange={handleChange}
                      className={styles.formSelect}
                      required={settings.apiType === 'openrouter'}
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
                    <label
                      htmlFor="openRouterBaseUrl"
                      className={styles.formLabel}
                    >
                      Базовый URL для OpenRouter API
                    </label>
                    <input
                      type="text"
                      id="openRouterBaseUrl"
                      name="openRouterBaseUrl"
                      value={settings.openRouterBaseUrl}
                      onChange={handleChange}
                      className={styles.formInput}
                      required={settings.apiType === 'openrouter'}
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
                      required={settings.apiType === 'openrouter'}
                    />
                    <p className={styles.formHelp}>
                      Температура влияет на случайность генерации. Низкие
                      значения делают ответы более предсказуемыми, высокие -
                      более творческими.
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
                      required={settings.apiType === 'openrouter'}
                    />
                    <p className={styles.formHelp}>
                      Максимальное количество токенов, которое может быть
                      использовано для ответа
                    </p>
                  </div>
                </>
              )}

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
