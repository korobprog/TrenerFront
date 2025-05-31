const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Тест Email провайдера с Яндекс SMTP
 * Проверяет настройки и возможность отправки email
 */

async function testYandexEmailProvider() {
  console.log('🧪 Тестирование Email провайдера с Яндекс SMTP...\n');

  // 1. Проверка переменных окружения
  console.log('1️⃣ Проверка переменных окружения:');
  const requiredEnvVars = [
    'YANDEX_SMTP_HOST',
    'YANDEX_SMTP_PORT',
    'YANDEX_SMTP_USER',
    'YANDEX_SMTP_PASSWORD',
    'YANDEX_EMAIL_FROM',
  ];

  const missingVars = [];
  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.includes('your_yandex_app_password_here')) {
      missingVars.push(varName);
      console.log(`   ❌ ${varName}: не настроена`);
    } else {
      console.log(`   ✅ ${varName}: настроена`);
    }
  });

  if (missingVars.length > 0) {
    console.log('\n❌ Не все переменные окружения настроены!');
    console.log('Необходимо настроить:', missingVars.join(', '));
    return false;
  }

  // 2. Проверка SMTP конфигурации
  console.log('\n2️⃣ Проверка SMTP конфигурации:');
  const smtpConfig = {
    host: process.env.YANDEX_SMTP_HOST,
    port: parseInt(process.env.YANDEX_SMTP_PORT),
    secure: process.env.YANDEX_SMTP_SECURE === 'true',
    auth: {
      user: process.env.YANDEX_SMTP_USER,
      pass: process.env.YANDEX_SMTP_PASSWORD,
    },
  };

  console.log(`   📧 Host: ${smtpConfig.host}`);
  console.log(`   🔌 Port: ${smtpConfig.port}`);
  console.log(`   🔒 Secure: ${smtpConfig.secure}`);
  console.log(`   👤 User: ${smtpConfig.auth.user}`);
  console.log(
    `   🔑 Password: ${smtpConfig.auth.pass ? '***настроен***' : 'НЕ НАСТРОЕН'}`
  );

  // 3. Тест подключения к SMTP серверу
  console.log('\n3️⃣ Тестирование подключения к SMTP серверу:');
  try {
    const transporter = nodemailer.createTransporter(smtpConfig);

    console.log('   🔄 Проверка подключения...');
    await transporter.verify();
    console.log('   ✅ Подключение к Яндекс SMTP успешно!');

    // 4. Тест отправки email (опционально)
    const testEmail = process.env.TEST_EMAIL || process.env.YANDEX_SMTP_USER;
    if (testEmail && process.argv.includes('--send-test')) {
      console.log('\n4️⃣ Отправка тестового email:');
      console.log(`   📤 Отправка на: ${testEmail}`);

      const mailOptions = {
        from: process.env.YANDEX_EMAIL_FROM,
        to: testEmail,
        subject: 'Тест Email провайдера - Сервис собеседований',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">🎉 Email провайдер работает!</h2>
            <p>Это тестовое письмо подтверждает, что Email провайдер с Яндекс SMTP настроен правильно.</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #4a5568; margin-top: 0;">Детали конфигурации:</h3>
              <ul style="color: #718096;">
                <li><strong>SMTP Host:</strong> ${smtpConfig.host}</li>
                <li><strong>SMTP Port:</strong> ${smtpConfig.port}</li>
                <li><strong>Secure:</strong> ${smtpConfig.secure}</li>
                <li><strong>From:</strong> ${process.env.YANDEX_EMAIL_FROM}</li>
              </ul>
            </div>
            
            <p style="color: #718096; font-size: 14px;">
              Время отправки: ${new Date().toLocaleString('ru-RU')}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #a0aec0; font-size: 12px;">
              Это автоматическое письмо от сервиса собеседований. Не отвечайте на него.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('   ✅ Тестовый email успешно отправлен!');
    }

    return true;
  } catch (error) {
    console.log('   ❌ Ошибка подключения к SMTP серверу:');
    console.log(`   📝 ${error.message}`);

    // Диагностика ошибок
    if (error.code === 'EAUTH') {
      console.log('\n💡 Возможные причины ошибки аутентификации:');
      console.log('   • Неверный логин или пароль');
      console.log('   • Не создан пароль приложения для Яндекс почты');
      console.log('   • Двухфакторная аутентификация не настроена');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Возможные причины ошибки подключения:');
      console.log('   • Неверный хост или порт SMTP сервера');
      console.log('   • Проблемы с сетевым подключением');
      console.log('   • Блокировка файрволом');
    }

    return false;
  }
}

// 5. Проверка NextAuth конфигурации
function checkNextAuthConfig() {
  console.log('\n5️⃣ Проверка NextAuth конфигурации:');

  const nextAuthVars = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'];

  nextAuthVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: настроена`);
    } else {
      console.log(`   ❌ ${varName}: не настроена`);
    }
  });
}

// 6. Инструкции по настройке
function showSetupInstructions() {
  console.log('\n📋 Инструкции по настройке Яндекс SMTP:');
  console.log('\n1. Создайте пароль приложения в Яндекс почте:');
  console.log('   • Перейдите в настройки Яндекс ID: https://id.yandex.ru/');
  console.log('   • Включите двухфакторную аутентификацию');
  console.log('   • Создайте пароль приложения для почты');

  console.log('\n2. Обновите переменные окружения в .env:');
  console.log('   YANDEX_SMTP_HOST=smtp.yandex.ru');
  console.log('   YANDEX_SMTP_PORT=587');
  console.log('   YANDEX_SMTP_SECURE=false');
  console.log('   YANDEX_SMTP_USER=ваш_email@yandex.ru');
  console.log('   YANDEX_SMTP_PASSWORD=пароль_приложения');
  console.log(
    '   YANDEX_EMAIL_FROM="Сервис собеседований <ваш_email@yandex.ru>"'
  );

  console.log('\n3. Перезапустите сервер разработки');

  console.log('\n4. Для отправки тестового email используйте:');
  console.log('   node test-yandex-email-provider.js --send-test');
}

// Запуск тестов
async function main() {
  try {
    const success = await testYandexEmailProvider();
    checkNextAuthConfig();

    if (!success) {
      showSetupInstructions();
      process.exit(1);
    }

    console.log('\n🎉 Все проверки пройдены успешно!');
    console.log('Email провайдер с Яндекс SMTP готов к использованию.');

    if (!process.argv.includes('--send-test')) {
      console.log('\n💡 Для отправки тестового email запустите:');
      console.log('node test-yandex-email-provider.js --send-test');
    }
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск только если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = { testYandexEmailProvider };
