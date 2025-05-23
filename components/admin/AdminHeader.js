import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/admin/AdminHeader.module.css';

/**
 * Компонент шапки для административных страниц
 * @returns {JSX.Element} Компонент шапки для административных страниц
 */
export default function AdminHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  // Обработчик выхода из системы
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <header className={styles.adminHeader}>
      <div className={styles.headerLeft}>
        <h1 className={styles.headerTitle}>Административная панель</h1>
      </div>
      <div className={styles.headerRight}>
        {session && (
          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{session.user.name}</span>
              <span className={styles.userRole}>Администратор</span>
            </div>
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'Администратор'}
                className={styles.userAvatar}
              />
            ) : (
              <div className={styles.userAvatarPlaceholder}>
                {session.user.name ? session.user.name[0] : 'A'}
              </div>
            )}
            <div className={styles.userMenu}>
              <button onClick={handleSignOut} className={styles.signOutButton}>
                Выйти
              </button>
              <Link href="/" className={styles.siteLink}>
                На сайт
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
