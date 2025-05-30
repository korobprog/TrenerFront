import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';
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
    const timestamp = new Date().toISOString();

    console.log(`     💰 [${timestamp}] Обработка начисления стартового балла`);
    console.log(
      `        👤 Пользователь: ${user.email || user.name || user.id}`
    );
    console.log(`        🆔 User ID: ${user.id}`);
    console.log(`        🔑 Провайдер: ${account?.provider || 'неизвестный'}`);
    console.log(`        💎 Стартовый балл: ${STARTUP_POINTS}`);

    // Используем транзакцию для атомарности операций
    await prisma.$transaction(async (tx) => {
      console.log(`        🔄 Начало транзакции начисления баллов`);

      // Проверяем, есть ли уже транзакция начисления стартового балла
      const existingStartupTransaction = await tx.pointsTransaction.findFirst({
        where: {
          userId: user.id,
          type: 'startup_bonus',
        },
      });

      if (existingStartupTransaction) {
        console.log(`        ⚠️ Стартовый балл уже был начислен ранее`);
        console.log(
          `        📅 Дата предыдущего начисления: ${existingStartupTransaction.createdAt}`
        );
        return;
      }

      console.log(`        ✨ Начисление нового стартового балла`);

      // Создаем запись UserPoints с стартовым балансом
      const userPoints = await tx.userPoints.create({
        data: {
          userId: user.id,
          points: STARTUP_POINTS,
        },
      });
      console.log(
        `        📊 Создана запись UserPoints с ID: ${userPoints.id}`
      );

      // Создаем транзакцию начисления
      const transaction = await tx.pointsTransaction.create({
        data: {
          userId: user.id,
          amount: STARTUP_POINTS,
          type: 'startup_bonus',
          description: 'Стартовый балл за регистрацию',
        },
      });
      console.log(
        `        📝 Создана транзакция начисления с ID: ${transaction.id}`
      );

      console.log(
        `        ✅ Стартовый балл (${STARTUP_POINTS}) успешно начислен пользователю: ${
          user.email || user.name
        }`
      );
    });

    console.log(
      `        🎉 Транзакция начисления стартового балла завершена успешно`
    );
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(
      `        ❌ [${timestamp}] Ошибка при начислении стартового балла:`,
      error
    );
    console.error(
      `        👤 Пользователь: ${user.email || user.id || 'неизвестный'}`
    );
    console.error(`        📋 Детали ошибки:`, error.message);
    console.error(`        🔄 Стек ошибки:`, error.stack);
    // Не прерываем процесс авторизации из-за ошибки начисления баллов
    console.log(
      `        ⚠️ Продолжаем процесс авторизации несмотря на ошибку начисления баллов`
    );
  }
}

/**
 * Проверяет настройки аутентификации пользователя
 * @param {string} userId - ID пользователя
 * @param {string} provider - провайдер аутентификации
 * @returns {boolean} - разрешен ли данный способ входа
 */
async function checkUserAuthSettings(userId, provider) {
  try {
    console.log(
      `     🔍 Проверка настроек аутентификации для пользователя ${userId}, провайдер: ${provider}`
    );

    const authSettings = await prisma.userAuthSettings.findUnique({
      where: { userId },
    });

    // Если настройки не найдены, разрешаем все способы входа по умолчанию
    if (!authSettings) {
      console.log(
        `     ⚠️ Настройки аутентификации не найдены, разрешаем вход по умолчанию`
      );
      return true;
    }

    console.log(`     📋 Найдены настройки аутентификации:`);
    console.log(
      `        📧 Email: ${
        authSettings.enableEmailAuth ? 'разрешен' : 'запрещен'
      }`
    );
    console.log(
      `        🔗 Google: ${
        authSettings.enableGoogleAuth ? 'разрешен' : 'запрещен'
      }`
    );
    console.log(
      `        🐙 GitHub: ${
        authSettings.enableGithubAuth ? 'разрешен' : 'запрещен'
      }`
    );
    console.log(
      `        🔐 Credentials: ${
        authSettings.enableCredentialsAuth ? 'разрешен' : 'запрещен'
      }`
    );
    console.log(
      `        🔒 2FA: ${
        authSettings.requireTwoFactor ? 'требуется' : 'не требуется'
      }`
    );

    // Проверяем разрешенные способы входа
    let isAllowed = true;
    switch (provider) {
      case 'email':
        isAllowed = authSettings.enableEmailAuth;
        break;
      case 'google':
        isAllowed = authSettings.enableGoogleAuth;
        break;
      case 'github':
        isAllowed = authSettings.enableGithubAuth;
        break;
      case 'credentials':
        isAllowed = authSettings.enableCredentialsAuth;
        break;
      default:
        isAllowed = true;
        console.log(
          `     ⚠️ Неизвестный провайдер ${provider}, разрешаем по умолчанию`
        );
    }

    console.log(
      `     ${isAllowed ? '✅' : '❌'} Провайдер ${provider}: ${
        isAllowed ? 'разрешен' : 'запрещен'
      }`
    );
    return isAllowed;
  } catch (error) {
    console.error(
      `     ❌ Ошибка при проверке настроек аутентификации для пользователя ${userId}:`,
      error
    );
    console.error(`     📋 Детали ошибки:`, error.message);
    // В случае ошибки разрешаем вход
    console.log(`     ⚠️ В случае ошибки разрешаем вход по умолчанию`);
    return true;
  }
}

