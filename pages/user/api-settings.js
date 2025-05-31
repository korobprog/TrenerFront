import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useNotification } from '../../contexts/NotificationContext';
import ApiSettingsForm from '../../components/user/ApiSettingsForm';
import styles from '../../styles/user/ApiSettings.module.css';

/**
 * Страница настроек API в личном кабинете пользователя
 * @returns {JSX.Element} Страница настроек API
 */
export default function ApiSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  // Состояние для хранения настроек API
  const [settings, setSettings] = useState({
    apiKey: '',
    baseUrl: 'https://api.anthropic.com', // URL по умолчанию для Anthropic
    usePersonalSettings: false,
    apiType: 'openrouter', // По умолчанию используем OpenRouter API
    langdockApiKey: '',
    langdockAssistantId: '',
    langdockBaseUrl: 'https://api.langdock.com/assistant/v1/chat/completions', // URL по умолчанию для LangDock
    langdockRegion: 'eu',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-pro',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com',
    geminiTemperature: 0.7,
    huggingfaceApiKey: '',
    huggingfaceModel: 'meta-llama/Llama-2-7b-chat-hf',
    huggingfaceBaseUrl: 'https://api-inference.huggingface.co/models',
    huggingfaceTemperature: 0.7,
    huggingfaceMaxTokens: 4000,
    openRouterApiKey: '',
    openRouterModel: 'google/gemma-3-12b-it:free',
    openRouterBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterTemperature: 0.7,
    openRouterMaxTokens: 4000,
  });

  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);
  // Состояние для отслеживания процесса сохранения
  const [saving, setSaving] = useState(false);
  // Состояние для хранения ошибки
  const [error, setError] = useState(null);

  // Перенаправляем на страницу входа, если пользователь не авторизован
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Загрузка настроек API пользователя
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Запрос настроек API пользователя');
      const response = await fetch('/api/user/api-settings');

      // Парсим JSON ответ независимо от статуса
      const data = await response.json();

      if (!response.ok) {
        // Используем сообщение об ошибке из API, если доступно
        const errorMessage =
          data.message || data.error || 'Ошибка при получении настроек API';

        // Специальная обработка для 401 ошибки
        if (response.status === 401) {
          throw new Error('Необходима авторизация для просмотра настроек API');
        }

        throw new Error(errorMessage);
      }
      console.log('Получены настройки API от сервера:', {
        useCustomApi: data.usePersonalSettings,
        apiType: data.apiType,
        hasApiKey: !!data.apiKey,
        hasLangdockApiKey: !!data.langdockApiKey,
        hasGeminiApiKey: !!data.geminiApiKey,
        hasHuggingfaceApiKey: !!data.huggingfaceApiKey,
        hasOpenRouterApiKey: !!data.openRouterApiKey,
      });

      const newSettings = {
        apiKey: data.apiKey || '',
        baseUrl: data.baseUrl || 'https://api.anthropic.com',
        usePersonalSettings: data.usePersonalSettings === true, // Явно преобразуем в boolean
        apiType: data.apiType || 'openrouter',
        langdockApiKey: data.langdockApiKey || '',
        langdockAssistantId: data.langdockAssistantId || '',
        langdockBaseUrl:
          data.langdockBaseUrl ||
          'https://api.langdock.com/assistant/v1/chat/completions',
        langdockRegion: data.langdockRegion || 'eu',
        geminiApiKey: data.geminiApiKey || '',
        geminiModel: data.geminiModel || 'gemini-1.5-pro',
        geminiBaseUrl:
          data.geminiBaseUrl || 'https://generativelanguage.googleapis.com',
        geminiTemperature: data.geminiTemperature || 0.7,
        huggingfaceApiKey: data.huggingfaceApiKey || '',
        huggingfaceModel:
          data.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
        huggingfaceBaseUrl:
          data.huggingfaceBaseUrl ||
          'https://api-inference.huggingface.co/models',
        huggingfaceTemperature: data.huggingfaceTemperature || 0.7,
        huggingfaceMaxTokens: data.huggingfaceMaxTokens || 4000,
        openRouterApiKey: data.openRouterApiKey || '',
        openRouterModel: data.openRouterModel || 'google/gemma-3-12b-it:free',
        openRouterBaseUrl:
          data.openRouterBaseUrl || 'https://openrouter.ai/api/v1',
        openRouterTemperature: data.openRouterTemperature || 0.7,
        openRouterMaxTokens: data.openRouterMaxTokens || 4000,
      };

      console.log('Установка настроек в состояние компонента:', {
        usePersonalSettings: newSettings.usePersonalSettings,
        apiType: newSettings.apiType,
        hasApiKey: !!newSettings.apiKey,
        hasLangdockApiKey: !!newSettings.langdockApiKey,
        hasGeminiApiKey: !!newSettings.geminiApiKey,
        hasHuggingfaceApiKey: !!newSettings.huggingfaceApiKey,
        hasOpenRouterApiKey: !!newSettings.openRouterApiKey,
      });

      setSettings(newSettings);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке настроек API:', err);
      setError(
        'Не удалось загрузить настройки API. Пожалуйста, попробуйте позже.'
      );
      setLoading(false);
    }
  };

  // Загружаем настройки при монтировании компонента
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  // Обработчик изменения настроек
  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      console.log('Отправка настроек API на сервер, текущие настройки:', {
        usePersonalSettings: settings.usePersonalSettings,
        apiType: settings.apiType,
        hasApiKey: !!settings.apiKey,
        hasLangdockApiKey: !!settings.langdockApiKey,
        hasGeminiApiKey: !!settings.geminiApiKey,
        hasHuggingfaceApiKey: !!settings.huggingfaceApiKey,
        hasOpenRouterApiKey: !!settings.openRouterApiKey,
      });

      // Преобразуем поле usePersonalSettings в useCustomApi для API
      // и подготавливаем данные в зависимости от выбранного типа API
      const apiData = {
        useCustomApi: settings.usePersonalSettings === true, // Явно преобразуем в boolean
        apiType: settings.apiType,
      };

      // Добавляем соответствующие поля в зависимости от типа API
      if (settings.apiType === 'anthropic') {
        apiData.apiKey = settings.apiKey;
        apiData.baseUrl = settings.baseUrl;
      } else if (settings.apiType === 'langdock') {
        apiData.langdockApiKey = settings.langdockApiKey;
        apiData.langdockAssistantId = settings.langdockAssistantId;
        apiData.langdockBaseUrl = settings.langdockBaseUrl;
      } else if (settings.apiType === 'gemini') {
        apiData.geminiApiKey = settings.geminiApiKey;
        apiData.geminiModel = settings.geminiModel;
        apiData.geminiBaseUrl = settings.geminiBaseUrl;
        apiData.geminiTemperature = settings.geminiTemperature;
      } else if (settings.apiType === 'huggingface') {
        apiData.huggingfaceApiKey = settings.huggingfaceApiKey;
        apiData.huggingfaceModel = settings.huggingfaceModel;
        apiData.huggingfaceBaseUrl = settings.huggingfaceBaseUrl;
        apiData.huggingfaceTemperature = settings.huggingfaceTemperature;
        apiData.huggingfaceMaxTokens = settings.huggingfaceMaxTokens;
      } else if (settings.apiType === 'openrouter') {
        console.log('Подготовка данных OpenRouter API для отправки:', {
          hasOpenRouterApiKey: !!settings.openRouterApiKey,
          openRouterModel: settings.openRouterModel,
        });
        apiData.openRouterApiKey = settings.openRouterApiKey;
        apiData.openRouterModel = settings.openRouterModel;
        apiData.openRouterBaseUrl = settings.openRouterBaseUrl;
        apiData.openRouterTemperature = settings.openRouterTemperature;
        apiData.openRouterMaxTokens = settings.openRouterMaxTokens;
      }

      console.log('Подготовленные данные для отправки на сервер:', {
        useCustomApi: apiData.useCustomApi,
        apiType: apiData.apiType,
        hasApiKey: !!apiData.apiKey,
        hasLangdockApiKey: !!apiData.langdockApiKey,
        hasGeminiApiKey: !!apiData.geminiApiKey,
        hasHuggingfaceApiKey: !!apiData.huggingfaceApiKey,
        hasOpenRouterApiKey: !!apiData.openRouterApiKey,
      });

      const response = await fetch('/api/user/api-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      // Парсим JSON ответ независимо от статуса
      const data = await response.json();

      if (!response.ok) {
        // Используем сообщение об ошибке из API, если доступно
        const errorMessage =
          data.message || data.error || 'Ошибка при сохранении настроек API';

        // Специальная обработка для 401 ошибки
        if (response.status === 401) {
          throw new Error('Необходима авторизация для сохранения настроек API');
        }

        throw new Error(errorMessage);
      }
      console.log('Ответ сервера после сохранения настроек:', data);
      showSuccess(data.message || 'Настройки API успешно сохранены');

      // После успешного сохранения обновляем настройки из ответа сервера
      if (data.settings) {
        console.log('Обновление настроек из ответа сервера:', {
          usePersonalSettings: data.settings.usePersonalSettings,
          apiType: data.settings.apiType,
          hasApiKey: !!data.settings.apiKey,
          hasLangdockApiKey: !!data.settings.langdockApiKey,
          hasGeminiApiKey: !!data.settings.geminiApiKey,
          hasHuggingfaceApiKey: !!data.settings.huggingfaceApiKey,
          hasOpenRouterApiKey: !!data.settings.openRouterApiKey,
        });

        setSettings({
          apiKey: data.settings.apiKey || '',
          baseUrl: data.settings.baseUrl || 'https://api.anthropic.com',
          usePersonalSettings: data.settings.usePersonalSettings === true, // Явно преобразуем в boolean
          apiType: data.settings.apiType || 'openrouter',
          langdockApiKey: data.settings.langdockApiKey || '',
          langdockAssistantId: data.settings.langdockAssistantId || '',
          langdockBaseUrl:
            data.settings.langdockBaseUrl ||
            'https://api.langdock.com/assistant/v1/chat/completions',
          langdockRegion: data.settings.langdockRegion || 'eu',
          geminiApiKey: data.settings.geminiApiKey || '',
          geminiModel: data.settings.geminiModel || 'gemini-1.5-pro',
          geminiBaseUrl:
            data.settings.geminiBaseUrl ||
            'https://generativelanguage.googleapis.com',
          geminiTemperature: data.settings.geminiTemperature || 0.7,
          huggingfaceApiKey: data.settings.huggingfaceApiKey || '',
          huggingfaceModel:
            data.settings.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
          huggingfaceBaseUrl:
            data.settings.huggingfaceBaseUrl ||
            'https://api-inference.huggingface.co/models',
          huggingfaceTemperature: data.settings.huggingfaceTemperature || 0.7,
          huggingfaceMaxTokens: data.settings.huggingfaceMaxTokens || 4000,
          openRouterApiKey: data.settings.openRouterApiKey || '',
          openRouterModel:
            data.settings.openRouterModel || 'google/gemma-3-12b-it:free',
          openRouterBaseUrl:
            data.settings.openRouterBaseUrl || 'https://openrouter.ai/api/v1',
          openRouterTemperature: data.settings.openRouterTemperature || 0.7,
          openRouterMaxTokens: data.settings.openRouterMaxTokens || 4000,
        });
      }

      setSaving(false);
    } catch (err) {
      console.error('Ошибка при сохранении настроек API:', err);
      setError(
        'Не удалось сохранить настройки API. Пожалуйста, попробуйте позже.'
      );
      showError('Ошибка при сохранении настроек API');
      setSaving(false);
    }
  };

  // Если статус загрузки или пользователь не авторизован, показываем загрузку
  if (status === 'loading' || status === 'unauthenticated') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Настройки API | Тренер собеседований</title>
        <meta
          name="description"
          content="Управление персональными API ключами и настройками"
        />
      </Head>

      <h1 className={styles.title}>Настройки API</h1>

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
        <div className={styles.contentContainer}>
          <div className={styles.infoCard}>
            <h2 className={styles.infoCardTitle}>Персональные настройки API</h2>
            <p className={styles.infoCardText}>
              Здесь вы можете настроить персональные API ключи и базовый URL для
              сервиса interview. Эти настройки будут использоваться только для
              вашей учетной записи.
            </p>
          </div>

          <ApiSettingsForm
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onSubmit={handleSubmit}
            saving={saving}
          />
        </div>
      )}

      <div className={styles.backButtonContainer}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/mock-interviews')}
        >
          Вернуться к собеседованиям
        </button>
      </div>
    </div>
  );
}
