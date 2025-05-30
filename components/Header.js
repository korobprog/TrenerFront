import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Header.module.css';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import UserSettingsModal from './user/UserSettingsModal';

/**
 * Компонент шапки сайта с отображением баллов пользователя
 * @returns {JSX.Element} Компонент шапки сайта
 */
export default function Header() {
  const { data: session, status } = useSession();
  const [userPoints, setUserPoints] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);
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
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef, mobileMenuRef]);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerGrid}>
        {/* Логотип */}
        <div className={styles.logoArea}>
          <Link href="/" className={styles.logoLink}>
            <Logo size="medium" className={styles.headerLogo} />
          </Link>
        </div>

        {/* Основная навигация */}
        <nav className={styles.mainNav}></nav>

        {/* Пользовательская секция */}
        <div className={styles.userArea}>
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
                  <svg
                    className={`${styles.dropdownIcon} ${
                      isMenuOpen ? styles.rotated : ''
                    }`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                </div>

                {isMenuOpen && (
                  <div className={styles.userMenu}>
                    <Link
                      href="/interview-assistant/company"
                      className={styles.menuItem}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 12l2 2 4-4"></path>
                        <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1h1z"></path>
                      </svg>
                      AI-Ассистент
                    </Link>
                    <Link href="/mock-interviews" className={styles.menuItem}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      Mock-интервью
                    </Link>
                    <Link href="/training" className={styles.menuItem}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                      </svg>
                      Тренировка
                    </Link>
                    <Link href="/flashcards" className={styles.menuItem}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M19 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"></path>
                        <path d="M8 11h8"></path>
                      </svg>
                      Карточки
                    </Link>
                    <div className={styles.menuDivider}></div>
                    <Link href="/user/api-settings" className={styles.menuItem}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                      Настройки API
                    </Link>
                    <Link
                      href="/user/points-history"
                      className={styles.menuItem}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3v18h18"></path>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                      </svg>
                      История баллов
                    </Link>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className={styles.menuItem}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                      Настройки пользователя
                    </button>
                    {session.user.role === 'superadmin' && (
                      <>
                        <div className={styles.menuDivider}></div>
                        <Link href="/admin" className={styles.menuItem}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path>
                          </svg>
                          Управление
                        </Link>
                        <Link
                          href="/admin/superadmin-signin"
                          className={styles.menuItem}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10,17 15,12 10,7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                          </svg>
                          Админ-вход
                        </Link>
                      </>
                    )}
                    <div className={styles.menuDivider}></div>
                    <button
                      onClick={() => signOut()}
                      className={styles.menuItem}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16,17 21,12 16,7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {status === 'unauthenticated' && (
            <Link href="/auth/signin" className={styles.signInButton}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10,17 15,12 10,7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Войти
            </Link>
          )}
        </div>

        {/* Мобильное меню кнопка */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Открыть меню"
        >
          <span
            className={`${styles.hamburger} ${
              isMobileMenuOpen ? styles.open : ''
            }`}
          >
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Мобильное меню */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu}>
          <div
            className={styles.mobileMenu}
            ref={mobileMenuRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <span className={styles.mobileMenuTitle}>Меню</span>
              <button
                className={styles.mobileMenuClose}
                onClick={closeMobileMenu}
                aria-label="Закрыть меню"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <nav className={styles.mobileNavigation}></nav>

            {session && (
              <div className={styles.mobileUserSection}>
                <div className={styles.mobileUserInfo}>
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Пользователь'}
                      className={styles.mobileUserAvatar}
                    />
                  ) : (
                    <div className={styles.mobileUserAvatarPlaceholder}>
                      {session.user.name ? session.user.name[0] : 'U'}
                    </div>
                  )}
                  <span className={styles.mobileUserName}>
                    {session.user.name || 'Пользователь'}
                  </span>
                </div>

                <div className={styles.mobileUserActions}>
                  <Link
                    href="/interview-assistant/company"
                    className={styles.mobileUserAction}
                    onClick={closeMobileMenu}
                  >
                    AI-Ассистент
                  </Link>
                  <Link
                    href="/mock-interviews"
                    className={styles.mobileUserAction}
                    onClick={closeMobileMenu}
                  >
                    Mock-интервью
                  </Link>
                  <Link
                    href="/training"
                    className={styles.mobileUserAction}
                    onClick={closeMobileMenu}
                  >
                    Тренировка
                  </Link>
                  <Link
                    href="/flashcards"
                    className={styles.mobileUserAction}
                    onClick={closeMobileMenu}
                  >
                    Карточки
                  </Link>
                  <Link
                    href="/user/api-settings"
                    className={styles.mobileUserAction}
                    onClick={closeMobileMenu}
                  >
                    Настройки API
                  </Link>
                  <Link
                    href="/user/points-history"
                    className={styles.mobileUserAction}
                    onClick={closeMobileMenu}
                  >
                    История баллов
                  </Link>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
                      closeMobileMenu();
                    }}
                    className={styles.mobileUserAction}
                  >
                    Настройки пользователя
                  </button>
                  {session.user.role === 'superadmin' && (
                    <>
                      <Link
                        href="/admin"
                        className={styles.mobileUserAction}
                        onClick={closeMobileMenu}
                      >
                        Управление
                      </Link>
                      <Link
                        href="/admin/superadmin-signin"
                        className={styles.mobileUserAction}
                        onClick={closeMobileMenu}
                      >
                        Админ-вход
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      closeMobileMenu();
                    }}
                    className={styles.mobileUserAction}
                  >
                    Выйти
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно настроек пользователя */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </header>
  );
}