// Логи для отладки (только в режиме разработки и при первой инициализации)
if (process.env.NODE_ENV === 'development' && !global.nextAuthInitialized) {
  console.log('NextAuth: Инициализация с параметрами:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
  console.log('YANDEX_SMTP_HOST:', process.env.YANDEX_SMTP_HOST);
  global.nextAuthInitialized = true;
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email провайдер с Яндекс SMTP
    EmailProvider({
      server: {
        host: process.env.YANDEX_SMTP_HOST,
        port: parseInt(process.env.YANDEX_SMTP_PORT),
        secure: process.env.YANDEX_SMTP_SECURE === 'true',
        auth: {
          user: process.env.YANDEX_SMTP_USER,
          pass: process.env.YANDEX_SMTP_PASSWORD,
        },
        debug: process.env.NODE_ENV === 'development', // Включаем отладку в режиме разработки
        logger: process.env.NODE_ENV === 'development', // Включаем логирование в режиме разработки
      },
      from: process.env.YANDEX_EMAIL_FROM,
      maxAge: 24 * 60 * 60, // 24 часа
      async sendVerificationRequest({ identifier: email, url, provider }) {
        try {
          console.log('📧 NextAuth: Отправка магической ссылки');
          console.log('   📧 Email:', email);
          console.log('   🔗 URL:', url);
          console.log('   ⚙️ Provider:', provider.from);

          // Используем стандартную отправку NextAuth
          const { createTransport } = await import('nodemailer');
          const transport = createTransport(provider.server);

          const result = await transport.sendMail({
            to: email,
            from: provider.from,
            subject: 'Вход в систему - Сервис собеседований',
            text: `Войдите в систему, перейдя по ссылке: ${url}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Вход в систему</h2>
                <p>Здравствуйте!</p>
                <p>Вы запросили вход в систему через магическую ссылку.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${url}"
                     style="background-color: #0070f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Войти в систему
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Ссылка действительна в течение 24 часов.
                </p>
                <p style="color: #666; font-size: 14px;">
                  Если вы не запрашивали этот вход, просто проигнорируйте это письмо.
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  С уважением,<br>
                  Команда сервиса собеседований
                </p>
              </div>
            `,
          });

          console.log('✅ NextAuth: Email отправлен успешно');
          console.log('   📧 Message ID:', result.messageId);
        } catch (error) {
          console.error('❌ NextAuth: Ошибка отправки email:', error);
          throw error;
        }
      },
    }),
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
        const timestamp = new Date().toISOString();
        const userInfo = user?.email || user?.name || user?.id || 'неизвестный';
        const provider = account?.provider || 'неизвестный';

        console.log(`🔐 [${timestamp}] NextAuth SignIn: Попытка входа`);
        console.log(`   👤 Пользователь: ${userInfo}`);
        console.log(`   🔑 Провайдер: ${provider}`);
        console.log(`   📧 Email: ${email || 'не указан'}`);
        console.log(`   🆔 User ID: ${user?.id || 'новый пользователь'}`);

        // Проверяем настройки аутентификации пользователя для существующих пользователей
        if (user?.id) {
          console.log(
            `   🔍 Проверка настроек аутентификации для пользователя ${user.id}`
          );

          const isAllowed = await checkUserAuthSettings(
            user.id,
            account?.provider
          );

          if (!isAllowed) {
            console.log(
              `   ❌ Вход через ${account?.provider} отключен для пользователя ${user.email}`
            );
            console.log(
              `   🚫 Авторизация отклонена по настройкам пользователя`
            );
            return false;
          }

          console.log(
            `   ✅ Настройки аутентификации разрешают вход через ${provider}`
          );
        }

        // Для входа через OAuth провайдеры (Google, GitHub)
        if (account?.provider === 'google' || account?.provider === 'github') {
          console.log(`   🔗 OAuth авторизация через ${account.provider}`);
          console.log(
            `   📋 Профиль: ${JSON.stringify(
              profile?.name || profile?.login || 'не указан'
            )}`
          );

          // Проверяем, является ли это первой регистрацией пользователя
          await handleFirstTimeUserRegistration(user, account);

          console.log(`   ✅ OAuth авторизация успешна`);
          return true;
        }

        // Для входа через email (магические ссылки)
        if (account?.provider === 'email') {
          console.log(`   📧 Email авторизация через магическую ссылку`);
          console.log(`   📬 Email адрес: ${email}`);
          console.log(`   ✅ Email авторизация успешна`);
          return true;
        }

        // Для входа через credentials проверяем дополнительные условия
        if (account?.provider === 'credentials') {
          console.log(`   🔐 Credentials авторизация`);
          console.log(`   👤 Роль пользователя: ${user?.role || 'не указана'}`);
          console.log(
            `   🔒 Статус блокировки: ${
              user?.isBlocked ? 'заблокирован' : 'активен'
            }`
          );

          // Разрешаем вход для всех пользователей с валидными учетными данными
          // Проверка роли и блокировки уже выполнена в authorize функции
          console.log(`   ✅ Credentials авторизация успешна`);
          return true;
        }

        // Для других провайдеров по умолчанию разрешаем вход
        console.log(
          `   ⚠️ Неизвестный провайдер: ${provider}, разрешаем вход по умолчанию`
        );
        return true;
      } catch (error) {
        const timestamp = new Date().toISOString();
        console.error(
          `❌ [${timestamp}] NextAuth signIn: Ошибка при проверке входа:`,
          error
        );
        console.error(
          `   👤 Пользователь: ${user?.email || user?.id || 'неизвестный'}`
        );
        console.error(`   🔑 Провайдер: ${account?.provider || 'неизвестный'}`);
        console.error(`   📋 Детали ошибки:`, error.message);
        return false;
      }
    },
  },
  events: {
    async createUser({ user }) {
      const timestamp = new Date().toISOString();
      console.log(
        `🆕 [${timestamp}] NextAuth Event: Создание нового пользователя`
      );
      console.log(`   👤 Пользователь: ${user.email || user.name || user.id}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   📧 Email: ${user.email || 'не указан'}`);
      console.log(`   👤 Имя: ${user.name || 'не указано'}`);

      // Начисляем стартовый балл при создании нового пользователя
      console.log(`   💰 Начисление стартового балла...`);
      await handleFirstTimeUserRegistration(user, { provider: 'oauth' });

      // Создаем настройки аутентификации по умолчанию для нового пользователя
      try {
        console.log(`   ⚙️ Создание настроек аутентификации по умолчанию...`);
        await prisma.userAuthSettings.create({
          data: {
            userId: user.id,
            enableEmailAuth: true,
            enableGoogleAuth: true,
            enableGithubAuth: true,
            enableCredentialsAuth: true,
            requireTwoFactor: false,
            sessionTimeout: 24,
          },
        });
        console.log(`   ✅ Настройки аутентификации созданы успешно`);
      } catch (error) {
        console.error(
          `   ❌ Ошибка при создании настроек аутентификации:`,
          error
        );
      }

      console.log(`   🎉 Создание пользователя завершено успешно`);
    },

    async signIn({ user, account, profile, isNewUser }) {
      const timestamp = new Date().toISOString();
      console.log(`🔑 [${timestamp}] NextAuth Event: Успешный вход в систему`);
      console.log(`   👤 Пользователь: ${user.email || user.name || user.id}`);
      console.log(`   🔑 Провайдер: ${account?.provider || 'неизвестный'}`);
      console.log(`   🆕 Новый пользователь: ${isNewUser ? 'да' : 'нет'}`);
      console.log(`   🕐 Время входа: ${timestamp}`);

      if (account?.provider) {
        console.log(`   📋 Детали провайдера: ${account.provider}`);
        if (account.providerAccountId) {
          console.log(
            `   🆔 ID аккаунта провайдера: ${account.providerAccountId}`
          );
        }
      }
    },

    async signOut({ session, token }) {
      const timestamp = new Date().toISOString();
      console.log(`🚪 [${timestamp}] NextAuth Event: Выход из системы`);
      console.log(
        `   👤 Пользователь: ${
          session?.user?.email || token?.email || 'неизвестный'
        }`
      );
      console.log(
        `   🆔 User ID: ${session?.user?.id || token?.userId || 'неизвестный'}`
      );
      console.log(`   🕐 Время выхода: ${timestamp}`);
    },

    async session({ session, token }) {
      // Логируем только в режиме разработки для избежания спама
      if (process.env.NODE_ENV === 'development') {
        const timestamp = new Date().toISOString();
        console.log(`📋 [${timestamp}] NextAuth Event: Проверка сессии`);
        console.log(
          `   👤 Пользователь: ${session?.user?.email || 'неизвестный'}`
        );
        console.log(`   🆔 User ID: ${session?.user?.id || 'неизвестный'}`);
        console.log(
          `   🔑 Провайдер: ${
            session?.user?.provider || token?.provider || 'неизвестный'
          }`
        );
        console.log(
          `   ⏰ Timestamp сессии: ${session?.timestamp || 'не указан'}`
        );
      }
    },
  },
  pages: {
    signIn: '/auth/signin', // Кастомная страница входа
    error: '/auth/error', // Страница ошибки
    verifyRequest: '/auth/verify-request', // Страница подтверждения email
    // signOut: '/auth/signout', // Опционально: страница выхода
  },
  session: {
    strategy: 'jwt', // Используем JWT для сессий
    maxAge: 24 * 60 * 60, // 24 часа
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
