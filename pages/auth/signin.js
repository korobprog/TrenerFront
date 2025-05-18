import { getProviders, signIn } from 'next-auth/react';
import styles from '../../styles/SignIn.module.css';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function SignIn({ providers }) {
  const router = useRouter();
  const { error } = router.query;

  // Удалено избыточное логирование

  // Функция для отображения сообщения об ошибке
  const getErrorMessage = (error) => {
    switch (error) {
      case 'OAuthAccountNotLinked':
        return 'Этот аккаунт не связан с существующим аккаунтом. Пожалуйста, войдите с помощью другого метода или создайте новый аккаунт.';
      default:
        return 'Произошла ошибка при входе. Пожалуйста, попробуйте снова.';
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
          {providers &&
            Object.values(providers).map((provider) => (
              <div key={provider.name} className={styles.providerCard}>
                <button
                  onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                  className={styles.providerButton}
                >
                  {provider.name === 'Google' && (
                    <img
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                      alt="Google"
                      className={styles.providerIcon}
                    />
                  )}
                  Войти через {provider.name}
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
