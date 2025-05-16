import { NextResponse } from 'next/server';

// Список путей, для которых нужно обновлять токены
const PROTECTED_PATHS = ['/api/mock-interviews', '/api/calendar'];

// Порог в секундах, при котором токен считается "скоро истекающим"
const TOKEN_EXPIRY_THRESHOLD = 300; // 5 минут

/**
 * Проверяет, нужно ли обновлять токены для данного пути
 * @param {string} pathname - Путь запроса
 * @returns {boolean} - true, если нужно обновлять токены
 */
function shouldRefreshToken(pathname) {
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Проверяет, нужно ли обновлять токен по времени истечения
 * @returns {boolean} - true, если токен отсутствует или скоро истечет
 */
function isTokenExpiringSoon() {
  const currentTime = Date.now();
  const expiryDate = parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0', 10);

  // Проверяем, истекает ли токен в ближайшее время
  const thresholdTime = currentTime + TOKEN_EXPIRY_THRESHOLD * 1000;

  // Если токен отсутствует или скоро истечет, нужно обновить
  return (
    !process.env.GOOGLE_ACCESS_TOKEN ||
    !expiryDate ||
    expiryDate < thresholdTime
  );
}

/**
 * Обновляет токены через API-маршрут
 * @returns {Promise<void>}
 */
async function refreshTokens() {
  try {
    // Используем абсолютный URL для запроса к API
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/auth/refresh-google-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Ошибка при обновлении токенов');
    }

    console.log('Middleware: Токены успешно обновлены');
    console.log('Middleware: Новое время истечения:', data.expiry_date);
  } catch (error) {
    console.error('Middleware: Ошибка при обновлении токенов:', error);
    throw error;
  }
}

/**
 * Next.js middleware для автоматического обновления токенов
 * @param {Request} request - HTTP запрос
 */
export async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Избегаем бесконечной рекурсии: не обновляем токены при запросе к самому API обновления токенов
  if (
    pathname !== '/api/auth/refresh-google-token' &&
    shouldRefreshToken(pathname)
  ) {
    try {
      // Проверяем, нужно ли обновлять токен по времени истечения
      if (isTokenExpiringSoon()) {
        console.log(
          `Middleware: Токен отсутствует или скоро истечет, обновляем для пути ${pathname}`
        );
        await refreshTokens();
      } else {
        console.log(
          `Middleware: Токен еще действителен, пропускаем обновление для пути ${pathname}`
        );
      }
    } catch (error) {
      console.error('Middleware: Ошибка при обновлении токенов:', error);
      // Продолжаем выполнение запроса даже при ошибке обновления токенов
      // Это позволит API вернуть соответствующую ошибку, если токены недействительны
    }
  }

  // Продолжаем выполнение запроса
  return NextResponse.next();
}

// Указываем, для каких путей применять middleware
export const config = {
  matcher: ['/api/:path*'],
};
