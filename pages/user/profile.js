import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import { useNotification } from '../../contexts/NotificationContext';
import styles from '../../styles/user/Profile.module.css';

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { showSuccess, showError } = useNotification();

  // Перенаправляем на страницу входа, если пользователь не авторизован
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Загружаем профиль пользователя при монтировании компонента
  useEffect(() => {
    if (status === 'authenticated') {
      loadUserProfile();
    }
  }, [status]);

  // Функция для загрузки профиля пользователя
  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.success) {
        setUserProfile(data.data);
        setEditForm({
          name: data.data.name || '',
        });
      } else {
        showError(data.error || 'Не удалось загрузить профиль пользователя');
      }
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
      showError('Не удалось загрузить профиль пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для форматирования даты регистрации
  const formatRegistrationDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Функция для получения инициалов пользователя
  const getUserInitials = (name) => {
    if (!name) return 'П';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Функция для начала редактирования
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditForm({
      name: userProfile?.name || '',
    });
  };

  // Функция для отмены редактирования
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: userProfile?.name || '',
    });
  };

  // Функция для сохранения изменений
  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      showError('Имя не может быть пустым');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserProfile(data.data);
        setIsEditing(false);
        showSuccess('Профиль успешно обновлен');
      } else {
        showError(data.error || 'Ошибка при сохранении профиля');
      }
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      showError('Ошибка при сохранении профиля');
    } finally {
      setIsSaving(false);
    }
  };

  // Функция для изменения пароля
  const handleChangePassword = () => {
    router.push('/user/change-password');
  };

  // Если пользователь не авторизован, показываем сообщение о загрузке
  if (status === 'loading' || status === 'unauthenticated') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Профиль пользователя | Тренер собеседований</title>
        <meta
          name="description"
          content="Профиль пользователя - управление личной информацией и настройками"
        />
      </Head>

      <div className={styles.header}>
        <h1 className={styles.title}>Профиль пользователя</h1>
        <p className={styles.subtitle}>
          Управляйте своей личной информацией и настройками аккаунта
        </p>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Загрузка профиля...</div>
      ) : userProfile ? (
        <div className={styles.profileContent}>
          {/* Основная информация профиля */}
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarContainer}>
                {userProfile.image ? (
                  <img
                    src={userProfile.image}
                    alt="Аватар пользователя"
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getUserInitials(userProfile.name)}
                  </div>
                )}
              </div>
              <div className={styles.profileInfo}>
                <h2 className={styles.userName}>{userProfile.name}</h2>
                <p className={styles.userEmail}>{userProfile.email}</p>
                <span className={styles.userRole}>
                  {userProfile.role === 'admin'
                    ? 'Администратор'
                    : 'Пользователь'}
                </span>
              </div>
            </div>

            <div className={styles.profileStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Дата регистрации:</span>
                <span className={styles.statValue}>
                  {formatRegistrationDate(userProfile.createdAt)}
                </span>
              </div>
              {userProfile.stats && (
                <>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Текущие баллы:</span>
                    <span className={styles.statValue}>
                      {userProfile.stats.currentPoints}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>
                      Всего собеседований:
                    </span>
                    <span className={styles.statValue}>
                      {userProfile.stats.totalInterviews}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>
                      Проведено собеседований:
                    </span>
                    <span className={styles.statValue}>
                      {userProfile.stats.conductedInterviews}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Разделы профиля */}
          <div className={styles.sectionsGrid}>
            {/* Личная информация */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Личная информация</h3>
                <p className={styles.sectionDescription}>
                  Основные данные вашего профиля
                </p>
              </div>
              <div className={styles.sectionContent}>
                {isEditing ? (
                  <div className={styles.editForm}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Имя:</label>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder="Введите ваше имя"
                      />
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Email:</span>
                      <span className={styles.infoValue}>
                        {userProfile.email}
                      </span>
                      <small className={styles.infoNote}>
                        Email нельзя изменить
                      </small>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Имя:</span>
                      <span className={styles.infoValue}>
                        {userProfile.name}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Email:</span>
                      <span className={styles.infoValue}>
                        {userProfile.email}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Роль:</span>
                      <span className={styles.infoValue}>
                        {userProfile.role === 'admin'
                          ? 'Администратор'
                          : userProfile.role === 'superadmin'
                          ? 'Супер-администратор'
                          : 'Пользователь'}
                      </span>
                    </div>
                    {userProfile.lastLoginAt && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>
                          Последний вход:
                        </span>
                        <span className={styles.infoValue}>
                          {formatRegistrationDate(userProfile.lastLoginAt)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className={styles.sectionActions}>
                {isEditing ? (
                  <>
                    <button
                      className={styles.actionButton}
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.actionButton}
                    onClick={handleStartEdit}
                  >
                    Редактировать
                  </button>
                )}
              </div>
            </div>

            {/* Настройки аккаунта */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Настройки аккаунта</h3>
                <p className={styles.sectionDescription}>
                  Управление параметрами вашего аккаунта
                </p>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>Аутентификация</span>
                  <span className={styles.settingDescription}>
                    Настройки способов входа в систему
                  </span>
                </div>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>Уведомления</span>
                  <span className={styles.settingDescription}>
                    Управление email и push уведомлениями
                  </span>
                </div>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>Приватность</span>
                  <span className={styles.settingDescription}>
                    Настройки конфиденциальности данных
                  </span>
                </div>
              </div>
              <div className={styles.sectionActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => router.push('/user/auth-settings')}
                >
                  Настройки входа
                </button>
              </div>
            </div>

            {/* Безопасность */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Безопасность</h3>
                <p className={styles.sectionDescription}>
                  Управление безопасностью вашего аккаунта
                </p>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.securityItem}>
                  <span className={styles.securityLabel}>Пароль</span>
                  <span className={styles.securityStatus}>
                    Последнее изменение: недавно
                  </span>
                </div>
                <div className={styles.securityItem}>
                  <span className={styles.securityLabel}>
                    Двухфакторная аутентификация
                  </span>
                  <span className={styles.securityStatus}>Не настроена</span>
                </div>
                <div className={styles.securityItem}>
                  <span className={styles.securityLabel}>Активные сессии</span>
                  <span className={styles.securityStatus}>
                    1 активная сессия
                  </span>
                </div>
              </div>
              <div className={styles.sectionActions}>
                <button
                  className={styles.actionButton}
                  onClick={handleChangePassword}
                >
                  Изменить пароль
                </button>
              </div>
            </div>
          </div>

          {/* Статистика баллов */}
          {userProfile.stats && userProfile.recentTransactions && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Статистика баллов</h3>
                <p className={styles.sectionDescription}>
                  Ваши баллы и последние транзакции
                </p>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.pointsStats}>
                  <div className={styles.pointsCard}>
                    <span className={styles.pointsLabel}>Текущий баланс</span>
                    <span className={styles.pointsValue}>
                      {userProfile.stats.currentPoints}
                    </span>
                  </div>
                  <div className={styles.pointsCard}>
                    <span className={styles.pointsLabel}>Всего транзакций</span>
                    <span className={styles.pointsValue}>
                      {userProfile.stats.totalTransactions}
                    </span>
                  </div>
                </div>
                {userProfile.recentTransactions.length > 0 && (
                  <div className={styles.recentTransactions}>
                    <h4 className={styles.transactionsTitle}>
                      Последние транзакции
                    </h4>
                    {userProfile.recentTransactions.map(
                      (transaction, index) => (
                        <div key={index} className={styles.transactionItem}>
                          <span className={styles.transactionType}>
                            {transaction.type === 'startup_bonus'
                              ? 'Стартовый бонус'
                              : transaction.type === 'interview_reward'
                              ? 'Награда за собеседование'
                              : transaction.type === 'interview_cost'
                              ? 'Оплата собеседования'
                              : transaction.type}
                          </span>
                          <span
                            className={`${styles.transactionAmount} ${
                              transaction.amount > 0
                                ? styles.positive
                                : styles.negative
                            }`}
                          >
                            {transaction.amount > 0 ? '+' : ''}
                            {transaction.amount}
                          </span>
                          <span className={styles.transactionDate}>
                            {new Date(transaction.createdAt).toLocaleDateString(
                              'ru-RU'
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
              <div className={styles.sectionActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => router.push('/user/points-history')}
                >
                  Полная история
                </button>
              </div>
            </div>
          )}

          {/* Навигация */}
          <div className={styles.navigation}>
            <button
              className={styles.navButton}
              onClick={() => router.push('/user/points-history')}
            >
              История баллов
            </button>
            <button
              className={styles.navButton}
              onClick={() => router.push('/mock-interviews')}
            >
              Собеседования
            </button>
            <button
              className={styles.navButton}
              onClick={() => router.push('/')}
            >
              Главная страница
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.errorState}>
          <p className={styles.errorMessage}>
            Не удалось загрузить профиль пользователя
          </p>
          <button className={styles.retryButton} onClick={loadUserProfile}>
            Попробовать снова
          </button>
        </div>
      )}
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
