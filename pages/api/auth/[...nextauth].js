import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcrypt';

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
        // Ищем пользователя с ролью superadmin
        const superAdmin = await prisma.user.findFirst({
          where: { role: 'superadmin' },
        });

        if (!superAdmin) {
          return null; // Супер-администратор не найден
        }

        // Проверяем логин (username должен соответствовать email или быть 'admin')
        const isValidUsername =
          credentials.username === 'admin' ||
          credentials.username === superAdmin.email;

        if (!isValidUsername) {
          return null;
        }

        // Проверяем пароль
        const isValidPassword = superAdmin.password
          ? await bcrypt.compare(credentials.password, superAdmin.password)
          : credentials.password === 'krishna1284radha'; // Запасной вариант для обратной совместимости

        if (!isValidPassword) {
          return null;
        }

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
    // error: '/auth/error', // Опционально: страница ошибки
    // signOut: '/auth/signout', // Опционально: страница выхода
  },
  session: {
    strategy: 'jwt', // Используем JWT для сессий
    maxAge: 24 * 60 * 60, // 24 часа
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
