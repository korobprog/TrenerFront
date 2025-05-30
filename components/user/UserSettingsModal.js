import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/user/UserSettingsModal.module.css';

/**
 * Модальное окно настроек пользователя
 * @param {Object} props - Пропсы компонента
 * @param {boolean} props.isOpen - Открыто ли модальное окно
 * @param {Function} props.onClose - Функция закрытия модального окна
 * @returns {JSX.Element} Компонент модального окна настроек
 */
export default function UserSettingsModal({ isOpen, onClose }) {
  const { data: session } = useSession();
  const { showSuccess, showError } = useNotification();

  // Состояние активной вкладки
  const [activeTab, setActiveTab] = useState('profile');

  // Состояние загрузки
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Состояние настроек профиля
  const [profileSettings, setProfileSettings] = useState({
    name: '',
    email: '',
    avatar: null,
    avatarPreview: null,
    avatarUrl: '',
  });

  // Состояние загрузки аватарки
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Состояние смены пароля
  const [passwordSettings, setPasswordSettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Состояние настроек авторизации
  const [authSettings, setAuthSettings] = useState({
    enableEmailAuth: true,
    enableGoogleAuth: true,
    enableGithubAuth: true,
    enableCredentialsAuth: true,
    requireTwoFactor: false,
    sessionTimeout: 24,
  });

  // Состояние настроек API
  const [apiSettings, setApiSettings] = useState({
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    usePersonalSettings: false,
    apiType: 'anthropic',
    langdockApiKey: '',
    langdockAssistantId: '',
    langdockBaseUrl: 'https://api.langdock.com/assistant/v1/chat/completions',
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

  // Загрузка настроек при открытии модального окна
  useEffect(() => {
    if (isOpen && session?.user) {
      loadUserSettings();
    }
  }, [isOpen, session]);

  // Инициализация настроек профиля из сессии
  useEffect(() => {
    if (session?.user) {
      setProfileSettings((prev) => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || '',
        avatarPreview: session.user.image || null,
      }));

      // Автоматически генерируем дефолтную аватарку если её нет
      if (!session.user.image) {
        console.log('🎨 Автоматическая генерация дефолтной аватарки...');
        generateDefaultAvatar();
      }
    }
  }, [session]);

  // Функция автоматической генерации дефолтной аватарки
  const generateDefaultAvatar = async () => {
    try {
      console.log('🎨 Генерируем дефолтную аватарку автоматически...');

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          name: session?.user?.name || session?.user?.email || 'User',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.avatarUrl) {
          console.log('✅ Дефолтная аватарка сгенерирована:', data.avatarUrl);
          setProfileSettings((prev) => ({
            ...prev,
            avatarPreview: data.avatarUrl,
          }));
        }
      } else {
        console.log('⚠️ Не удалось сгенерировать дефолтную аватарку');
      }
    } catch (error) {
      console.error('❌ Ошибка при автоматической генерации аватарки:', error);
    }
  };

  // Загрузка всех настроек пользователя
  const loadUserSettings = async () => {
    setLoading(true);
    try {
      // Загружаем настройки авторизации
      const authResponse = await fetch('/api/user/auth-settings');
      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.success) {
          setAuthSettings(authData.data);
        }
      }

      // Загружаем настройки API
      const apiResponse = await fetch('/api/user/api-settings');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setApiSettings({
          apiKey: apiData.apiKey || '',
          baseUrl: apiData.baseUrl || 'https://api.anthropic.com',
          usePersonalSettings: apiData.usePersonalSettings === true,
          apiType: apiData.apiType || 'anthropic',
          langdockApiKey: apiData.langdockApiKey || '',
          langdockAssistantId: apiData.langdockAssistantId || '',
          langdockBaseUrl:
            apiData.langdockBaseUrl ||
            'https://api.langdock.com/assistant/v1/chat/completions',
          langdockRegion: apiData.langdockRegion || 'eu',
          geminiApiKey: apiData.geminiApiKey || '',
          geminiModel: apiData.geminiModel || 'gemini-1.5-pro',
          geminiBaseUrl:
            apiData.geminiBaseUrl ||
            'https://generativelanguage.googleapis.com',
          geminiTemperature: apiData.geminiTemperature || 0.7,
          huggingfaceApiKey: apiData.huggingfaceApiKey || '',
          huggingfaceModel:
            apiData.huggingfaceModel || 'meta-llama/Llama-2-7b-chat-hf',
          huggingfaceBaseUrl:
            apiData.huggingfaceBaseUrl ||
            'https://api-inference.huggingface.co/models',
          huggingfaceTemperature: apiData.huggingfaceTemperature || 0.7,
          huggingfaceMaxTokens: apiData.huggingfaceMaxTokens || 4000,
          openRouterApiKey: apiData.openRouterApiKey || '',
          openRouterModel:
            apiData.openRouterModel || 'google/gemma-3-12b-it:free',
          openRouterBaseUrl:
            apiData.openRouterBaseUrl || 'https://openrouter.ai/api/v1',
          openRouterTemperature: apiData.openRouterTemperature || 0.7,
          openRouterMaxTokens: apiData.openRouterMaxTokens || 4000,
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
      showError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик загрузки аватарки
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        showError('Размер файла не должен превышать 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileSettings((prev) => ({
          ...prev,
          avatar: file,
          avatarPreview: e.target.result,
          avatarUrl: '', // Очищаем URL при загрузке файла
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Обработчик изменения URL аватарки
  const handleAvatarUrlChange = (e) => {
    const url = e.target.value;
    setProfileSettings((prev) => ({
      ...prev,
      avatarUrl: url,
      avatar: null, // Очищаем файл при вводе URL
      avatarPreview: url || prev.avatarPreview,
    }));
  };

  // Обработчик генерации аватарки
  const handleGenerateAvatar = async () => {
    setAvatarLoading(true);
    try {
      console.log('🎨 Начинаем генерацию аватарки...');
      console.log('📝 Данные для генерации:', {
        name: profileSettings.name || session?.user?.name || 'User',
        method: 'POST',
        action: 'generate',
      });

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          name: profileSettings.name || session?.user?.name || 'User',
        }),
      });

      console.log('📡 Ответ сервера:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Данные ответа:', data);
        if (data.success && data.avatarUrl) {
          setProfileSettings((prev) => ({
            ...prev,
            avatarPreview: data.avatarUrl,
            avatarUrl: data.avatarUrl,
            avatar: null,
          }));
          showSuccess('Аватарка успешно сгенерирована');
        } else {
          throw new Error(data.error || 'Ошибка при генерации аватарки');
        }
      } else {
        const data = await response.json();
        console.error('❌ Ошибка сервера:', data);
        throw new Error(data.error || 'Ошибка при генерации аватарки');
      }
    } catch (error) {
      console.error('❌ Ошибка при генерации аватарки:', error);
      showError(error.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  // Обработчик сохранения аватарки
  const handleSaveAvatar = async () => {
    setAvatarLoading(true);
    try {
      let response;

      if (profileSettings.avatar) {
        // Загружаем файл
        const formData = new FormData();
        formData.append('avatar', profileSettings.avatar);
        formData.append('action', 'upload');

        response = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        });
      } else if (profileSettings.avatarUrl) {
        // Сохраняем URL
        response = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'url',
            avatarUrl: profileSettings.avatarUrl,
          }),
        });
      } else {
        showError('Выберите файл или введите URL аватарки');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showSuccess('Аватарка успешно сохранена');
          // Обновляем сессию
          window.location.reload();
        } else {
          throw new Error(data.error || 'Ошибка при сохранении аватарки');
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении аватарки');
      }
    } catch (error) {
      console.error('Ошибка при сохранении аватарки:', error);
      showError(error.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  // Обработчик сохранения профиля (только имя)
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileSettings.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Профиль успешно обновлен');
        // Обновляем сессию
        window.location.reload();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении профиля');
      }
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Обработчик смены пароля
  const handleChangePassword = async () => {
    if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
      showError('Пароли не совпадают');
      return;
    }

    if (passwordSettings.newPassword.length < 6) {
      showError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordSettings.currentPassword,
          newPassword: passwordSettings.newPassword,
        }),
      });

      if (response.ok) {
        showSuccess('Пароль успешно изменен');
        setPasswordSettings({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при смене пароля');
      }
    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Обработчик сохранения настроек авторизации
  const handleSaveAuthSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/auth-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authSettings),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Настройки авторизации сохранены');
        setAuthSettings(data.data);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек авторизации:', error);
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Обработчик сохранения настроек API
  const handleSaveApiSettings = async () => {
    setSaving(true);
    try {
      const apiData = {
        useCustomApi: apiSettings.usePersonalSettings,
        apiType: apiSettings.apiType,
      };

      // Добавляем соответствующие поля в зависимости от типа API
      if (apiSettings.apiType === 'anthropic') {
        apiData.apiKey = apiSettings.apiKey;
        apiData.baseUrl = apiSettings.baseUrl;
      } else if (apiSettings.apiType === 'langdock') {
        apiData.langdockApiKey = apiSettings.langdockApiKey;
        apiData.langdockAssistantId = apiSettings.langdockAssistantId;
        apiData.langdockBaseUrl = apiSettings.langdockBaseUrl;
      } else if (apiSettings.apiType === 'gemini') {
        apiData.geminiApiKey = apiSettings.geminiApiKey;
        apiData.geminiModel = apiSettings.geminiModel;
        apiData.geminiBaseUrl = apiSettings.geminiBaseUrl;
        apiData.geminiTemperature = apiSettings.geminiTemperature;
      } else if (apiSettings.apiType === 'huggingface') {
        apiData.huggingfaceApiKey = apiSettings.huggingfaceApiKey;
        apiData.huggingfaceModel = apiSettings.huggingfaceModel;
        apiData.huggingfaceBaseUrl = apiSettings.huggingfaceBaseUrl;
        apiData.huggingfaceTemperature = apiSettings.huggingfaceTemperature;
        apiData.huggingfaceMaxTokens = apiSettings.huggingfaceMaxTokens;
      } else if (apiSettings.apiType === 'openrouter') {
        apiData.openRouterApiKey = apiSettings.openRouterApiKey;
        apiData.openRouterModel = apiSettings.openRouterModel;
        apiData.openRouterBaseUrl = apiSettings.openRouterBaseUrl;
        apiData.openRouterTemperature = apiSettings.openRouterTemperature;
        apiData.openRouterMaxTokens = apiSettings.openRouterMaxTokens;
      }

      const response = await fetch('/api/user/api-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Настройки API сохранены');
      } else {
        throw new Error('Ошибка при сохранении настроек API');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек API:', error);
      showError('Ошибка при сохранении настроек API');
    } finally {
      setSaving(false);
    }
  };

  // Обработчик закрытия модального окна
  const handleClose = () => {
    setActiveTab('profile');
    setPasswordSettings({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    // Сбрасываем состояние аватарки
    setProfileSettings((prev) => ({
      ...prev,
      avatar: null,
      avatarUrl: '',
      avatarPreview: session?.user?.image || null,
    }));
    onClose();
  };

  // Обработчик клика по оверлею
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Настройки пользователя</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {/* Вкладки */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                activeTab === 'profile' ? styles.active : ''
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Профиль
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === 'password' ? styles.active : ''
              }`}
              onClick={() => setActiveTab('password')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <circle cx="12" cy="16" r="1"></circle>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Пароль
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === 'auth' ? styles.active : ''
              }`}
              onClick={() => setActiveTab('auth')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1h1z"></path>
              </svg>
              Авторизация
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === 'api' ? styles.active : ''
              }`}
              onClick={() => setActiveTab('api')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              API
            </button>
            {(session?.user?.role === 'admin' ||
              session?.user?.role === 'superadmin') && (
              <button
                className={`${styles.tab} ${
                  activeTab === 'admin' ? styles.active : ''
                }`}
                onClick={() => setActiveTab('admin')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path>
                </svg>
                Админ
              </button>
            )}
          </div>

          {/* Содержимое вкладок */}
          <div className={styles.tabContent}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Загрузка настроек...</p>
              </div>
            ) : (
              <>
                {/* Вкладка профиля */}
                {activeTab === 'profile' && (
                  <div className={styles.section}>
                    <h3>Настройки профиля</h3>

                    <div className={styles.avatarSection}>
                      <div className={styles.avatarContainer}>
                        {profileSettings.avatarPreview ? (
                          <img
                            src={profileSettings.avatarPreview}
                            alt="Аватар"
                            className={styles.avatar}
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {profileSettings.name
                              ? profileSettings.name[0]
                              : 'U'}
                          </div>
                        )}
                        <label className={styles.avatarUpload}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className={styles.avatarInput}
                            disabled={avatarLoading}
                          />
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                          {avatarLoading ? 'Загрузка...' : 'Загрузить файл'}
                        </label>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>URL аватарки</label>
                      <input
                        type="url"
                        value={profileSettings.avatarUrl}
                        onChange={handleAvatarUrlChange}
                        className={styles.input}
                        placeholder="https://example.com/avatar.jpg"
                        disabled={avatarLoading}
                      />
                      <small className={styles.hint}>
                        Введите URL изображения или загрузите файл выше
                      </small>
                    </div>

                    <div className={styles.avatarActions}>
                      <button
                        onClick={handleGenerateAvatar}
                        disabled={avatarLoading}
                        className={styles.generateButton}
                      >
                        {avatarLoading
                          ? 'Генерация...'
                          : '🎨 Сгенерировать аватарку'}
                      </button>
                      <button
                        onClick={handleSaveAvatar}
                        disabled={
                          avatarLoading ||
                          (!profileSettings.avatar &&
                            !profileSettings.avatarUrl)
                        }
                        className={styles.saveAvatarButton}
                      >
                        {avatarLoading
                          ? 'Сохранение...'
                          : '💾 Сохранить аватарку'}
                      </button>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Имя</label>
                      <input
                        type="text"
                        value={profileSettings.name}
                        onChange={(e) =>
                          setProfileSettings((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={styles.input}
                        placeholder="Введите ваше имя"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email</label>
                      <input
                        type="email"
                        value={profileSettings.email}
                        disabled
                        className={`${styles.input} ${styles.disabled}`}
                      />
                      <small className={styles.hint}>
                        Email нельзя изменить
                      </small>
                    </div>

                    <div className={styles.actions}>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className={styles.saveButton}
                      >
                        {saving ? 'Сохранение...' : 'Сохранить профиль'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Вкладка смены пароля */}
                {activeTab === 'password' && (
                  <div className={styles.section}>
                    <h3>Безопасность</h3>

                    <div className={styles.infoBlock}>
                      <h4>Смена пароля</h4>
                      <p>
                        Пароль должен содержать минимум 6 символов.
                        Рекомендуется использовать комбинацию букв, цифр и
                        специальных символов для повышения безопасности.
                      </p>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Текущий пароль *</label>
                      <input
                        type="password"
                        value={passwordSettings.currentPassword}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        className={styles.input}
                        placeholder="Введите текущий пароль"
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Новый пароль *</label>
                      <input
                        type="password"
                        value={passwordSettings.newPassword}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className={styles.input}
                        placeholder="Введите новый пароль (минимум 6 символов)"
                        minLength="6"
                        required
                      />
                      {passwordSettings.newPassword &&
                        passwordSettings.newPassword.length < 6 && (
                          <small className={styles.error}>
                            Пароль должен содержать минимум 6 символов
                          </small>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Подтверждение нового пароля *
                      </label>
                      <input
                        type="password"
                        value={passwordSettings.confirmPassword}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className={styles.input}
                        placeholder="Повторите новый пароль"
                        required
                      />
                      {passwordSettings.confirmPassword &&
                        passwordSettings.newPassword !==
                          passwordSettings.confirmPassword && (
                          <small className={styles.error}>
                            Пароли не совпадают
                          </small>
                        )}
                    </div>

                    <div className={styles.actions}>
                      <button
                        onClick={handleChangePassword}
                        disabled={
                          saving ||
                          !passwordSettings.currentPassword ||
                          !passwordSettings.newPassword ||
                          !passwordSettings.confirmPassword ||
                          passwordSettings.newPassword.length < 6 ||
                          passwordSettings.newPassword !==
                            passwordSettings.confirmPassword
                        }
                        className={styles.saveButton}
                      >
                        {saving ? 'Изменение...' : '🔒 Изменить пароль'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Вкладка настроек авторизации */}
                {activeTab === 'auth' && (
                  <div className={styles.section}>
                    <h3>Настройки безопасности</h3>

                    <div className={styles.infoBlock}>
                      <h4>Методы авторизации</h4>
                      <p>
                        Настройте доступные методы входа в систему и параметры
                        безопасности.
                      </p>
                    </div>

                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={authSettings.enableEmailAuth}
                          onChange={(e) =>
                            setAuthSettings((prev) => ({
                              ...prev,
                              enableEmailAuth: e.target.checked,
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <div className={styles.checkboxText}>
                          <strong>Авторизация по email</strong>
                          <small>Разрешить вход через email и пароль</small>
                        </div>
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={authSettings.enableGoogleAuth}
                          onChange={(e) =>
                            setAuthSettings((prev) => ({
                              ...prev,
                              enableGoogleAuth: e.target.checked,
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <div className={styles.checkboxText}>
                          <strong>Google OAuth</strong>
                          <small>Разрешить вход через Google аккаунт</small>
                        </div>
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={authSettings.enableGithubAuth}
                          onChange={(e) =>
                            setAuthSettings((prev) => ({
                              ...prev,
                              enableGithubAuth: e.target.checked,
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <div className={styles.checkboxText}>
                          <strong>GitHub OAuth</strong>
                          <small>Разрешить вход через GitHub аккаунт</small>
                        </div>
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={authSettings.requireTwoFactor}
                          onChange={(e) =>
                            setAuthSettings((prev) => ({
                              ...prev,
                              requireTwoFactor: e.target.checked,
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <div className={styles.checkboxText}>
                          <strong>Двухфакторная аутентификация</strong>
                          <small>
                            Требовать дополнительное подтверждение при входе
                          </small>
                        </div>
                      </label>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Время сессии (часы)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={authSettings.sessionTimeout}
                        onChange={(e) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            sessionTimeout: parseInt(e.target.value) || 24,
                          }))
                        }
                        className={styles.input}
                        style={{ width: '120px' }}
                      />
                      <small className={styles.hint}>
                        Время автоматического выхода из системы (от 1 до 168
                        часов)
                      </small>
                    </div>

                    <div className={styles.actions}>
                      <button
                        onClick={handleSaveAuthSettings}
                        disabled={saving}
                        className={styles.saveButton}
                      >
                        {saving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Вкладка настроек API */}
                {activeTab === 'api' && (
                  <div className={styles.section}>
                    <h3>Настройки API ИИ</h3>

                    <div className={styles.infoBlock}>
                      <h4>Персональные настройки API</h4>
                      <p>
                        Настройте собственные API ключи для работы с различными
                        сервисами ИИ. Это позволит использовать ваши лимиты и
                        настройки.
                      </p>
                    </div>

                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={apiSettings.usePersonalSettings}
                          onChange={(e) =>
                            setApiSettings((prev) => ({
                              ...prev,
                              usePersonalSettings: e.target.checked,
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <div className={styles.checkboxText}>
                          <strong>
                            Использовать персональные настройки API
                          </strong>
                          <small>
                            Включить использование собственных API ключей вместо
                            системных
                          </small>
                        </div>
                      </label>
                    </div>

                    {apiSettings.usePersonalSettings && (
                      <>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Тип API</label>
                          <div className={styles.radioGroup}>
                            <label className={styles.radioOption}>
                              <input
                                type="radio"
                                name="apiType"
                                value="anthropic"
                                checked={apiSettings.apiType === 'anthropic'}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    apiType: e.target.value,
                                  }))
                                }
                                className={styles.radioInput}
                              />
                              <span className={styles.radioLabel}>
                                Anthropic Claude
                              </span>
                            </label>
                            <label className={styles.radioOption}>
                              <input
                                type="radio"
                                name="apiType"
                                value="openrouter"
                                checked={apiSettings.apiType === 'openrouter'}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    apiType: e.target.value,
                                  }))
                                }
                                className={styles.radioInput}
                              />
                              <span className={styles.radioLabel}>
                                OpenRouter
                              </span>
                            </label>
                            <label className={styles.radioOption}>
                              <input
                                type="radio"
                                name="apiType"
                                value="gemini"
                                checked={apiSettings.apiType === 'gemini'}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    apiType: e.target.value,
                                  }))
                                }
                                className={styles.radioInput}
                              />
                              <span className={styles.radioLabel}>
                                Google Gemini
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Настройки Anthropic */}
                        {apiSettings.apiType === 'anthropic' && (
                          <>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>
                                API ключ Anthropic
                              </label>
                              <input
                                type="password"
                                value={apiSettings.apiKey}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    apiKey: e.target.value,
                                  }))
                                }
                                className={styles.input}
                                placeholder="sk-ant-..."
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Base URL</label>
                              <input
                                type="url"
                                value={apiSettings.baseUrl}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    baseUrl: e.target.value,
                                  }))
                                }
                                className={styles.input}
                                placeholder="https://api.anthropic.com"
                              />
                            </div>
                          </>
                        )}

                        {/* Настройки OpenRouter */}
                        {apiSettings.apiType === 'openrouter' && (
                          <>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>
                                API ключ OpenRouter
                              </label>
                              <input
                                type="password"
                                value={apiSettings.openRouterApiKey}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    openRouterApiKey: e.target.value,
                                  }))
                                }
                                className={styles.input}
                                placeholder="sk-or-..."
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Модель</label>
                              <input
                                type="text"
                                value={apiSettings.openRouterModel}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    openRouterModel: e.target.value,
                                  }))
                                }
                                className={styles.input}
                                placeholder="google/gemma-3-12b-it:free"
                              />
                            </div>
                          </>
                        )}

                        {/* Настройки Gemini */}
                        {apiSettings.apiType === 'gemini' && (
                          <>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>
                                API ключ Gemini
                              </label>
                              <input
                                type="password"
                                value={apiSettings.geminiApiKey}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    geminiApiKey: e.target.value,
                                  }))
                                }
                                className={styles.input}
                                placeholder="AIza..."
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Модель</label>
                              <select
                                value={apiSettings.geminiModel}
                                onChange={(e) =>
                                  setApiSettings((prev) => ({
                                    ...prev,
                                    geminiModel: e.target.value,
                                  }))
                                }
                                className={styles.select}
                              >
                                <option value="gemini-1.5-pro">
                                  Gemini 1.5 Pro
                                </option>
                                <option value="gemini-1.5-flash">
                                  Gemini 1.5 Flash
                                </option>
                                <option value="gemini-pro">Gemini Pro</option>
                              </select>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    <div className={styles.actions}>
                      <button
                        onClick={handleSaveApiSettings}
                        disabled={saving}
                        className={styles.saveButton}
                      >
                        {saving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Вкладка администрирования */}
                {(session?.user?.role === 'admin' ||
                  session?.user?.role === 'superadmin') &&
                  activeTab === 'admin' && (
                    <div className={styles.section}>
                      <h3>Администрирование</h3>

                      <div className={styles.warningBlock}>
                        <h4>Административные функции</h4>
                        <p>
                          Данный раздел содержит функции администрирования
                          системы. Будьте осторожны при изменении настроек.
                        </p>
                      </div>

                      <div className={styles.infoBlock}>
                        <h4>Быстрые действия</h4>
                        <p>
                          Основные административные функции доступны в панели
                          администратора.
                        </p>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Роль пользователя
                        </label>
                        <input
                          type="text"
                          value={session?.user?.role || 'user'}
                          disabled
                          className={`${styles.input} ${styles.disabled}`}
                        />
                        <small className={styles.hint}>
                          Текущая роль в системе
                        </small>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>ID пользователя</label>
                        <input
                          type="text"
                          value={session?.user?.id || ''}
                          disabled
                          className={`${styles.input} ${styles.disabled}`}
                        />
                        <small className={styles.hint}>
                          Уникальный идентификатор в системе
                        </small>
                      </div>

                      <div className={styles.actions}>
                        <button
                          onClick={() => window.open('/admin', '_blank')}
                          className={styles.saveButton}
                        >
                          Открыть панель администратора
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
