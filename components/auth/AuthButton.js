import { useSession, signIn, signOut } from 'next-auth/react';
import styles from '../../styles/AuthButton.module.css';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (session) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.userInfo}>
          <img
            src={session.user.image}
            alt={session.user.name}
            className={styles.userImage}
          />
          <span className={styles.userName}>{session.user.name}</span>
        </div>
        <button onClick={() => signOut()} className={styles.signOutButton}>
          Выйти
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => signIn('google')} className={styles.signInButton}>
      Войти через Google
    </button>
  );
}
