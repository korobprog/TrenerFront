const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

async function testEmailAuthDiagnosis() {
  console.log('🔍 Диагностика системы аутентификации через email...\n');

  try {
    // 1. Проверка переменных окружения
    console.log('1️⃣ Проверка переменных окружения:');
    const requiredEnvVars = [
      'YANDEX_SMTP_HOST',
      'YANDEX_SMTP_PORT',
      'YANDEX_SMTP_USER',
      'YANDEX_SMTP_PASSWORD',
      'YANDEX_EMAIL_FROM',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
    ];

    let envVarsOk = true;
    requiredEnvVars.forEach((varName) => {
      const value = process.env[varName];
      if (value) {
        console.log(
          `   ✅ ${varName}: ${
            varName.includes('PASSWORD') || varName.includes('SECRET')
              ? '***'
              : value
          }`
        );
      } else {
        console.log(`   ❌ ${varName}: не установлена`);
        envVarsOk = false;
      }
    });

    if (!envVarsOk) {
      console.log('\n❌ Некоторые переменные окружения не установлены!');
      return;
    }

    // 2. Проверка подключения к SMTP серверу
    console.log('\n2️⃣ Проверка подключения к SMTP серверу:');
    const transporter = nodemailer.createTransport({
      host: process.env.YANDEX_SMTP_HOST,
      port: parseInt(process.env.YANDEX_SMTP_PORT),
      secure: process.env.YANDEX_SMTP_SECURE === 'true',
      auth: {
        user: process.env.YANDEX_SMTP_USER,
        pass: process.env.YANDEX_SMTP_PASSWORD,
      },
    });

    try {
      await transporter.verify();
      console.log('   ✅ SMTP сервер доступен');
    } catch (error) {
      console.log('   ❌ Ошибка подключения к SMTP серверу:', error.message);
      return;
    }

    // 3. Проверка базы данных
    console.log('\n3️⃣ Проверка базы данных:');

    // Проверяем таблицы NextAuth
    const tables = ['Account', 'Session', 'User', 'VerificationToken'];
    for (const table of tables) {
      try {
        const count = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_name = ${table}
        `;
        if (count[0].count > 0) {
          console.log(`   ✅ Таблица ${table} существует`);
        } else {
          console.log(`   ❌ Таблица ${table} не найдена`);
        }
      } catch (error) {
        console.log(`   ❌ Ошибка проверки таблицы ${table}:`, error.message);
      }
    }

    // 4. Проверка токенов верификации
    console.log('\n4️⃣ Проверка токенов верификации:');
    try {
      const tokenCount = await prisma.verificationToken.count();
      console.log(`   📊 Количество токенов верификации: ${tokenCount}`);

      // Показываем последние токены (без самих токенов для безопасности)
      const recentTokens = await prisma.verificationToken.findMany({
        take: 5,
        orderBy: { expires: 'desc' },
        select: {
          identifier: true,
          expires: true,
        },
      });

      if (recentTokens.length > 0) {
        console.log('   📝 Последние токены:');
        recentTokens.forEach((token) => {
          const isExpired = token.expires < new Date();
          console.log(
            `      - ${token.identifier}: ${
              isExpired ? '❌ истёк' : '✅ активен'
            } (до ${token.expires.toLocaleString()})`
          );
        });
      }
    } catch (error) {
      console.log('   ❌ Ошибка проверки токенов:', error.message);
    }

    // 5. Тестовая отправка email
    console.log('\n5️⃣ Тестовая отправка email:');
    const testEmail = 'test@example.com';
    const testToken = 'test-token-' + Date.now();

    try {
      const mailOptions = {
        from: process.env.YANDEX_EMAIL_FROM,
        to: testEmail,
        subject: 'Тест магической ссылки',
        text: `Тестовая ссылка: ${
          process.env.NEXTAUTH_URL
        }/api/auth/callback/email?callbackUrl=${encodeURIComponent(
          process.env.NEXTAUTH_URL
        )}&token=${testToken}&email=${encodeURIComponent(testEmail)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Тест магической ссылки</h2>
            <p>Это тестовое письмо для проверки работы email аутентификации.</p>
            <a href="${
              process.env.NEXTAUTH_URL
            }/api/auth/callback/email?callbackUrl=${encodeURIComponent(
          process.env.NEXTAUTH_URL
        )}&token=${testToken}&email=${encodeURIComponent(testEmail)}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Войти в систему
            </a>
          </div>
        `,
      };

      // Не отправляем реальное письмо, только проверяем формирование
      console.log('   ✅ Письмо сформировано корректно');
      console.log(`   📧 Получатель: ${testEmail}`);
      console.log(`   📝 Тема: ${mailOptions.subject}`);
    } catch (error) {
      console.log('   ❌ Ошибка формирования письма:', error.message);
    }

    // 6. Проверка NextAuth конфигурации
    console.log('\n6️⃣ Проверка NextAuth конфигурации:');

    // Проверяем доступность NextAuth API
    try {
      const response = await fetch(
        `${process.env.NEXTAUTH_URL}/api/auth/providers`
      );
      if (response.ok) {
        const providers = await response.json();
        console.log('   ✅ NextAuth API доступен');
        console.log(
          '   📋 Доступные провайдеры:',
          Object.keys(providers).join(', ')
        );

        if (providers.email) {
          console.log('   ✅ Email провайдер настроен');
        } else {
          console.log('   ❌ Email провайдер не найден');
        }
      } else {
        console.log('   ❌ NextAuth API недоступен:', response.status);
      }
    } catch (error) {
      console.log('   ❌ Ошибка проверки NextAuth API:', error.message);
    }

    console.log('\n🎉 Диагностика завершена!');
    console.log('\n💡 Рекомендации:');
    console.log(
      '   1. Убедитесь, что все переменные окружения установлены корректно'
    );
    console.log('   2. Проверьте, что SMTP сервер Яндекса доступен');
    console.log(
      '   3. Убедитесь, что база данных содержит все необходимые таблицы NextAuth'
    );
    console.log(
      '   4. Проверьте логи сервера при попытке отправки магической ссылки'
    );
  } catch (error) {
    console.error('❌ Критическая ошибка при диагностике:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем диагностику
testEmailAuthDiagnosis().catch(console.error);
