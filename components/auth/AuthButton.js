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
    <div className={styles.signInContainer}>
      <p className={styles.signInText}>Войдите, чтобы начать тренировку</p>
      <div className={styles.authOptions}>
        <div className={styles.tooltipContainer}>
          <button
            onClick={() => signIn('google')}
            className={styles.googleIconButton}
            aria-label="Войти через Google"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              className={styles.googleIcon}
            >
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
          </button>
          <div className={styles.tooltip}>Войти через Google</div>
        </div>
        <button
          onClick={() => signIn('google')}
          className={styles.googleSignInButton}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className={styles.googleIconSmall}
          >
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
          <span className={styles.googleButtonText}>Продолжить с Google</span>
        </button>
      </div>
    </div>
  );
}
