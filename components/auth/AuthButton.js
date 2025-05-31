import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import SignInModal from './SignInModal';
import styles from '../../styles/AuthButton.module.css';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Защита от повторных вызовов fallback аватара
  const fallbackAppliedRef = useRef(new Set());

  if (status === 'loading') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (session) {
    // Генерируем аватар по умолчанию на основе имени пользователя
    const getDefaultAvatar = (name) => {
      const timestamp = new Date().toISOString();
      try {
        console.log(`[AVATAR_DEBUG] ${timestamp} getDefaultAvatar() вызвана`, {
          name,
          sessionUser: session?.user?.name || 'не указано',
          sessionEmail: session?.user?.email || 'не указано',
          sessionImage: session?.user?.image || 'не указано',
          reason: 'Генерация дефолтного аватара в AuthButton',
        });
      } catch (logError) {
        console.error(
          `[AVATAR_DEBUG] ${timestamp} Ошибка логирования в getDefaultAvatar:`,
          logError
        );
      }

      if (!name) {
        console.log(
          `[AVATAR_DEBUG] ${timestamp} getDefaultAvatar() возвращает fallback /default-avatar.svg`
        );
        return '/default-avatar.svg';
      }

      const initials = name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      console.log(
        `[AVATAR_DEBUG] ${timestamp} getDefaultAvatar() сгенерированы инициалы: ${initials}`
      );

      // Создаем SVG аватар с инициалами
      const uniqueId = `${initials}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 5)}`;
      const svg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="avatarGradient${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill="url(#avatarGradient${uniqueId})"/>
          <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="600">${initials}</text>
        </svg>
      `;
      const result = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svg
      )}`;

      console.log(
        `[AVATAR_DEBUG] ${timestamp} getDefaultAvatar() результат готов`,
        {
          initials,
          svgLength: svg.length,
          resultLength: result.length,
        }
      );

      return result;
    };

    const userImage =
      session?.user?.image || getDefaultAvatar(session?.user?.name);

    return (
      <div className={styles.authContainer}>
        <div className={styles.userInfo}>
          <img
            src={userImage}
            alt={session?.user?.name || 'Пользователь'}
            className={styles.userImage}
            onError={(e) => {
              const timestamp = new Date().toISOString();
              const originalSrc = e.target.src;

              // Проверяем, не применяли ли мы уже fallback для этого src
              if (fallbackAppliedRef.current.has(originalSrc)) {
                console.log(
                  `[AVATAR_DEBUG] ${timestamp} onError пропущен - fallback уже применен`,
                  {
                    originalSrc,
                    reason: 'Защита от повторных вызовов fallback',
                  }
                );
                return;
              }

              // Если это уже fallback аватар, используем статический SVG
              if (
                originalSrc.startsWith('data:image/svg') ||
                originalSrc.includes('/default-avatar.svg')
              ) {
                console.log(
                  `[AVATAR_DEBUG] ${timestamp} onError для fallback аватара`,
                  {
                    originalSrc,
                    reason: 'Переключение на статический SVG',
                  }
                );
                e.target.src = '/default-avatar.svg';
                fallbackAppliedRef.current.add(originalSrc);
                return;
              }

              try {
                console.log(
                  `[AVATAR_DEBUG] ${timestamp} onError обработчик вызван в AuthButton`,
                  {
                    originalSrc,
                    sessionUser: session?.user?.name || 'не указано',
                    sessionEmail: session?.user?.email || 'не указано',
                    sessionImage: session?.user?.image || 'не указано',
                    reason: '404 ошибка или недоступность изображения',
                    userAgent:
                      typeof navigator !== 'undefined'
                        ? navigator.userAgent.substring(0, 50)
                        : 'не доступно',
                  }
                );
              } catch (logError) {
                console.error(
                  `[AVATAR_DEBUG] ${timestamp} Ошибка логирования в onError:`,
                  logError
                );
              }

              console.log(
                '🔴 AuthButton: Ошибка загрузки изображения:',
                originalSrc
              );
              console.log('🔄 AuthButton: Переключение на дефолтный аватар');

              const fallbackAvatar = getDefaultAvatar(session?.user?.name);
              e.target.src = fallbackAvatar;

              // Отмечаем, что для этого src уже применен fallback
              fallbackAppliedRef.current.add(originalSrc);

              console.log(
                `[AVATAR_DEBUG] ${timestamp} onError обработчик завершен`,
                {
                  newSrc: fallbackAvatar,
                  operation: 'Переключение на дефолтный аватар завершено',
                }
              );
            }}
          />
          <span className={styles.userName}>
            {session?.user?.name || session?.user?.email || 'Пользователь'}
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
