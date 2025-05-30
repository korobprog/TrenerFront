import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/auth/SignInModal.module.css';

export default function CredentialsSignIn() {
  const router = useRouter();
  const { error, callbackUrl } = router.query;

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Функция для отображения сообщения об ошибке
  const getErrorMessage = (error) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Неверный логин или пароль. Проверьте введенные данные.';
      case 'OAuthAccountNotLinked':
        return 'Этот аккаунт не связан с существующим аккаунтом. Пожалуйста, войдите с помощью другого метода.';
      case 'AccessDenied':
        return 'Доступ запрещен. Возможно, ваш аккаунт заблокирован или у вас нет прав доступа.';
      case 'Configuration':
        return 'Ошибка конфигурации системы. Обратитесь к администратору.';
      default:
        return 'Произошла ошибка при входе. Пожалуйста, попробуйте снова.';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Очищаем ошибку при изменении полей
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.username || !credentials.password) {
      setErrorMessage('Пожалуйста, заполните все поля');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      console.log('Попытка входа с учетными данными:', {
        username: credentials.username,
        hasPassword: !!credentials.password,
      });

      const result = await signIn('credentials', {
        username: credentials.username,
        password: credentials.password,
        redirect: false,
        callbackUrl: callbackUrl || '/',
      });

      console.log('Результат входа:', result);

      if (result?.error) {
        console.error('Ошибка при входе:', result.error);
        setErrorMessage(getErrorMessage(result.error));
      } else if (result?.ok) {
        console.log('Успешный вход, перенаправляем...');

        // Проверяем сессию для подтверждения успешного входа
        const session = await getSession();
        if (session) {
          console.log('Сессия подтверждена:', session.user);
          router.push(callbackUrl || '/');
        } else {
          console.error('Сессия не создана после успешного входа');
          setErrorMessage('Ошибка создания сессии. Попробуйте еще раз.');
        }
      } else {
        console.error('Неожиданный результат входа:', result);
        setErrorMessage('Неожиданная ошибка. Попробуйте еще раз.');
      }
    } catch (error) {
      console.error('Исключение при входе:', error);
      setErrorMessage('Произошла ошибка при входе. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Вход по логину и паролю</title>
        <meta name="description" content="Страница входа по логину и паролю" />
      </Head>

      <main className={styles.main}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h1 className={styles.title}>Вход в систему</h1>
            <p className={styles.subtitle}>Введите ваш логин и пароль</p>
          </div>

          {(error || errorMessage) && (
            <div className={styles.errorMessage}>
              {errorMessage || getErrorMessage(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.label}>
                Email или имя пользователя
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Введите email или имя пользователя"
                className={styles.input}
                required
                disabled={loading}
                autoComplete="username"
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
                placeholder="Введите пароль"
                className={styles.input}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                loading || !credentials.username || !credentials.password
              }
            >
              {loading ? (
                <span className={styles.loadingText}>
                  <span className={styles.spinner}></span>
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Хотите использовать другой способ входа?{' '}
              <Link href="/auth/signin" className={styles.link}>
                Вернуться к выбору способа входа
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {},
  };
}
