import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/admin/AdminSignin.module.css';

/**
 * Страница входа для супер-администратора
 * @returns {JSX.Element} Страница входа для супер-администратора
 */
export default function SuperAdminSignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Если пользователь уже аутентифицирован и имеет роль superadmin, перенаправляем на панель администратора
  if (status === 'authenticated' && session?.user?.role === 'superadmin') {
    router.push('/admin');
    return null;
  }

  /**
   * Обработчик изменения полей формы
   * @param {React.ChangeEvent<HTMLInputElement>} e - Событие изменения
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Обработчик отправки формы
   * @param {React.FormEvent} e - Событие отправки формы
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username: credentials.username,
        password: credentials.password,
      });

      if (result.error) {
        setError('Неверный логин или пароль');
      } else {
        // Успешный вход, перенаправляем на панель администратора
        router.push('/admin');
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      setError('Произошла ошибка при входе в систему');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Вход для супер-администратора</title>
        <meta name="description" content="Вход для супер-администратора" />
      </Head>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h1 className={styles.title}>Вход для супер-администратора</h1>

          <div className={styles.info}>
            Используйте логин <strong>admin</strong> или email
            супер-администратора
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.label}>
                Логин
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={credentials.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите логин (admin)"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={credentials.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите пароль"
                required
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={styles.button}
              disabled={
                loading || !credentials.username || !credentials.password
              }
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className={styles.links}>
            <Link href="/" className={styles.link}>
              Вернуться на главную
            </Link>
            <span className={styles.linkSeparator}>•</span>
            <Link href="/admin/signin" className={styles.link}>
              Вход для администратора
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
