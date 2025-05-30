import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../styles/user/AuthSettings.module.css';

export default function AuthSettingsManager({ onSettingsChange }) {
  const { data: session } = useSession();
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

  useEffect(() => {
    if (session) {
      fetchAuthSettings();
    }
  }, [session]);

  const fetchAuthSettings = async () => {
    try {
      const response = await fetch('/api/user/auth-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        if (onSettingsChange) {
          onSettingsChange(data);
        }
      } else {
        setError('Ошибка при загрузке настроек');
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
      setError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

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
      setError('Должен быть включен хотя бы один способ входа');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/user/auth-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Настройки успешно сохранены');
        if (onSettingsChange) {
          onSettingsChange(data.authSettings);
        }
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      setError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка настроек...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.section}>
        <h3>Способы входа</h3>
        <p className={styles.sectionDescription}>
          Выберите, какие способы входа будут доступны для вашей учетной записи
        </p>

        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableEmailAuth}
              onChange={(e) =>
                handleChange('enableEmailAuth', e.target.checked)
              }
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              <strong>Вход по email (магические ссылки)</strong>
              <small>Получайте ссылки для входа на ваш email</small>
            </span>
          </label>
        </div>

        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableGoogleAuth}
              onChange={(e) =>
                handleChange('enableGoogleAuth', e.target.checked)
              }
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              <strong>Вход через Google</strong>
              <small>Используйте ваш Google аккаунт для входа</small>
            </span>
          </label>
        </div>

        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableGithubAuth}
              onChange={(e) =>
                handleChange('enableGithubAuth', e.target.checked)
              }
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              <strong>Вход через GitHub</strong>
              <small>Используйте ваш GitHub аккаунт для входа</small>
            </span>
          </label>
        </div>

        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableCredentialsAuth}
              onChange={(e) =>
                handleChange('enableCredentialsAuth', e.target.checked)
              }
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              <strong>Вход по логину и паролю</strong>
              <small>Классический способ входа с логином и паролем</small>
            </span>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Настройки безопасности</h3>

        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.requireTwoFactor}
              onChange={(e) =>
                handleChange('requireTwoFactor', e.target.checked)
              }
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              <strong>Двухфакторная аутентификация</strong>
              <small>Дополнительная защита вашей учетной записи</small>
            </span>
          </label>
        </div>

        <div className={styles.settingGroup}>
          <label className={styles.inputLabel}>
            <span>Время жизни сессии (часы)</span>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.sessionTimeout}
              onChange={(e) =>
                handleChange('sessionTimeout', parseInt(e.target.value))
              }
              className={styles.numberInput}
            />
            <small>От 1 до 168 часов (7 дней)</small>
          </label>
        </div>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button type="submit" disabled={saving} className={styles.saveButton}>
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </form>
  );
}
