const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

async function testRealEmailAuth() {
  console.log('🔍 Тестирование реальной отправки магической ссылки...\n');

  try {
    // 1. Настройка транспортера
    console.log('1️⃣ Настройка SMTP транспортера:');
    const transporter = nodemailer.createTransport({
      host: process.env.YANDEX_SMTP_HOST,
      port: parseInt(process.env.YANDEX_SMTP_PORT),
      secure: process.env.YANDEX_SMTP_SECURE === 'true',
      auth: {
        user: process.env.YANDEX_SMTP_USER,
        pass: process.env.YANDEX_SMTP_PASSWORD,
      },
      debug: true, // Включаем отладку
      logger: true, // Включаем логирование
    });

    console.log('   ✅ Транспортер создан');

    // 2. Проверка подключения
    console.log('\n2️⃣ Проверка подключения к SMTP:');
    await transporter.verify();
    console.log('   ✅ Подключение к SMTP серверу успешно');

    // 3. Создание тестового токена верификации
    console.log('\n3️⃣ Создание тестового токена:');
    const testEmail = 'korobprog@gmail.com'; // Используем реальный email для теста
    const testToken =
      'test-token-' +
      Date.now() +
      '-' +
      Math.random().toString(36).substring(7);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // Удаляем старые токены для этого email
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail },
    });

    // Создаем новый токен
    await prisma.verificationToken.create({
      data: {
        identifier: testEmail,
        token: testToken,
        expires: expiresAt,
      },
    });

    console.log(`   ✅ Токен создан: ${testToken.substring(0, 20)}...`);
    console.log(`   📅 Истекает: ${expiresAt.toLocaleString()}`);

    // 4. Формирование магической ссылки
    console.log('\n4️⃣ Формирование магической ссылки:');
    const callbackUrl = encodeURIComponent(process.env.NEXTAUTH_URL);
    const magicLink = `${
      process.env.NEXTAUTH_URL
    }/api/auth/callback/email?callbackUrl=${callbackUrl}&token=${testToken}&email=${encodeURIComponent(
      testEmail
    )}`;

    console.log(`   🔗 Ссылка: ${magicLink.substring(0, 80)}...`);

    // 5. Отправка email
    console.log('\n5️⃣ Отправка тестового email:');
    const mailOptions = {
      from: process.env.YANDEX_EMAIL_FROM,
      to: testEmail,
      subject: 'Тест магической ссылки - Сервис собеседований',
      text: `
Здравствуйте!

Вы запросили вход в систему через магическую ссылку.

Нажмите на ссылку ниже для входа:
${magicLink}

Ссылка действительна в течение 24 часов.

Если вы не запрашивали этот вход, просто проигнорируйте это письмо.

С уважением,
Команда сервиса собеседований
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Вход в систему</h2>
          <p>Здравствуйте!</p>
          <p>Вы запросили вход в систему через магическую ссылку.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" 
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
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('   ✅ Email отправлен успешно!');
      console.log(`   📧 Message ID: ${info.messageId}`);
      console.log(`   📬 Получатель: ${testEmail}`);

      if (info.response) {
        console.log(`   📝 Ответ сервера: ${info.response}`);
      }

      // 6. Проверка токена в базе данных
      console.log('\n6️⃣ Проверка токена в базе данных:');
      const savedToken = await prisma.verificationToken.findUnique({
        where: {
          token: testToken,
        },
      });

      if (savedToken) {
        console.log('   ✅ Токен найден в базе данных');
        console.log(`   📧 Email: ${savedToken.identifier}`);
        console.log(`   ⏰ Истекает: ${savedToken.expires.toLocaleString()}`);
      } else {
        console.log('   ❌ Токен не найден в базе данных');
      }

      // 7. Инструкции для тестирования
      console.log('\n7️⃣ Инструкции для тестирования:');
      console.log('   1. Проверьте почтовый ящик:', testEmail);
      console.log('   2. Найдите письмо с темой "Тест магической ссылки"');
      console.log('   3. Нажмите на кнопку "Войти в систему"');
      console.log('   4. Вы должны быть перенаправлены на главную страницу');
      console.log('   5. Проверьте, что вы вошли в систему');
    } catch (emailError) {
      console.log('   ❌ Ошибка отправки email:', emailError.message);
      console.log('   📋 Детали ошибки:', emailError);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Дополнительная функция для проверки NextAuth API
async function testNextAuthAPI() {
  console.log('\n🔧 Тестирование NextAuth API...\n');

  try {
    // Тестируем отправку через NextAuth API
    const testEmail = 'korobprog@gmail.com';

    console.log('1️⃣ Тестирование через NextAuth API:');

    // Имитируем запрос к NextAuth signin
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/auth/signin/email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: testEmail,
          callbackUrl: process.env.NEXTAUTH_URL,
          csrfToken: 'test-csrf-token', // В реальности это должен быть валидный CSRF токен
        }),
      }
    );

    console.log(`   📊 Статус ответа: ${response.status}`);
    console.log(`   📝 Статус текст: ${response.statusText}`);

    if (response.ok) {
      console.log('   ✅ NextAuth API ответил успешно');
    } else {
      console.log('   ❌ NextAuth API вернул ошибку');
      const errorText = await response.text();
      console.log(`   📄 Ответ: ${errorText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log('   ❌ Ошибка при тестировании NextAuth API:', error.message);
  }
}

// Запускаем тесты
async function runAllTests() {
  await testRealEmailAuth();
  await testNextAuthAPI();

  console.log('\n🎉 Все тесты завершены!');
  console.log('\n💡 Если email не приходит, проверьте:');
  console.log('   - Папку "Спам" в почтовом ящике');
  console.log('   - Настройки безопасности Яндекс почты');
  console.log('   - Логи сервера разработки Next.js');
  console.log('   - Правильность настроек SMTP в .env файле');
}

runAllTests().catch(console.error);
