import { getProviders, signIn } from 'next-auth/react';
import styles from '../../styles/SignIn.module.css';
import Head from 'next/head';

export default function SignIn({ providers }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Вход в систему</title>
        <meta name="description" content="Страница входа в систему" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Вход в систему</h1>

        <div className={styles.providersContainer}>
          {Object.values(providers).map((provider) => (
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
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const providers = await getProviders();
  return {
    props: { providers },
  };
}
