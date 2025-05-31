import { getProviders, signIn } from 'next-auth/react';
import { useState } from 'react';
import styles from '../../styles/SignIn.module.css';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function SignIn({ providers }) {
  const router = useRouter();
  const { error } = router.query;
  const [email, setEmail] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Функция для отображения сообщения об ошибке
  const getErrorMessage = (error) => {
    switch (error) {
      case 'OAuthAccountNotLinked':
        return 'Этот аккаунт не связан с существующим аккаунтом. Пожалуйста, войдите с помощью другого метода или создайте новый аккаунт.';
      case 'EmailSignin':
        return 'Ошибка при отправке магической ссылки. Проверьте правильность email адреса.';
      default:
        return 'Произошла ошибка при входе. Пожалуйста, попробуйте снова.';
    }
  };

  // Обработка отправки магической ссылки
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('Пожалуйста, введите корректный email адрес');
      return;
    }

    setIsEmailLoading(true);
    try {
      console.log('Отправка магической ссылки для:', email);

      const result = await signIn('email', {
        email,
        callbackUrl: '/',
        redirect: false,
      });

      console.log('Результат отправки:', result);

      if (result?.error) {
        console.error('Ошибка при отправке магической ссылки:', result.error);

        // Более детальная обработка ошибок
        let errorMessage = 'Ошибка при отправке магической ссылки.';
        switch (result.error) {
          case 'EmailSignin':
            errorMessage =
              'Не удалось отправить email. Проверьте правильность адреса.';
            break;
          case 'Configuration':
            errorMessage = 'Ошибка конфигурации email провайдера.';
            break;
          default:
            errorMessage = `Ошибка: ${result.error}`;
        }

        alert(errorMessage + ' Попробуйте еще раз.');
      } else if (result?.ok) {
        console.log(
          'Email отправлен успешно, перенаправляем на страницу подтверждения'
        );
        // Перенаправляем на страницу подтверждения
        router.push(`/auth/verify-request?email=${encodeURIComponent(email)}`);
      } else {
        console.log('Неожиданный результат:', result);
        // Если нет ошибки, но и нет ok, все равно перенаправляем
        router.push(`/auth/verify-request?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      console.error('Исключение при отправке магической ссылки:', error);
      alert(
        'Произошла ошибка при отправке магической ссылки. Попробуйте еще раз.'
      );
    } finally {
      setIsEmailLoading(false);
    }
  };
  return (
    <div className={styles.container}>
      <Head>
        <title>Вход в систему</title>
        <meta name="description" content="Страница входа в систему" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Вход в систему</h1>

        {error && (
          <div className={styles.errorMessage}>{getErrorMessage(error)}</div>
        )}

        <div className={styles.providersContainer}>
          {/* Форма для магической ссылки */}
          {providers?.email && (
            <div className={styles.providerCard}>
              <form onSubmit={handleEmailSignIn} className={styles.emailForm}>
                <div className={styles.emailInputGroup}>
                  <label htmlFor="email" className={styles.emailLabel}>
                    Email для магической ссылки
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Введите ваш email"
                    className={styles.emailInput}
                    required
                    disabled={isEmailLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isEmailLoading || !email}
                  className={`${styles.providerButton} ${styles.emailProvider}`}
                >
                  <div className={styles.providerIcon}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <span className={styles.providerText}>
                    {isEmailLoading
                      ? 'Отправка...'
                      : 'Отправить магическую ссылку'}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* Разделитель */}
          {providers?.email && Object.keys(providers).length > 1 && (
            <div className={styles.divider}>
              <span>или</span>
            </div>
          )}

          {/* Остальные провайдеры */}
          {providers &&
            Object.values(providers)
              .filter((provider) => provider.id !== 'email')
              .map((provider) => (
                <div key={provider.name} className={styles.providerCard}>
                  <button
                    onClick={() => {
                      if (provider.id === 'credentials') {
                        // Перенаправляем на страницу входа по логину и паролю
                        router.push('/auth/credentials');
                      } else {
                        signIn(provider.id, { callbackUrl: '/' });
                      }
                    }}
                    className={`${styles.providerButton} ${
                      provider.id === 'google'
                        ? styles.googleProvider
                        : provider.id === 'github'
                        ? styles.githubProvider
                        : provider.id === 'credentials'
                        ? styles.credentialsProvider
                        : ''
                    }`}
                  >
                    {provider.id === 'google' && (
                      <div className={styles.providerIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      </div>
                    )}
                    {provider.id === 'github' && (
                      <div className={styles.providerIcon}>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                    )}
                    {provider.id === 'credentials' && (
                      <div className={styles.providerIcon}>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                    )}
                    <span className={styles.providerText}>
                      {provider.id === 'google' && 'Продолжить с Google'}
                      {provider.id === 'github' && 'Продолжить с GitHub'}
                      {provider.id === 'credentials' &&
                        'Войти с логином и паролем'}
                      {!['google', 'github', 'credentials'].includes(
                        provider.id
                      ) && `Войти через ${provider.name}`}
                    </span>
                  </button>
                </div>
              ))}
          {!providers && (
            <div className={styles.errorMessage}>
              Не удалось загрузить провайдеры авторизации. Пожалуйста, обновите
              страницу или попробуйте позже.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  // Удалено избыточное логирование
  const providers = await getProviders();

  return {
    props: { providers },
  };
}
