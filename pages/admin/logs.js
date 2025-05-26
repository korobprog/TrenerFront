import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../components/admin/AdminLayout';
import LogsList from '../../components/admin/LogsList';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Страница просмотра логов административных действий
 * @returns {JSX.Element} Страница просмотра логов
 */
export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError } = useNotification();

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

  // Если статус загрузки или пользователь не авторизован, показываем загрузку
  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Логи административных действий | Админ-панель</title>
        <meta
          name="description"
          content="Просмотр логов административных действий"
        />
      </Head>

      <AdminLayout>
        <LogsList />
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
