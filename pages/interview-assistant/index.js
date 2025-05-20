import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import styles from '../../styles/interview-assistant/Index.module.css';

// Динамический импорт компонента TextInput для оптимизации загрузки
const TextInput = dynamic(
  () => import('../../components/interview/TextInput'),
  {
    ssr: false,
    loading: () => <div className={styles.loadingPlaceholder}>Загрузка...</div>,
  }
);

/**
 * Страница ассистента для подготовки к собеседованиям Frontend разработчика
 *
 * @returns {JSX.Element} - React компонент
 */
export default function InterviewAssistant() {
  // Состояние для хранения текущего ответа
  const [answer, setAnswer] = useState('');
  // Состояние для хранения истории вопросов и ответов
  const [history, setHistory] = useState([]);
  // Состояние для отображения индикатора загрузки
  const [isLoading, setIsLoading] = useState(false);
  // Состояние для отображения модального окна истории
  const [showHistory, setShowHistory] = useState(false);
  // Состояние для отслеживания анимации
  const [isAnimating, setIsAnimating] = useState(false);
  // Состояние для хранения информации о компании и API
  const [companyInfo, setCompanyInfo] = useState({
    company: null,
    interviewDate: null,
    useCustomApi: false,
    apiType: 'anthropic',
  });

  // Ссылка на контейнер с ответом для прокрутки
  const answerContainerRef = useRef(null);

  // Получаем данные сессии пользователя
  const { data: session, status } = useSession();
  const router = useRouter();

  // Перенаправляем неавторизованных пользователей на страницу входа
  // или на страницу выбора компании, если компания не указана
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/interview-assistant');
    } else if (status === 'authenticated') {
      console.log('[DEBUG] Пользователь аутентифицирован, проверяем компанию');
      console.log('[DEBUG] Данные сессии:', {
        userId: session?.user?.id,
        email: session?.user?.email,
        status: status,
      });

      // Проверяем, указана ли компания для текущего пользователя
      const checkCompanyUsage = async () => {
        console.log('[DEBUG] Начало проверки компании для пользователя');
        try {
          console.log(
            '[DEBUG] Отправка запроса к /api/interview-assistant/usage'
          );
          // Получаем информацию о компании и дате собеседования для текущего пользователя
          const response = await fetch('/api/interview-assistant/usage');

          console.log('[DEBUG] Ответ от /api/interview-assistant/usage:', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[DEBUG] Данные о компании получены:', data);

            // Сохраняем информацию о компании и API
            setCompanyInfo({
              company: data.company,
              interviewDate: data.interviewDate,
              useCustomApi: data.useCustomApi,
              apiType: data.apiType || 'anthropic',
            });

            // Если компания не указана, перенаправляем на страницу выбора компании
            if (!data.company) {
              console.log(
                '[DEBUG] Компания не указана, перенаправляем на /interview-assistant/company'
              );
              router.push('/interview-assistant/company');
            } else {
              console.log('[DEBUG] Компания указана:', data.company);
            }
          } else {
            console.log(
              '[DEBUG] Запрос не успешен, перенаправляем на /interview-assistant/company'
            );
            // Если запрос не успешен, также перенаправляем на страницу выбора компании
            router.push('/interview-assistant/company');
          }
        } catch (error) {
          console.error('[DEBUG] Ошибка при проверке компании:', error);
          console.error('[DEBUG] Детали ошибки:', {
            message: error.message,
            stack: error.stack,
          });
          // В случае ошибки также перенаправляем на страницу выбора компании
          console.log(
            '[DEBUG] Перенаправляем на /interview-assistant/company из-за ошибки'
          );
          router.push('/interview-assistant/company');
        }
      };

      // Вызываем функцию проверки
      checkCompanyUsage();
    }
  }, [status, router]);

  // Загружаем историю из localStorage при монтировании компонента
  useEffect(() => {
    if (typeof window !== 'undefined' && session) {
      const savedHistory = localStorage.getItem(
        `interview-history-${session.user.id}`
      );
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (error) {
          console.error('Ошибка при загрузке истории:', error);
        }
      }
    }
  }, [session]);

  // Сохраняем историю в localStorage при её изменении
  useEffect(() => {
    if (typeof window !== 'undefined' && session && history.length > 0) {
      localStorage.setItem(
        `interview-history-${session.user.id}`,
        JSON.stringify(history)
      );
    }
  }, [history, session]);

  /**
   * Обработчик отправки вопроса
   *
   * @param {string} question - Текст вопроса
   */
  const handleSubmit = async (question) => {
    if (!session) {
      alert('Необходимо войти в систему для использования ассистента');
      return;
    }

    setIsLoading(true);
    setAnswer(''); // Очищаем предыдущий ответ

    try {
      console.log('Отправка запроса к API с вопросом:', question);
      // Отправляем запрос к API
      const response = await fetch('/api/interview-assistant/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        console.error(
          'Ошибка при получении ответа от API:',
          response.status,
          response.statusText
        );
        throw new Error('Ошибка при получении ответа');
      }

      const data = await response.json();
      console.log('Ответ от API:', data);
      console.log('Тип ответа:', typeof data.answer);
      console.log('Длина ответа:', data.answer ? data.answer.length : 0);

      // Добавляем вопрос и ответ в историю
      const newHistoryItem = {
        id: Date.now().toString(),
        question,
        answer: data.answer,
        timestamp: new Date().toISOString(),
        apiType: data.apiType || 'anthropic', // Сохраняем информацию о типе API
      };

      setHistory((prevHistory) => [newHistoryItem, ...prevHistory]);

      // Устанавливаем ответ с анимацией
      setIsAnimating(true);
      setAnswer(data.answer);

      // Прокручиваем к началу ответа
      if (answerContainerRef.current) {
        answerContainerRef.current.scrollTop = 0;
      }
    } catch (error) {
      console.error('Ошибка при получении ответа:', error);
      setAnswer(
        'Произошла ошибка при получении ответа. Пожалуйста, попробуйте еще раз.'
      );
    } finally {
      setIsLoading(false);
      // Сбрасываем состояние анимации через 500мс
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  };

  /**
   * Обработчик выбора вопроса из истории
   *
   * @param {Object} historyItem - Элемент истории
   */
  const handleSelectFromHistory = (historyItem) => {
    setAnswer(historyItem.answer);
    setShowHistory(false);
  };

  // Если пользователь не авторизован, показываем сообщение о загрузке
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Frontend Interview Assistant</title>
        <meta
          name="description"
          content="Ассистент для подготовки к собеседованиям Frontend разработчика"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>

      <div className={styles.container}>
        {/* Индикатор используемого API */}
        <div className={styles.apiIndicator}>
          <span className={styles.apiLabel}>API:</span>
          <span className={styles.apiType}>
            {companyInfo.apiType === 'langdock' ? 'LangDock' : 'Anthropic'}
            {companyInfo.useCustomApi && ' (Пользовательский)'}
          </span>
        </div>

        {/* Кнопка для отображения истории */}
        <button
          className={styles.historyButton}
          onClick={() => setShowHistory(true)}
          aria-label="Показать историю вопросов"
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
            <path d="M12 8v4l3 3"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </button>

        {/* Контейнер для ответа */}
        <div className={styles.answerContainer}>
          {answer ? (
            <div
              ref={answerContainerRef}
              className={`${styles.answerText} ${
                isAnimating ? styles.fadeIn : ''
              }`}
            >
              {console.log('Рендеринг ответа:', answer)}
              {console.log('Длина ответа при рендеринге:', answer.length)}
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          ) : (
            <div className={styles.answerText}>
              <h2>Задайте вопрос по Frontend разработке</h2>
              <p>
                Этот ассистент поможет вам подготовиться к собеседованию,
                отвечая на вопросы по HTML, CSS, JavaScript, React и другим
                технологиям Frontend разработки.
              </p>
              <p>
                Просто введите свой вопрос в поле ниже и нажмите кнопку отправки
                или клавишу Enter.
              </p>
            </div>
          )}

          {/* Индикатор загрузки */}
          {isLoading && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
            </div>
          )}
        </div>

        {/* Контейнер для ввода текста */}
        <div className={styles.inputContainer}>
          <TextInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Модальное окно истории */}
        {showHistory && (
          <div className={styles.historyModal}>
            <div className={styles.historyContent}>
              <button
                className={styles.closeButton}
                onClick={() => setShowHistory(false)}
                aria-label="Закрыть историю"
              >
                &times;
              </button>
              <h2>История вопросов</h2>
              {history.length === 0 ? (
                <p>История пуста</p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className={styles.historyItem}
                    onClick={() => handleSelectFromHistory(item)}
                  >
                    <div className={styles.historyQuestion}>
                      {item.question}
                    </div>
                    <div className={styles.historyMeta}>
                      <div className={styles.historyTimestamp}>
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      {item.apiType && (
                        <div className={styles.historyApiType}>
                          API:{' '}
                          {item.apiType === 'langdock'
                            ? 'LangDock'
                            : 'Anthropic'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
