import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '../../../../components/admin/AdminLayout';
import AdminForm from '../../../../components/admin/AdminForm';
import { useNotification } from '../../../../contexts/NotificationContext';
import styles from '../../../../styles/admin/UserForm.module.css';

/**
 * Страница редактирования администратора для супер-администратора
 * @returns {JSX.Element} Страница редактирования администратора
 */
export default function EditAdminPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const { showError } = useNotification();

  // Состояние для хранения данных администратора
  const [admin, setAdmin] = useState(null);

  // Состояние для отслеживания загрузки данных
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем, авторизован ли пользователь и имеет ли он роль супер-администратора
  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role !== 'superadmin') {
        router.push('/admin');
      }
    } else if (status === 'unauthenticated') {
      router.push('/admin/superadmin-signin');
    }
  }, [status, session, router]);

  // Загружаем данные администратора при монтировании компонента
  useEffect(() => {
    if (
      id &&
      status === 'authenticated' &&
      session.user.role === 'superadmin'
    ) {
      fetchAdmin();
    }
  }, [id, status, session]);

  // Функция для загрузки данных администратора
  const fetchAdmin = async () => {
    try {
      setIsLoading(true);

      // Отправляем запрос на получение данных администратора
      const response = await fetch(`/api/admin/superadmin/admins/${id}`);

      if (!response.ok) {
        throw new Error('Ошибка при получении данных администратора');
      }

      const data = await response.json();

      // Обновляем состояние
      setAdmin(data.admin);
    } catch (error) {
      console.error('Ошибка при загрузке данных администратора:', error);
      showError('Не удалось загрузить данные администратора');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик обновления администратора
  const handleUpdate = (updatedAdmin) => {
    setAdmin(updatedAdmin);
  };

  // Обработчик отмены редактирования
  const handleCancel = () => {
    router.push('/admin/superadmin/admins');
  };

  // Если пользователь не авторизован или не загружена сессия, показываем заглушку
  if (
    status === 'loading' ||
    (status === 'authenticated' && session.user.role !== 'superadmin')
  ) {
    return (
      <AdminLayout>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>
          {admin
            ? `Редактирование администратора: ${admin.name}`
            : 'Редактирование администратора'}
          | Панель супер-администратора
        </title>
      </Head>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {admin
            ? `Редактирование администратора: ${admin.name}`
            : 'Редактирование администратора'}
        </h1>
        <button className={styles.backButton} onClick={handleCancel}>
          ← Вернуться к списку
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка данных администратора...</p>
        </div>
      ) : admin ? (
        <AdminForm
          admin={admin}
          onUpdate={handleUpdate}
          onCancel={handleCancel}
          isCreating={false}
        />
      ) : (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>
            Администратор не найден или у вас нет прав для его редактирования
          </p>
          <button className={styles.backButton} onClick={handleCancel}>
            Вернуться к списку администраторов
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
