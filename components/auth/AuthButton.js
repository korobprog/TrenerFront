import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import SignInModal from './SignInModal';
import styles from '../../styles/AuthButton.module.css';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <>
      <div className={styles.signInContainer}>
        <p className={styles.signInText}>Войдите, чтобы начать тренировку</p>
        <div className={styles.authOptions}>
          <button
            onClick={() => router.push('/auth/signin')}
            className={styles.modernSignInButton}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10,17 15,12 10,7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span>Войти</span>
          </button>
        </div>
      </div>

      <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
