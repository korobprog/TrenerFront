import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcrypt';

// Добавляем логи для отладки
console.log('NextAuth: Инициализация с параметрами:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('Все переменные окружения:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
console.log('GMAIL_USER_ID:', process.env.GMAIL_USER_ID);
console.log(
  'Текущий URL запроса:',
  typeof window !== 'undefined' ? window.location.href : 'Серверный рендеринг'
);

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
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Логин', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        console.log(
          'NextAuth authorize: Попытка авторизации с учетными данными:'
        );
        console.log('- username:', credentials.username);
        console.log(
          '- password:',
          credentials.password ? '[СКРЫТ]' : 'отсутствует'
        );

        // Ищем пользователя с ролью superadmin
        const superAdmin = await prisma.user.findFirst({
          where: { role: 'superadmin' },
        });

        console.log(
          'NextAuth authorize: Результат поиска суперадмина:',
          superAdmin ? 'найден' : 'не найден'
        );

        if (superAdmin) {
          console.log('NextAuth authorize: Данные суперадмина:');
          console.log('- id:', superAdmin.id);
          console.log('- email:', superAdmin.email);
          console.log('- role:', superAdmin.role);
          console.log(
            '- password:',
            superAdmin.password ? 'установлен' : 'не установлен'
          );
        }

        if (!superAdmin) {
          console.log(
            'NextAuth authorize: Супер-администратор не найден в базе данных'
          );
          return null; // Супер-администратор не найден
        }

        // Проверяем логин (username должен соответствовать email или быть 'admin' или 'superadmin')
        const isValidUsername =
          credentials.username === 'admin' ||
          credentials.username === 'superadmin' ||
          credentials.username === superAdmin.email;

        console.log(
          'NextAuth authorize: Проверка логина:',
          isValidUsername ? 'успешно' : 'неуспешно'
        );

        if (!isValidUsername) {
          console.log('NextAuth authorize: Неверный логин');
          return null;
        }

        // Проверяем пароль
        let isValidPassword = false;

        if (superAdmin.password) {
          // Проверяем хешированный пароль
          isValidPassword = await bcrypt.compare(
            credentials.password,
            superAdmin.password
          );
          console.log(
            'NextAuth authorize: Проверка хешированного пароля:',
            isValidPassword ? 'успешно' : 'неуспешно'
          );
        } else {
          // Запасной вариант для обратной совместимости
          isValidPassword = credentials.password === 'krishna1284radha';
          console.log(
            'NextAuth authorize: Проверка запасного пароля:',
            isValidPassword ? 'успешно' : 'неуспешно'
          );
        }

        if (!isValidPassword) {
          console.log('NextAuth authorize: Неверный пароль');
          return null;
        }

        console.log('NextAuth authorize: Авторизация успешна');

        // Возвращаем данные пользователя
        return {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: superAdmin.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Если есть объект пользователя (при первом входе), добавляем роль в токен
      if (user) {
        token.role = user.role;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      // Добавляем id пользователя и роль в объект сессии
      if (user) {
        session.user.id = user.id;
        session.user.role = user.role;
      } else if (token) {
        session.user.id = token.userId;
        session.user.role = token.role;
      }

      // Добавляем метку времени для предотвращения кэширования
      session.timestamp = Date.now();

      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Для входа через Google логируем информацию о токенах
      if (account?.provider === 'google') {
        console.log('NextAuth signIn: Получены токены Google:');
        console.log(
          '- refresh_token:',
          account.refresh_token ? 'Присутствует' : 'Отсутствует'
        );
        console.log(
          '- access_token:',
          account.access_token ? 'Присутствует' : 'Отсутствует'
        );
        console.log('- expires_at:', account.expires_at);
      }

      // Для входа через credentials проверяем роль
      if (account?.provider === 'credentials') {
        return user.role === 'superadmin';
      }

      // Для входа через Google всегда разрешаем вход
      // Это позволит создать новый аккаунт, если старый был удален
      return true;
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
