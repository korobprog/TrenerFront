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
    // Генерируем аватар по умолчанию на основе имени пользователя
    const getDefaultAvatar = (name) => {
      if (!name) return '/default-avatar.svg';
      const initials = name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      // Создаем SVG аватар с инициалами
      const svg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"/>
          <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="600">${initials}</text>
        </svg>
      `;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    const userImage = session.user.image || getDefaultAvatar(session.user.name);

    return (
      <div className={styles.authContainer}>
        <div className={styles.userInfo}>
          <img
            src={userImage}
            alt={session.user.name || 'Пользователь'}
            className={styles.userImage}
            onError={(e) => {
              e.target.src = getDefaultAvatar(session.user.name);
            }}
          />
          <span className={styles.userName}>
            {session.user.name || session.user.email}
          </span>
        </div>
        <button onClick={() => signOut()} className={styles.signOutButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16,17 21,12 16,7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Выйти</span>
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
