import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../../components/admin/AdminLayout';
import AdminForm from '../../../../components/admin/AdminForm';
import styles from '../../../../styles/admin/UserForm.module.css';

/**
 * Страница создания нового администратора для супер-администратора
 * @returns {JSX.Element} Страница создания нового администратора
 */
export default function CreateAdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

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

  // Обработчик успешного создания администратора
  const handleCreate = () => {
    // После успешного создания перенаправляем на страницу со списком администраторов
    router.push('/admin/superadmin/admins');
  };

  // Обработчик отмены создания
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
          Создание нового администратора | Панель супер-администратора
        </title>
      </Head>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Создание нового администратора</h1>
        <button className={styles.backButton} onClick={handleCancel}>
          ← Вернуться к списку
        </button>
      </div>

      <AdminForm
        admin={null}
        onUpdate={handleCreate}
        onCancel={handleCancel}
        isCreating={true}
      />
    </AdminLayout>
  );
}
