import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Header.module.css';
import ThemeToggle from './ThemeToggle';

/**
 * Компонент шапки сайта с отображением баллов пользователя
 * @returns {JSX.Element} Компонент шапки сайта
 */
export default function Header() {
  const { data: session, status } = useSession();
  const [userPoints, setUserPoints] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  // Загружаем баллы пользователя при монтировании компонента
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserPoints();
    }
  }, [status]);

  // Обработчик клика вне меню для его закрытия
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Функция для загрузки баллов пользователя
  const fetchUserPoints = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/points');
      if (!response.ok) {
        throw new Error('Не удалось загрузить баллы пользователя');
      }

      const data = await response.json();
      setUserPoints(data.points);
    } catch (error) {
      console.error('Ошибка при загрузке баллов пользователя:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" className={styles.headerLink}>
            Тренер собеседований
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/mock-interviews"
            className={
              router.pathname.includes('/mock-interviews')
                ? `${styles.headerLink} ${styles.active}`
                : styles.headerLink
            }
          >
            Собеседования
          </Link>
        </nav>

        <div className={styles.userSection}>
          <ThemeToggle />
          
          {status === 'loading' && (
            <div className={styles.loadingState}>Загрузка...</div>
          )}

          {status === 'authenticated' && (
            <>
              <Link href="/user/points-history" className={styles.pointsLink}>
                <div className={styles.pointsContainer}>
                  <span className={styles.pointsLabel}>Баллы:</span>
                  {isLoading ? (
                    <span className={styles.pointsLoading}>...</span>
                  ) : (
                    <span className={styles.pointsValue}>{userPoints}</span>
                  )}
                </div>
              </Link>

              <div className={styles.userInfo} ref={menuRef}>
                <div
                  className={styles.userAvatarContainer}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Пользователь'}
                      className={styles.userAvatar}
                    />
                  ) : (
                    <div className={styles.userAvatarPlaceholder}>
                      {session.user.name ? session.user.name[0] : 'U'}
                    </div>
                  )}
                  <span className={styles.userName}>
                    {session.user.name || 'Пользователь'}
                  </span>
                </div>

                {isMenuOpen && (
                  <div className={styles.userMenu}>
                    <Link href="/user/api-settings" className={styles.menuItem}>
                      Настройки API
                    </Link>
                    <Link
                      href="/user/points-history"
                      className={styles.menuItem}
                    >
                      История баллов
                    </Link>
                    {session.user.role === 'superadmin' && (
                      <>
                        <Link href="/admin" className={styles.menuItem}>
                          Управление
                        </Link>
                        <Link
                          href="/admin/superadmin-signin"
                          className={styles.menuItem}
                        >
                          Вход
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {status === 'unauthenticated' && (
            <Link href="/auth/signin" className={styles.signInButton}>
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
