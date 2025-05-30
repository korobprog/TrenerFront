import { useState, useEffect } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import FlashcardContainer from '../../components/flashcards/FlashcardContainer';
import styles from '../../styles/Flashcards.module.css';

/**
 * Основная страница флеш-карточек
 * Предоставляет интерфейс для изучения вопросов с помощью флеш-карточек
 */
export default function FlashcardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Параметры из URL
  const { topic, difficulty, mode = 'study', limit = '10' } = router.query;

  // Состояние настроек
  const [settings, setSettings] = useState({
    topic: topic || null,
    difficulty: difficulty || null,
    mode: mode || 'study',
    limit: parseInt(limit) || 10,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Обновление настроек при изменении URL
  useEffect(() => {
    if (router.isReady) {
      setSettings({
        topic: topic || null,
        difficulty: difficulty || null,
        mode: mode || 'study',
        limit: parseInt(limit) || 10,
      });
      setIsLoading(false);
    }
  }, [router.isReady, topic, difficulty, mode, limit]);

  // Перенаправление на страницу входа, если не авторизован
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(
        '/auth/signin?callbackUrl=' + encodeURIComponent('/flashcards')
      );
    }
  }, [status, router]);

  // Применение настроек
  const applySettings = (newSettings) => {
    const query = {};
    if (newSettings.topic) query.topic = newSettings.topic;
    if (newSettings.difficulty) query.difficulty = newSettings.difficulty;
    if (newSettings.mode !== 'study') query.mode = newSettings.mode;
    if (newSettings.limit !== 10) query.limit = newSettings.limit.toString();

    router.push({
      pathname: '/flashcards',
      query,
    });

    setSettings(newSettings);
    setShowSettings(false);
  };

  // Сброс настроек
  const resetSettings = () => {
    const defaultSettings = {
      topic: null,
      difficulty: null,
      mode: 'study',
      limit: 10,
    };
    applySettings(defaultSettings);
  };

  // Обработка горячих клавиш
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Игнорируем, если фокус на input элементах
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (event.key) {
        case 's':
        case 'S':
          setShowSettings(!showSettings);
          break;
        case 'Escape':
          setShowSettings(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showSettings]);

  if (status === 'loading' || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>
          <div className={styles.spinner}></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Перенаправление обрабатывается в useEffect
  }

  return (
    <>
      <Head>
        <title>Флеш-карточки - Система подготовки к собеседованиям</title>
        <meta
          name="description"
          content="Изучайте вопросы для собеседований с помощью интерактивных флеш-карточек с AI-генерацией ответов"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="main-content">
        {/* Заголовок страницы */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>
              <span className={styles.titleIcon}>🎯</span>
              Флеш-карточки
            </h1>
            <p className={styles.pageDescription}>
              Изучайте вопросы для собеседований с помощью интерактивных
              карточек. AI автоматически генерирует подробные ответы для лучшего
              понимания.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.settingsButton}
              onClick={() => setShowSettings(!showSettings)}
            >
              <span className={styles.settingsIcon}>⚙️</span>
              Настройки
            </button>
          </div>
        </div>

        {/* Панель настроек */}
        {showSettings && (
          <div className={styles.settingsPanel}>
            <div className={styles.settingsContent}>
              <h3 className={styles.settingsTitle}>Настройки сессии</h3>

              <div className={styles.settingsGrid}>
                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Тема:</label>
                  <select
                    className={styles.settingSelect}
                    value={settings.topic || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        topic: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Все темы</option>
                    <option value="javascript">JavaScript</option>
                    <option value="react">React</option>
                    <option value="nodejs">Node.js</option>
                    <option value="css">CSS</option>
                    <option value="html">HTML</option>
                    <option value="database">Базы данных</option>
                    <option value="algorithms">Алгоритмы</option>
                    <option value="system-design">
                      Системное проектирование
                    </option>
                    <option value="general">Общие вопросы</option>
                  </select>
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Сложность:</label>
                  <select
                    className={styles.settingSelect}
                    value={settings.difficulty || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        difficulty: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Любая сложность</option>
                    <option value="easy">Легкий</option>
                    <option value="medium">Средний</option>
                    <option value="hard">Сложный</option>
                  </select>
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Режим:</label>
                  <select
                    className={styles.settingSelect}
                    value={settings.mode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mode: e.target.value,
                      })
                    }
                  >
                    <option value="study">Изучение</option>
                    <option value="review">Повторение</option>
                    <option value="exam">Экзамен</option>
                  </select>
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>
                    Количество карточек:
                  </label>
                  <select
                    className={styles.settingSelect}
                    value={settings.limit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limit: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={5}>5 карточек</option>
                    <option value={10}>10 карточек</option>
                    <option value={15}>15 карточек</option>
                    <option value={20}>20 карточек</option>
                    <option value={30}>30 карточек</option>
                    <option value={50}>50 карточек</option>
                  </select>
                </div>
              </div>

              <div className={styles.settingsActions}>
                <button
                  className={styles.applyButton}
                  onClick={() => applySettings(settings)}
                >
                  Применить настройки
                </button>
                <button className={styles.resetButton} onClick={resetSettings}>
                  Сбросить
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowSettings(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Текущие настройки */}
        <div className={styles.currentSettings}>
          <div className={styles.settingsBadges}>
            {settings.topic && (
              <span className={styles.settingBadge}>📚 {settings.topic}</span>
            )}
            {settings.difficulty && (
              <span className={styles.settingBadge}>
                {settings.difficulty === 'easy'
                  ? '🟢'
                  : settings.difficulty === 'medium'
                  ? '🟡'
                  : '🔴'}
                {settings.difficulty === 'easy'
                  ? 'Легкий'
                  : settings.difficulty === 'medium'
                  ? 'Средний'
                  : 'Сложный'}
              </span>
            )}
            <span className={styles.settingBadge}>
              {settings.mode === 'study'
                ? '📖'
                : settings.mode === 'review'
                ? '🔄'
                : '📝'}
              {settings.mode === 'study'
                ? 'Изучение'
                : settings.mode === 'review'
                ? 'Повторение'
                : 'Экзамен'}
            </span>
            <span className={styles.settingBadge}>
              🔢 {settings.limit} карточек
            </span>
          </div>
        </div>

        {/* Основной компонент флеш-карточек */}
        <FlashcardContainer
          topic={settings.topic}
          difficulty={settings.difficulty}
          mode={settings.mode}
          limit={settings.limit}
        />

        {/* Подсказки */}
        <div className={styles.helpSection}>
          <h3 className={styles.helpTitle}>💡 Как пользоваться:</h3>
          <div className={styles.helpGrid}>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>1️⃣</span>
              <div className={styles.helpText}>
                <strong>Прочитайте вопрос</strong> и попробуйте ответить
                мысленно
              </div>
            </div>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>2️⃣</span>
              <div className={styles.helpText}>
                <strong>Переверните карточку</strong> чтобы увидеть правильный
                ответ
              </div>
            </div>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>3️⃣</span>
              <div className={styles.helpText}>
                <strong>Оцените себя</strong> честно: знали, частично знали или
                не знали
              </div>
            </div>
            <div className={styles.helpItem}>
              <span className={styles.helpIcon}>4️⃣</span>
              <div className={styles.helpText}>
                <strong>Повторяйте</strong> сложные вопросы для лучшего
                запоминания
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Проверка авторизации на сервере
export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination:
          '/auth/signin?callbackUrl=' + encodeURIComponent('/flashcards'),
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}
