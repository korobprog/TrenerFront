import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/SignIn.module.css';

/**
 * Страница входа для администраторов через Google
 * @returns {JSX.Element} Страница входа для администраторов
 */
export default function AdminSignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Проверяем права администратора при загрузке сессии
   */
  useEffect(() => {
    const checkAdminRights = async () => {
      if (session) {
        setLoading(true);
        try {
          // Проверяем роль пользователя напрямую из сессии
          if (session.user.role === 'admin') {
            // Перенаправляем на главную страницу административной панели
            router.push('/admin');
          } else {
            setError('У вас нет прав для доступа к административной панели');
            await signOut({ redirect: false });
          }
        } catch (error) {
          console.error('Ошибка при проверке прав администратора:', error);
          setError('Произошла ошибка при проверке прав администратора');
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === 'authenticated') {
      checkAdminRights();
    }
  }, [session, status, router]);

  /**
   * Обработчик входа через Google
   */
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/admin' });
  };

  return (
    <>
      <Head>
        <title>Вход в административную панель</title>
        <meta name="description" content="Вход в административную панель" />
      </Head>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h1 className={styles.title}>Вход в административную панель</h1>

          {status === 'loading' ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : session ? (
            <div className={styles.userInfo}>
              {loading ? (
                <p>Проверка прав администратора...</p>
              ) : (
                <p>Выполняется перенаправление...</p>
              )}
              {error && <div className={styles.error}>{error}</div>}
            </div>
          ) : (
            <div className={styles.googleAuth}>
              <p>
                Для входа в административную панель используйте аккаунт Google с
                правами администратора
              </p>
              {error && <div className={styles.error}>{error}</div>}
              <button
                onClick={handleGoogleSignIn}
                className={styles.button}
                disabled={loading}
              >
                Войти через Google
              </button>
            </div>
          )}

          <div className={styles.links}>
            <Link href="/" className={styles.link}>
              Вернуться на главную
            </Link>
            <span className={styles.linkSeparator}>•</span>
            <Link href="/admin/superadmin-signin" className={styles.link}>
              Вход для супер-администратора
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
