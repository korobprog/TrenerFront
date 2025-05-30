import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

/**
 * Кастомная страница ошибок Next.js
 * Обрабатывает ошибки 404, 500 и другие серверные ошибки
 */
function Error({ statusCode, hasGetInitialPropsRun, err }) {
  const router = useRouter();

  useEffect(() => {
    // Логируем ошибку для диагностики
    if (err) {
      console.error('🔥 Ошибка приложения:', {
        statusCode,
        message: err.message,
        stack: err.stack,
        url: router.asPath,
        timestamp: new Date().toISOString(),
      });
    }
  }, [err, statusCode, router.asPath]);

  // Получение сообщения об ошибке
  const getErrorMessage = (statusCode) => {
    switch (statusCode) {
      case 404:
        return 'Страница не найдена';
      case 500:
        return 'Внутренняя ошибка сервера';
      case 403:
        return 'Доступ запрещен';
      case 401:
        return 'Необходима авторизация';
      default:
        return 'Произошла ошибка';
    }
  };

  // Получение описания ошибки
  const getErrorDescription = (statusCode) => {
    switch (statusCode) {
      case 404:
        return 'Запрашиваемая страница не существует или была перемещена.';
      case 500:
        return 'На сервере произошла ошибка. Мы уже работаем над её устранением.';
      case 403:
        return 'У вас нет прав для доступа к этой странице.';
      case 401:
        return 'Для доступа к этой странице необходимо войти в систему.';
      default:
        return 'Что-то пошло не так. Попробуйте обновить страницу или вернуться позже.';
    }
  };

  // Получение иконки для ошибки
  const getErrorIcon = (statusCode) => {
    switch (statusCode) {
      case 404:
        return '🔍';
      case 500:
        return '⚠️';
      case 403:
        return '🚫';
      case 401:
        return '🔐';
      default:
        return '❌';
    }
  };

  return (
    <>
      <Head>
        <title>
          {statusCode} - {getErrorMessage(statusCode)}
        </title>
        <meta name="description" content={getErrorDescription(statusCode)} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e9ecef',
          }}
        >
          {/* Иконка ошибки */}
          <div
            style={{
              fontSize: '64px',
              marginBottom: '20px',
            }}
          >
            {getErrorIcon(statusCode)}
          </div>

          {/* Код ошибки */}
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#dc3545',
              margin: '0 0 16px 0',
            }}
          >
            {statusCode}
          </h1>

          {/* Заголовок ошибки */}
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#343a40',
              margin: '0 0 16px 0',
            }}
          >
            {getErrorMessage(statusCode)}
          </h2>

          {/* Описание ошибки */}
          <p
            style={{
              fontSize: '16px',
              color: '#6c757d',
              lineHeight: '1.5',
              margin: '0 0 32px 0',
            }}
          >
            {getErrorDescription(statusCode)}
          </p>

          {/* Дополнительная информация для разработчиков */}
          {process.env.NODE_ENV === 'development' && err && (
            <details
              style={{
                marginBottom: '32px',
                textAlign: 'left',
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#495057',
                  marginBottom: '8px',
                }}
              >
                Детали ошибки (режим разработки)
              </summary>
              <pre
                style={{
                  fontSize: '12px',
                  color: '#dc3545',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: '8px 0 0 0',
                }}
              >
                {err.stack || err.message}
              </pre>
            </details>
          )}

          {/* Кнопки действий */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => router.back()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#5a6268')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#6c757d')}
            >
              ← Назад
            </button>

            <Link
              href="/"
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                display: 'inline-block',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#0056b3')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#007bff')}
            >
              🏠 На главную
            </Link>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#1e7e34')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#28a745')}
            >
              🔄 Обновить
            </button>
          </div>

          {/* Дополнительные ссылки */}
          <div
            style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #dee2e6',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: '#6c757d',
                margin: '0 0 16px 0',
              }}
            >
              Нужна помощь?
            </p>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/flashcards"
                style={{
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                📚 Флеш-карточки
              </Link>
              <Link
                href="/mock-interviews"
                style={{
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                🎯 Собеседования
              </Link>
              <Link
                href="/training"
                style={{
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                💪 Тренировки
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Получение начальных пропсов для страницы ошибки
Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;

  // Логируем ошибку на сервере
  if (err) {
    console.error('🔥 Серверная ошибка:', {
      statusCode,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }

  return { statusCode };
};

export default Error;
