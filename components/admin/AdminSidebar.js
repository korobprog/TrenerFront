import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/admin/AdminSidebar.module.css';

/**
 * Компонент боковой панели для административных страниц
 * @returns {JSX.Element} Компонент боковой панели для административных страниц
 */
export default function AdminSidebar() {
  const router = useRouter();

  // Функция для определения активного пункта меню
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  // Пункты меню
  const menuItems = [
    {
      name: 'Дашборд',
      path: '/admin',
      icon: '📊',
    },
    {
      name: 'Пользователи',
      path: '/admin/users',
      icon: '👥',
    },
    {
      name: 'Собеседования',
      path: '/admin/interviews',
      icon: '🗓️',
    },
    {
      name: 'Статистика',
      path: '/admin/statistics',
      icon: '📈',
    },
    {
      name: 'Логи',
      path: '/admin/logs',
      icon: '📝',
    },
  ];

  return (
    <aside className={styles.adminSidebar}>
      <div className={styles.sidebarHeader}>
        <Link href="/admin" className={styles.logoLink}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🔐</span>
            <span className={styles.logoText}>Админ</span>
          </div>
        </Link>
      </div>
      <nav className={styles.sidebarNav}>
        <ul className={styles.navList}>
          {menuItems.map((item) => (
            <li key={item.path} className={styles.navItem}>
              <Link
                href={item.path}
                className={`${styles.navLink} ${
                  isActive(item.path) ? styles.active : ''
                }`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navText}>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.sidebarFooter}>
        <div className={styles.versionInfo}>v1.0.0</div>
      </div>
    </aside>
  );
}
