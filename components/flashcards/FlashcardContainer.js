import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import FlashcardItem from './FlashcardItem';
import FlashcardControls from './FlashcardControls';
import SessionProgress from './SessionProgress';
import styles from '../../styles/Flashcards.module.css';

/**
 * Основной контейнер для управления состоянием флеш-карточек
 * Решает проблему правильной навигации между вопросами и ответами
 */
const FlashcardContainer = ({
  topic = null,
  difficulty = null,
  mode = 'study',
  limit = 10,
}) => {
  const { data: session } = useSession();

  // Состояние данных
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [totalAvailable, setTotalAvailable] = useState(0);

  // Состояние UI
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [error, setError] = useState(null);

  // Состояние ответов
  const [answers, setAnswers] = useState({});

  // Статистика сессии
  const [sessionStats, setSessionStats] = useState({
    known: 0,
    unknown: 0,
    partial: 0,
  });

  // Загрузка вопросов при инициализации
  useEffect(() => {
    if (session) {
      loadQuestions();
    }
  }, [session, topic, difficulty, mode, limit]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        mode,
        limit: limit.toString(),
        excludeAnswered: 'false',
      });

      if (topic) params.append('topic', topic);
      if (difficulty) params.append('difficulty', difficulty);

      const response = await fetch(`/api/flashcards/questions?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки вопросов');
      }

      const data = await response.json();

      console.log('=== ДИАГНОСТИКА ФРОНТЕНДА ФЛЕШ-КАРТОЧЕК ===');
      console.log('🔍 Ответ от API:', data);
      console.log(
        '🔍 Количество полученных вопросов:',
        data.questions?.length || 0
      );
      console.log('🔍 Всего доступных вопросов:', data.totalAvailable || 0);
      console.log('🔍 Fallback режим:', data.fallback || false);
      if (data.message) {
        console.log('🔍 Сообщение от API:', data.message);
      }
      console.log(
        '🔍 Первые 3 вопроса:',
        data.questions?.slice(0, 3).map((q) => ({
          id: q.id,
          text: q.questionText?.substring(0, 50) + '...',
          topic: q.topic,
          difficulty: q.difficulty,
        }))
      );
      console.log('=== КОНЕЦ ДИАГНОСТИКИ ФРОНТЕНДА ===');

      // Проверяем, есть ли вопросы
      if (!data.questions || data.questions.length === 0) {
        const errorMessage =
          data.message ||
          'Вопросы не найдены с выбранными фильтрами. Попробуйте изменить настройки или добавить новые вопросы в базу данных.';
        setError(errorMessage);
        setQuestions([]);
        setSessionId(null);
        setTotalAvailable(0);
        return;
      }

      // Проверяем, что у вопросов есть текст
      const validQuestions = data.questions.filter(
        (q) => q.questionText && q.questionText.trim() !== ''
      );

      if (validQuestions.length === 0) {
        setError(
          'Найденные вопросы не содержат текста. Проверьте базу данных.'
        );
        setQuestions([]);
        setSessionId(null);
        setTotalAvailable(0);
        return;
      }

      if (validQuestions.length < data.questions.length) {
        console.warn(
          `⚠️ Отфильтровано ${
            data.questions.length - validQuestions.length
          } вопросов без текста`
        );
      }

      setQuestions(validQuestions);
      setSessionId(data.sessionId);
      setTotalAvailable(data.totalAvailable || 0);
      setCurrentIndex(0);
      setIsFlipped(false);
      setAnswers({});
      setSessionStats({ known: 0, unknown: 0, partial: 0 });

      // Показываем сообщение о fallback режиме
      if (data.fallback && data.message) {
        console.info('ℹ️ Fallback режим:', data.message);
      }
    } catch (err) {
      console.error('❌ ОШИБКА ЗАГРУЗКИ ВОПРОСОВ:', err);
      console.error('❌ Детали ошибки:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError('Не удалось загрузить вопросы. Попробуйте обновить страницу.');
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация ответа для текущего вопроса
  const generateAnswer = async (questionId, questionText, context) => {
    try {
      console.log('🤖 Начинаем генерацию ответа для вопроса:', questionId);
      setIsGeneratingAnswer(true);
      setError(null);

      if (!questionText || questionText.trim() === '') {
        throw new Error('Текст вопроса пуст');
      }

      const response = await fetch('/api/flashcards/generate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          questionText,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Ошибка API генерации ответа:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        // Обработка специфических ошибок
        if (response.status === 429) {
          throw new Error(
            errorData.message || 'Превышен лимит запросов. Попробуйте позже.'
          );
        } else if (response.status === 503) {
          throw new Error(
            errorData.message || 'Сервис временно недоступен. Попробуйте позже.'
          );
        } else if (response.status === 408) {
          throw new Error(
            errorData.message || 'Превышено время ожидания. Попробуйте еще раз.'
          );
        } else {
          throw new Error(
            errorData.message || `Ошибка сервера: ${response.status}`
          );
        }
      }

      const data = await response.json();

      if (!data.answer) {
        throw new Error('Получен пустой ответ от сервера');
      }

      console.log('✅ Ответ успешно получен:', {
        questionId,
        answerLength: data.answer.length,
        source: data.source,
        cached: data.cached,
      });

      // Сохраняем ответ в локальном состоянии
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          answer: data.answer,
          generatedAt: data.generatedAt,
          cached: data.cached,
          source: data.source,
        },
      }));

      return data.answer;
    } catch (err) {
      console.error('❌ Ошибка генерации ответа:', err);

      // Устанавливаем более информативное сообщение об ошибке
      let errorMessage = 'Не удалось сгенерировать ответ. ';

      if (err.message.includes('лимит')) {
        errorMessage += err.message;
      } else if (err.message.includes('недоступен')) {
        errorMessage += err.message;
      } else if (err.message.includes('время ожидания')) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Попробуйте еще раз или обратитесь к администратору.';
      }

      setError(errorMessage);

      // Возвращаем fallback ответ
      return 'Извините, не удалось сгенерировать ответ. Попробуйте обновить страницу или обратитесь к администратору.';
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Навигация к следующему вопросу
  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false); // ВАЖНО: всегда показываем ВОПРОС при переходе
    }
  }, [currentIndex, questions.length]);

  // Переворот карточки (показать ответ)
  const handleFlip = useCallback(async () => {
    console.log('🔄 handleFlip вызван, isFlipped:', isFlipped);

    // Очищаем предыдущие ошибки
    setError(null);

    if (questions.length === 0) {
      console.warn('⚠️ handleFlip: нет вопросов для переворота');
      setError('Нет доступных вопросов для изучения');
      return;
    }

    const currentQuestion = questions[currentIndex];

    if (!currentQuestion) {
      console.error(
        '❌ handleFlip: текущий вопрос не найден, currentIndex:',
        currentIndex
      );
      setError(
        'Ошибка: текущий вопрос не найден. Попробуйте обновить страницу.'
      );
      return;
    }

    if (
      !currentQuestion.questionText ||
      currentQuestion.questionText.trim() === ''
    ) {
      console.error('❌ handleFlip: вопрос не содержит текста');
      setError('Ошибка: вопрос не содержит текста. Пропускаем к следующему.');
      setTimeout(() => {
        handleNext();
      }, 2000);
      return;
    }

    console.log('🔄 Текущий вопрос:', {
      id: currentQuestion.id,
      hasText: !!currentQuestion.questionText,
      hasAnswer: currentQuestion.hasAnswer,
      isInAnswers: !!answers[currentQuestion.id],
    });

    try {
      if (!isFlipped) {
        // Переворачиваем на сторону ответа
        console.log('🔄 Переворачиваем карточку на сторону ответа');
        setIsFlipped(true);

        // Если ответа нет, генерируем его
        if (!answers[currentQuestion.id] && !currentQuestion.hasAnswer) {
          console.log('🤖 Генерируем ответ для вопроса:', currentQuestion.id);
          await generateAnswer(
            currentQuestion.id,
            currentQuestion.questionText,
            {
              topic: currentQuestion.topic,
              difficulty: currentQuestion.difficulty,
              tags: currentQuestion.tags,
            }
          );
        } else {
          console.log('✅ Ответ уже есть, генерация не требуется');
        }
      } else {
        // Переворачиваем обратно на вопрос
        console.log('🔄 Переворачиваем карточку обратно на вопрос');
        setIsFlipped(false);
      }
    } catch (error) {
      console.error('❌ Ошибка в handleFlip:', error);
      setError('Ошибка при перевороте карточки. Попробуйте еще раз.');

      // Возвращаем карточку в исходное состояние при ошибке
      setIsFlipped(false);
    }
  }, [questions, currentIndex, isFlipped, answers, handleNext]);

  // Навигация к предыдущему вопросу
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false); // ВАЖНО: всегда показываем ВОПРОС при переходе
    }
  }, [currentIndex]);

  // Оценка ответа пользователем
  const handleEvaluate = async (evaluation) => {
    if (questions.length === 0 || !sessionId) return;

    const currentQuestion = questions[currentIndex];

    try {
      const response = await fetch('/api/flashcards/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          sessionId,
          evaluation,
          timeSpent: 0, // TODO: добавить отслеживание времени
          wasGenerated: !!answers[currentQuestion.id],
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения оценки');
      }

      // Обновляем статистику сессии
      setSessionStats((prev) => ({
        ...prev,
        [evaluation === 'known'
          ? 'known'
          : evaluation === 'unknown'
          ? 'unknown'
          : 'partial']:
          prev[
            evaluation === 'known'
              ? 'known'
              : evaluation === 'unknown'
              ? 'unknown'
              : 'partial'
          ] + 1,
      }));

      // Автоматически переходим к следующему вопросу
      setTimeout(() => {
        handleNext();
      }, 500);
    } catch (err) {
      console.error('Ошибка сохранения оценки:', err);
      setError('Не удалось сохранить оценку. Попробуйте еще раз.');
    }
  };

  // Обработка ошибок
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <h3>Произошла ошибка</h3>
          <p>{error}</p>
          <button onClick={loadQuestions} className={styles.retryButton}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>
          <div className={styles.spinner}></div>
          <p>Загрузка вопросов...</p>
        </div>
      </div>
    );
  }

  // Нет вопросов
  if (questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyMessage}>
          <h3>Вопросы не найдены</h3>
          <p>Попробуйте изменить фильтры или добавить новые вопросы.</p>
          <button onClick={loadQuestions} className={styles.retryButton}>
            Обновить
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className={styles.container}>
      <SessionProgress
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        sessionStats={sessionStats}
        mode={mode}
      />

      <div className={styles.flashcardWrapper}>
        <FlashcardItem
          question={currentQuestion}
          answer={currentAnswer}
          isFlipped={isFlipped}
          isGeneratingAnswer={isGeneratingAnswer}
          onFlip={handleFlip}
        />
      </div>

      <FlashcardControls
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        isFlipped={isFlipped}
        isGeneratingAnswer={isGeneratingAnswer}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onFlip={handleFlip}
        onEvaluate={handleEvaluate}
      />
    </div>
  );
};

export default FlashcardContainer;
