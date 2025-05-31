import { useState, useEffect } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/user/AuthSettings.module.css';

export default function AuthSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [settings, setSettings] = useState({
    enableEmailAuth: true,
    enableGoogleAuth: true,
    enableGithubAuth: true,
    enableCredentialsAuth: true,
    requireTwoFactor: false,
    sessionTimeout: 24,
  });

  // Перенаправление неавторизованных пользователей
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    if (session?.user?.id) {
      loadSettings();
    }
  }, [session]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/auth-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      } else {
        setError(data.error || 'Ошибка при загрузке настроек');
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
      setError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Очищаем сообщения при изменении настроек
    setMessage('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Проверяем, что хотя бы один способ входа включен
    const {
      enableEmailAuth,
      enableGoogleAuth,
      enableGithubAuth,
      enableCredentialsAuth,
    } = settings;
    if (
      !enableEmailAuth &&
      !enableGoogleAuth &&
      !enableGithubAuth &&
      !enableCredentialsAuth
    ) {
      setError('Необходимо оставить включенным хотя бы один способ входа');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch('/api/user/auth-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Настройки успешно сохранены');
        setSettings(data.data);
      } else {
        setError(data.error || 'Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      setError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className={styles.loading}>Загрузка настроек...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Настройки аутентификации - Сервис собеседований</title>
        <meta name="description" content="Настройки способов входа в систему" />
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Настройки аутентификации</h1>
          <p>Управляйте способами входа в вашу учетную запись</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Способы входа */}
          <div className={styles.section}>
            <h2>Способы входа</h2>
            <p className={styles.sectionDescription}>
              Выберите, какие способы входа будут доступны для вашей учетной
              записи. Хотя бы один способ должен оставаться включенным.
            </p>

            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={settings.enableEmailAuth}
                  onChange={(e) =>
                    handleSettingChange('enableEmailAuth', e.target.checked)
                  }
                />
                <div className={styles.checkboxText}>
                  <strong>Магические ссылки (Email)</strong>
                  <small>Вход через ссылку, отправленную на email</small>
                </div>
              </label>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={settings.enableGoogleAuth}
                  onChange={(e) =>
                    handleSettingChange('enableGoogleAuth', e.target.checked)
                  }
                />
                <div className={styles.checkboxText}>
                  <strong>Google OAuth</strong>
                  <small>Вход через учетную запись Google</small>
                </div>
              </label>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={settings.enableGithubAuth}
                  onChange={(e) =>
                    handleSettingChange('enableGithubAuth', e.target.checked)
                  }
                />
                <div className={styles.checkboxText}>
                  <strong>GitHub OAuth</strong>
                  <small>Вход через учетную запись GitHub</small>
                </div>
              </label>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={settings.enableCredentialsAuth}
                  onChange={(e) =>
                    handleSettingChange(
                      'enableCredentialsAuth',
                      e.target.checked
                    )
                  }
                />
                <div className={styles.checkboxText}>
                  <strong>Логин и пароль</strong>
                  <small>Традиционный вход по email/логину и паролю</small>
                </div>
              </label>
            </div>
          </div>

          {/* Настройки безопасности */}
          <div className={styles.section}>
            <h2>Настройки безопасности</h2>
            <p className={styles.sectionDescription}>
              Дополнительные параметры безопасности для вашей учетной записи.
            </p>

            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={settings.requireTwoFactor}
                  onChange={(e) =>
                    handleSettingChange('requireTwoFactor', e.target.checked)
                  }
                />
                <div className={styles.checkboxText}>
                  <strong>Двухфакторная аутентификация</strong>
                  <small>
                    Требовать дополнительное подтверждение при входе (в
                    разработке)
                  </small>
                </div>
              </label>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.inputLabel}>
                <span>Время жизни сессии</span>
                <small>
                  Через сколько часов потребуется повторный вход (от 1 до 168
                  часов)
                </small>
                <input
                  type="number"
                  className={styles.numberInput}
                  min="1"
                  max="168"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    handleSettingChange(
                      'sessionTimeout',
                      parseInt(e.target.value) || 24
                    )
                  }
                />
              </label>
            </div>
          </div>

          {/* Сообщения */}
          {message && <div className={styles.message}>{message}</div>}

          {error && <div className={styles.error}>{error}</div>}

          {/* Кнопка сохранения */}
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Проверка авторизации на стороне сервера
export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}
