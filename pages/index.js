import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthButton from '../components/auth/AuthButton';
import styles from '../styles/Home.module.css';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>SuperMock</h1>
          <p className={styles.subtitle}>
            Платформа для профессиональной подготовки к собеседованиям
          </p>
        </div>

        {/* Презентация сервисов */}
        <div className={styles.servicesSection}>
          <h2 className={styles.servicesTitle}>Наши сервисы</h2>
          <div className={styles.servicesGrid}>
            {/* AI-ассистент */}
            <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1h1z"></path>
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>AI-ассистент</h3>
              <p className={styles.serviceDescription}>
                Интеллектуальный помощник для подготовки к собеседованиям.
                Получайте мгновенные ответы на вопросы по HTML, CSS, JavaScript,
                React и другим технологиям.
              </p>
              <ul className={styles.serviceFeatures}>
                <li>Мгновенные ответы на технические вопросы</li>
                <li>Примеры кода и объяснения</li>
                <li>История диалогов</li>
                <li>Умные подсказки</li>
              </ul>
              <a
                href="/interview-assistant/company"
                className={styles.serviceButton}
                aria-label="Перейти к AI-ассистенту"
              >
                Попробовать
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
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </a>
            </div>

            {/* Mock-интервью */}
            <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Mock-интервью</h3>
              <p className={styles.serviceDescription}>
                Реалистичные собеседования с профессиональными интервьюерами.
                Получите ценную обратную связь и улучшите свои навыки.
              </p>
              <ul className={styles.serviceFeatures}>
                <li>Реальные условия собеседования</li>
                <li>Профессиональные интервьюеры</li>
                <li>Детальная обратная связь</li>
                <li>Видеозапись сессий</li>
              </ul>
              <a
                href="/mock-interviews"
                className={styles.serviceButton}
                aria-label="Записаться на mock-интервью"
              >
                Записаться
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
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </a>
            </div>

            {/* Тренировочные вопросы */}
            <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Тренировочные вопросы</h3>
              <p className={styles.serviceDescription}>
                Обширная база вопросов для самостоятельной подготовки. Изучайте
                теорию и практикуйтесь в решении задач.
              </p>
              <ul className={styles.serviceFeatures}>
                <li>Сотни актуальных вопросов</li>
                <li>Разные уровни сложности</li>
                <li>Отслеживание прогресса</li>
                <li>Поиск по темам</li>
              </ul>
              {session ? (
                <button
                  className={styles.serviceButton}
                  onClick={() => router.push('/training')}
                  aria-label="Начать тренировку"
                >
                  Начать
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
                    <path d="M5 12h14"></path>
                    <path d="M12 5l7 7-7 7"></path>
                  </svg>
                </button>
              ) : (
                <button
                  className={styles.serviceButton}
                  onClick={() =>
                    router.push('/auth/signin?callbackUrl=/training')
                  }
                  aria-label="Войти для начала тренировки"
                >
                  Войти для тренировки
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
                    <path d="M5 12h14"></path>
                    <path d="M12 5l7 7-7 7"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.authSection}>
          <AuthButton />
          <div className={styles.legalLinks}>
            <Link href="/privacy-policy" className={styles.legalLink}>
              Политика конфиденциальности
            </Link>
            <span className={styles.legalSeparator}>•</span>
            <Link href="/terms-of-service" className={styles.legalLink}>
              Условия предоставления услуг
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
