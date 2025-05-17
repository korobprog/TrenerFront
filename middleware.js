import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Список путей, для которых нужно обновлять токены
const PROTECTED_PATHS = ['/api/mock-interviews', '/api/calendar'];

// Список путей административной панели, требующих аутентификации
const ADMIN_PATHS = ['/admin'];

// Путь для входа администратора
const ADMIN_SIGNIN_PATH = '/admin/signin';

// Пути, которые следует исключить из проверок (статические ресурсы, API и т.д.)
const EXCLUDED_PATHS = [
  '/_next/',
  '/static/',
  '/images/',
  '/favicon.ico',
  '/api/auth/refresh-google-token',
];

// Порог в секундах, при котором токен считается "скоро истекающим"
const TOKEN_EXPIRY_THRESHOLD = 300; // 5 минут

/**
 * Проверяет, нужно ли обновлять токены для данного пути
 * @param {string} pathname - Путь запроса
 * @returns {boolean} - true, если нужно обновлять токены
 */
function shouldRefreshToken(pathname) {
  // Проверяем, не является ли путь исключенным
  if (isExcludedPath(pathname)) return false;

  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Проверяет, является ли путь административным
 * @param {string} pathname - Путь запроса
 * @returns {boolean} - true, если путь относится к административной панели
 */
function isAdminPath(pathname) {
  // Проверяем, не является ли путь исключенным
  if (isExcludedPath(pathname)) return false;

  return ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Проверяет, является ли путь исключенным из проверок
 * @param {string} pathname - Путь запроса
 * @returns {boolean} - true, если путь исключен из проверок
 */
function isExcludedPath(pathname) {
  return EXCLUDED_PATHS.some((path) => pathname.startsWith(path));
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

    // Успешное обновление токенов
  } catch (error) {
    console.error('Middleware: Ошибка при обновлении токенов');
    throw error;
  }
}

/**
 * Next.js middleware для автоматического обновления токенов и защиты административных страниц
 * @param {Request} request - HTTP запрос
 */
export async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Пропускаем проверки для исключенных путей
  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  // Обработка обновления токенов только для защищенных путей
  if (shouldRefreshToken(pathname)) {
    try {
      // Проверяем, нужно ли обновлять токен по времени истечения
      if (isTokenExpiringSoon()) {
        await refreshTokens();
      }
    } catch (error) {
      // Логируем только критические ошибки без лишних деталей
      console.error('Middleware: Ошибка обновления токенов');
    }
  }

  // Защита административных страниц
  if (isAdminPath(pathname) && pathname !== ADMIN_SIGNIN_PATH) {
    // Получаем токен сессии
    const token = await getToken({ req: request });

    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!token) {
      const url = new URL(ADMIN_SIGNIN_PATH, request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // Проверяем роль пользователя
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Продолжаем выполнение запроса
  return NextResponse.next();
}

// Указываем, для каких путей применять middleware
export const config = {
  matcher: [
    // Исключаем статические ресурсы из проверок
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    '/api/:path*',
    '/admin/:path*',
  ],
};
