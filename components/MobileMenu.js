import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/MobileMenu.module.css';
import { isAdmin } from '../lib/utils/roleUtils';

/**
 * Современный компонент мобильного меню с улучшенным UX
 * @param {Object} props - Пропсы компонента
 * @param {boolean} props.isOpen - Состояние открытия меню
 * @param {Function} props.onClose - Функция закрытия меню
 * @returns {JSX.Element} Компонент мобильного меню
 */
export default function MobileMenu({ isOpen, onClose }) {
  const { data: session } = useSession();
  const router = useRouter();
  const menuRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Обработка анимации открытия/закрытия
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Обработка клавиши Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Обработка touch-событий для свайпа
  useEffect(() => {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      if (!menuRef.current?.contains(e.target)) return;
      startX = e.touches[0].clientX;
      isDragging = true;
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;

      if (deltaX > 0) {
        const menu = menuRef.current;
        if (menu) {
          menu.style.transform = `translateX(${Math.min(deltaX, 100)}px)`;
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      const deltaX = currentX - startX;
      const menu = menuRef.current;

      if (menu) {
        menu.style.transform = '';
        if (deltaX > 100) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('touchstart', handleTouchStart, {
        passive: true,
      });
      document.addEventListener('touchmove', handleTouchMove, {
        passive: true,
      });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);

  const handleLinkClick = (href) => {
    onClose();
    router.push(href);
  };

  const handleSignOut = () => {
    onClose();
    signOut();
  };

  const menuItems = [
    {
      href: '/interview-assistant/company',
      label: 'AI-Ассистент',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 12l2 2 4-4"></path>
          <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1h1z"></path>
        </svg>
      ),
    },
    {
      href: '/mock-interviews',
      label: 'Mock-интервью',
      icon: (
        <svg
          width="20"
          height="20"
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
      ),
    },
    {
      href: '/training',
      label: 'Тренировка',
      icon: (
        <svg
          width="20"
          height="20"
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
      ),
    },
    {
      href: '/flashcards',
      label: 'Карточки',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"></path>
          <path d="M8 11h8"></path>
        </svg>
      ),
    },
  ];

  const settingsItems = [
    {
      href: '/user/api-settings',
      label: 'Настройки API',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
    {
      href: '/user/points-history',
      label: 'История баллов',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18"></path>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
        </svg>
      ),
    },
    {
      href: '/user/profile',
      label: 'Профиль',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
  ];

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Мобильное меню"
    >
      <div
        ref={menuRef}
        className={`${styles.menu} ${isOpen ? styles.menuOpen : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок меню */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Меню</h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
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

          {/* Индикатор свайпа */}
          <div className={styles.swipeIndicator}></div>
        </div>

        {/* Контент меню */}
        <div className={styles.content}>
          {session && (
            <>
              {/* Информация о пользователе */}
              <div className={styles.userSection}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'Пользователь'}
                        className={styles.avatarImage}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {session.user.name
                          ? session.user.name[0].toUpperCase()
                          : 'U'}
                      </div>
                    )}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>
                      {session.user.name || 'Пользователь'}
                    </span>
                    <span className={styles.userEmail}>
                      {session.user.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Основные разделы */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Основные разделы</h3>
                <nav className={styles.navigation}>
                  {menuItems.map((item, index) => (
                    <button
                      key={item.href}
                      className={styles.navItem}
                      onClick={() => handleLinkClick(item.href)}
                      style={{ animationDelay: `${(index + 1) * 50}ms` }}
                    >
                      <div className={styles.navIcon}>{item.icon}</div>
                      <span className={styles.navLabel}>{item.label}</span>
                      <svg
                        className={styles.navArrow}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6"></path>
                      </svg>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Настройки */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Настройки</h3>
                <nav className={styles.navigation}>
                  {settingsItems.map((item, index) => (
                    <button
                      key={item.href}
                      className={styles.navItem}
                      onClick={() => handleLinkClick(item.href)}
                      style={{
                        animationDelay: `${
                          (menuItems.length + index + 1) * 50
                        }ms`,
                      }}
                    >
                      <div className={styles.navIcon}>{item.icon}</div>
                      <span className={styles.navLabel}>{item.label}</span>
                      <svg
                        className={styles.navArrow}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6"></path>
                      </svg>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Админ-панель для суперадминов */}
              {isAdmin(session.user) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Администрирование</h3>
                  <nav className={styles.navigation}>
                    <button
                      className={styles.navItem}
                      onClick={() => handleLinkClick('/admin')}
                    >
                      <div className={styles.navIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path>
                        </svg>
                      </div>
                      <span className={styles.navLabel}>Управление</span>
                      <svg
                        className={styles.navArrow}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6"></path>
                      </svg>
                    </button>
                  </nav>
                </div>
              )}

              {/* Кнопка выхода */}
              <div className={styles.footer}>
                <button
                  className={styles.signOutButton}
                  onClick={handleSignOut}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16,17 21,12 16,7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Выйти</span>
                </button>
              </div>
            </>
          )}

          {/* Для неавторизованных пользователей */}
          {!session && (
            <div className={styles.authSection}>
              <div className={styles.authMessage}>
                <h3>Добро пожаловать!</h3>
                <p>
                  Войдите в систему, чтобы получить доступ ко всем функциям
                  платформы.
                </p>
              </div>
              <button
                className={styles.signInButton}
                onClick={() => handleLinkClick('/auth/signin')}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10,17 15,12 10,7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                <span>Войти</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
