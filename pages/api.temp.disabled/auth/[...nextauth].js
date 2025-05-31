import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '../../../lib/prisma';
import {
  verifyPassword,
  validateEmail,
  validateUsername,
} from '../../../lib/utils/passwordUtils';

/**
 * Обрабатывает первую регистрацию пользователя и начисляет стартовый балл
 * @param {Object} user - объект пользователя
 * @param {Object} account - объект аккаунта провайдера
 */
async function handleFirstTimeUserRegistration(user, account) {
  try {
    const STARTUP_POINTS = 1; // Стартовый балл для новых пользователей

    // Используем транзакцию для атомарности операций
    await prisma.$transaction(async (tx) => {
      // Проверяем, есть ли уже транзакция начисления стартового балла
      const existingStartupTransaction = await tx.pointsTransaction.findFirst({
        where: {
          userId: user.id,
          type: 'startup_bonus',
        },
      });

      // Создаем транзакцию только если её ещё нет
      if (!existingStartupTransaction) {
        // Создаем запись UserPoints с стартовым балансом
        await tx.userPoints.create({
          data: {
            userId: user.id,
            points: STARTUP_POINTS,
          },
        });

        // Создаем транзакцию начисления
        await tx.pointsTransaction.create({
          data: {
            userId: user.id,
            amount: STARTUP_POINTS,
            type: 'startup_bonus',
            description: 'Стартовый балл за регистрацию',
          },
        });

        console.log(
          `Начислен стартовый балл (${STARTUP_POINTS}) пользователю: ${user.email}`
        );
      }
    });
  } catch (error) {
    console.error('Ошибка при начислении стартового балла:', error);
    // Не прерываем процесс авторизации из-за ошибки начисления баллов
  }
}

// Логи для отладки (только в режиме разработки и при первой инициализации)
if (process.env.NODE_ENV === 'development' && !global.nextAuthInitialized) {
  console.log('NextAuth: Инициализация с параметрами:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
  global.nextAuthInitialized = true;
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Разрешаем связывание аккаунтов по email
      authorization: {
        params: {
          scope:
            'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    // GitHub провайдер включается только если настроены валидные учетные данные
    ...(process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    process.env.GITHUB_CLIENT_ID !== 'your_github_client_id'
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true, // Разрешаем связывание аккаунтов по email
            authorization: {
              params: {
                scope: 'read:user user:email',
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Email или имя пользователя', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Валидация входных данных
          const isEmail = validateEmail(credentials.username);
          const usernameValidation = validateUsername(credentials.username);

          if (!isEmail && !usernameValidation.isValid) {
            return null;
          }

          // Поиск пользователя по email или username
          let user = null;

          if (isEmail) {
            user = await prisma.user.findUnique({
              where: { email: credentials.username },
            });
          } else {
            // Поиск по имени пользователя (для обратной совместимости с суперадмином)
            if (
              credentials.username === 'admin' ||
              credentials.username === 'superadmin'
            ) {
              user = await prisma.user.findFirst({
                where: { role: 'superadmin' },
              });
            }
          }

          if (!user) {
            return null;
          }

          // Проверка пароля
          if (!user.password) {
            return null;
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          // Проверка блокировки пользователя
          if (user.isBlocked) {
            return null;
          }

          // Обновляем время последнего входа
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error('NextAuth authorize: Ошибка при авторизации:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Если есть объект пользователя (при первом входе), добавляем данные в токен
      if (user) {
        token.role = user.role;
        token.userId = user.id;
        token.provider = account?.provider;
      }

      // Добавляем информацию о провайдере для отслеживания
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }

      return token;
    },
    async session({ session, token, user }) {
      // Добавляем данные пользователя в объект сессии
      if (user) {
        session.user.id = user.id;
        session.user.role = user.role;
      } else if (token) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.provider = token.provider;
        session.user.providerAccountId = token.providerAccountId;
      }

      // Добавляем метку времени для предотвращения кэширования
      session.timestamp = Date.now();

      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Для входа через OAuth провайдеры (Google, GitHub)
        if (account?.provider === 'google' || account?.provider === 'github') {
          // Проверяем, является ли это первой регистрацией пользователя
          await handleFirstTimeUserRegistration(user, account);
          return true;
        }

        // Для входа через credentials проверяем дополнительные условия
        if (account?.provider === 'credentials') {
          // Разрешаем вход для всех пользователей с валидными учетными данными
          // Проверка роли и блокировки уже выполнена в authorize функции
          return true;
        }

        // Для других провайдеров по умолчанию разрешаем вход
        return true;
      } catch (error) {
        console.error('NextAuth signIn: Ошибка при проверке входа:', error);
        return false;
      }
    },
  },
  events: {
    async createUser({ user }) {
      // Начисляем стартовый балл при создании нового пользователя
      await handleFirstTimeUserRegistration(user, { provider: 'oauth' });
    },
  },
  pages: {
    signIn: '/auth/signin', // Кастомная страница входа
    error: '/auth/error', // Страница ошибки
    // signOut: '/auth/signout', // Опционально: страница выхода
  },
  session: {
    strategy: 'jwt', // Используем JWT для сессий
    maxAge: 24 * 60 * 60, // 24 часа
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
