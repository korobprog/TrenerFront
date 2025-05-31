import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/user/Profile.module.css';

export default function ChangePassword() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const { showSuccess, showError } = useNotification();

  // Перенаправляем на страницу входа, если пользователь не авторизован
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Обработка изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Валидация формы
  const validateForm = () => {
    if (!formData.currentPassword) {
      showError('Введите текущий пароль');
      return false;
    }

    if (!formData.newPassword) {
      showError('Введите новый пароль');
      return false;
    }

    if (formData.newPassword.length < 6) {
      showError('Новый пароль должен содержать минимум 6 символов');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showError('Пароли не совпадают');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      showError('Новый пароль должен отличаться от текущего');
      return false;
    }

    return true;
  };

  // Обработка отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Пароль успешно изменен');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        // Перенаправляем обратно в профиль через 2 секунды
        setTimeout(() => {
          router.push('/user/profile');
        }, 2000);
      } else {
        showError(data.error || 'Ошибка при изменении пароля');
      }
    } catch (error) {
      console.error('Ошибка при изменении пароля:', error);
      showError('Ошибка при изменении пароля');
    } finally {
      setIsLoading(false);
    }
  };

  // Если пользователь не авторизован, показываем сообщение о загрузке
  if (status === 'loading' || status === 'unauthenticated') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Изменение пароля | Тренер собеседований</title>
        <meta name="description" content="Изменение пароля пользователя" />
      </Head>

      <div className={styles.header}>
        <h1 className={styles.title}>Изменение пароля</h1>
        <p className={styles.subtitle}>
          Обновите пароль для вашей учетной записи
        </p>
      </div>

      <div className={styles.profileContent}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Смена пароля</h3>
            <p className={styles.sectionDescription}>
              Введите текущий пароль и новый пароль для изменения
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.editForm}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Текущий пароль:</label>
              <input
                type="password"
                name="currentPassword"
                className={styles.textInput}
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Введите текущий пароль"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Новый пароль:</label>
              <input
                type="password"
                name="newPassword"
                className={styles.textInput}
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Введите новый пароль (минимум 6 символов)"
                required
                minLength="6"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Подтвердите новый пароль:
              </label>
              <input
                type="password"
                name="confirmPassword"
                className={styles.textInput}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Повторите новый пароль"
                required
              />
            </div>

            <div className={styles.sectionActions}>
              <button
                type="submit"
                className={styles.actionButton}
                disabled={isLoading}
              >
                {isLoading ? 'Изменение...' : 'Изменить пароль'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push('/user/profile')}
                disabled={isLoading}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>

        {/* Информация о безопасности */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Рекомендации по безопасности
            </h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.securityTips}>
              <ul className={styles.tipsList}>
                <li>Используйте пароль длиной не менее 8 символов</li>
                <li>Включите в пароль буквы, цифры и специальные символы</li>
                <li>Не используйте личную информацию в пароле</li>
                <li>Не используйте один и тот же пароль на разных сайтах</li>
                <li>Регулярно меняйте пароль</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Серверная проверка авторизации
export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Если пользователь не авторизован, перенаправляем на страницу входа
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
