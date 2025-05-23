import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import styles from '../../styles/admin/AdminLayout.module.css';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Компонент макета для административных страниц
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @returns {JSX.Element} Компонент макета для административных страниц
 */
export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError } = useNotification();

  // Проверяем, имеет ли пользователь права администратора
  useEffect(() => {
    console.log('AdminLayout: Статус сессии:', status);
    console.log('AdminLayout: Данные сессии:', session);

    if (status === 'authenticated') {
      console.log(
        'AdminLayout: Пользователь аутентифицирован, проверяем права администратора'
      );
      console.log(
        'AdminLayout: Роль пользователя в сессии:',
        session?.user?.role
      );

      // Проверяем роль пользователя на клиенте
      // Это дополнительная проверка, основная защита реализована на сервере
      fetch('/api/admin/statistics')
        .then((res) => {
          console.log(
            'AdminLayout: Ответ от API статистики:',
            res.status,
            res.statusText
          );

          if (!res.ok) {
            throw new Error(
              'Недостаточно прав для доступа к административной панели'
            );
          }
          return res.json();
        })
        .then((data) => {
          console.log('AdminLayout: Данные статистики получены успешно');
        })
        .catch((error) => {
          console.error('Ошибка при проверке прав администратора:', error);
          console.log(
            'AdminLayout: Перенаправляем на главную страницу из-за ошибки'
          );
          showError('У вас нет прав для доступа к административной панели');
          router.push('/');
        });
    } else if (status === 'unauthenticated') {
      console.log(
        'AdminLayout: Пользователь не аутентифицирован, перенаправляем на страницу входа'
      );
      // Если пользователь не авторизован, перенаправляем на страницу входа
      router.push('/admin/signin');
    }
  }, [status, router, showError, session]);

  // Если статус загрузки или пользователь не авторизован, показываем загрузку
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.mainContent}>
        <AdminHeader />
        <main className={styles.contentArea}>{children}</main>
      </div>
    </div>
  );
}
