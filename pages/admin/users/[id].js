import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/AdminLayout';
import UserDetails from '../../../components/admin/UserDetails';
import UserForm from '../../../components/admin/UserForm';
import { useNotification } from '../../../contexts/NotificationContext';
import styles from '../../../styles/admin/UserDetails.module.css';

/**
 * Страница с детальной информацией о пользователе в административной панели
 * @returns {JSX.Element} Страница с детальной информацией о пользователе
 */
export default function UserDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showError, showSuccess } = useNotification();

  // Состояние для хранения данных пользователя
  const [user, setUser] = useState(null);

  // Состояние для отслеживания загрузки данных
  const [loading, setLoading] = useState(true);

  // Состояние для отслеживания режима редактирования
  const [isEditing, setIsEditing] = useState(false);

  // Загрузка данных пользователя при изменении ID
  useEffect(() => {
    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  // Функция для загрузки детальной информации о пользователе
  const fetchUserDetails = async () => {
    try {
      setLoading(true);

      // Выполняем запрос к API
      const response = await fetch(`/api/admin/users/${id}`);

      if (!response.ok) {
        throw new Error('Ошибка при получении информации о пользователе');
      }

      const userData = await response.json();

      // Обновляем состояние
      setUser(userData);
    } catch (error) {
      console.error('Ошибка при загрузке данных пользователя:', error);
      showError('Не удалось загрузить информацию о пользователе');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик обновления пользователя
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    setIsEditing(false);
  };

  // Обработчик отмены редактирования
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Обработчик перехода в режим редактирования
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Обработчик возврата к списку пользователей
  const handleBackToList = () => {
    router.push('/admin/users');
  };

  return (
    <AdminLayout>
      <Head>
        <title>
          {user ? `${user.name} | Пользователь` : 'Информация о пользователе'} |
          Админ-панель
        </title>
      </Head>

      <div className={styles.userDetailsPageContainer}>
        <div className={styles.pageHeader}>
          <button className={styles.backButton} onClick={handleBackToList}>
            ← Назад к списку
          </button>
          <h1 className={styles.pageTitle}>
            {user ? `Пользователь: ${user.name}` : 'Информация о пользователе'}
          </h1>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Загрузка информации о пользователе...</p>
          </div>
        ) : user ? (
          <div className={styles.userContentContainer}>
            {isEditing ? (
              <UserForm
                user={user}
                onUpdate={handleUserUpdate}
                onCancel={handleCancelEdit}
              />
            ) : (
              <UserDetails user={user} onEdit={handleEdit} />
            )}
          </div>
        ) : (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>
              Пользователь не найден или произошла ошибка при загрузке данных
            </p>
            <button className={styles.retryButton} onClick={fetchUserDetails}>
              Повторить попытку
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
