const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.development' });

async function testYandexEmail() {
  console.log('🔍 Тестирование отправки email через Яндекс SMTP...\n');

  try {
    // Проверяем наличие переменных окружения
    console.log('1️⃣ Проверка переменных окружения:');
    const requiredVars = [
      'YANDEX_SMTP_HOST',
      'YANDEX_SMTP_PORT',
      'YANDEX_SMTP_USER',
      'YANDEX_SMTP_PASSWORD',
      'YANDEX_EMAIL_FROM',
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.log('   ❌ Отсутствуют переменные:', missingVars.join(', '));
      return;
    }

    console.log('   ✅ Все необходимые переменные найдены');
    console.log(`   📧 SMTP Host: ${process.env.YANDEX_SMTP_HOST}`);
    console.log(`   🔌 SMTP Port: ${process.env.YANDEX_SMTP_PORT}`);
    console.log(`   👤 SMTP User: ${process.env.YANDEX_SMTP_USER}`);
    console.log(`   📨 Email From: ${process.env.YANDEX_EMAIL_FROM}`);

    // Создаем транспорт
    console.log('\n2️⃣ Создание SMTP транспорта...');
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

    console.log('   ✅ SMTP транспорт создан');

    // Проверяем подключение
    console.log('\n3️⃣ Проверка подключения к SMTP серверу...');
    await transporter.verify();
    console.log('   ✅ Подключение к SMTP серверу успешно');

    // Отправляем тестовое письмо
    console.log('\n4️⃣ Отправка тестового письма...');
    const testEmail = {
      from: process.env.YANDEX_EMAIL_FROM,
      to: process.env.YANDEX_SMTP_USER, // Отправляем самому себе
      subject: '🧪 Тестовое письмо от TrenerFront',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Тест email успешен!</h2>
          <p>Это тестовое письмо от платформы TrenerFront.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📊 Информация о тесте:</h3>
            <ul>
              <li><strong>Время отправки:</strong> ${new Date().toLocaleString(
                'ru-RU'
              )}</li>
              <li><strong>SMTP сервер:</strong> ${
                process.env.YANDEX_SMTP_HOST
              }</li>
              <li><strong>Порт:</strong> ${process.env.YANDEX_SMTP_PORT}</li>
              <li><strong>Отправитель:</strong> ${
                process.env.YANDEX_SMTP_USER
              }</li>
            </ul>
          </div>
          <p style="color: #059669;">✅ Настройка Яндекс SMTP работает корректно!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Это автоматическое письмо от системы TrenerFront.<br>
            Если вы получили это письмо, значит настройка email работает правильно.
          </p>
        </div>
      `,
      text: `
🎉 Тест email успешен!

Это тестовое письмо от платформы TrenerFront.

📊 Информация о тесте:
- Время отправки: ${new Date().toLocaleString('ru-RU')}
- SMTP сервер: ${process.env.YANDEX_SMTP_HOST}
- Порт: ${process.env.YANDEX_SMTP_PORT}
- Отправитель: ${process.env.YANDEX_SMTP_USER}

✅ Настройка Яндекс SMTP работает корректно!

Это автоматическое письмо от системы TrenerFront.
Если вы получили это письмо, значит настройка email работает правильно.
      `,
    };

    const result = await transporter.sendMail(testEmail);

    console.log('   ✅ Письмо отправлено успешно!');
    console.log(`   📧 Message ID: ${result.messageId}`);
    console.log(`   📨 Получатель: ${testEmail.to}`);

    console.log('\n🎉 Тест Яндекс SMTP завершен успешно!');
    console.log(
      '📬 Проверьте почтовый ящик для подтверждения получения письма.'
    );
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании email:', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n💡 Возможные причины ошибки аутентификации:');
      console.log('   - Неверный пароль приложения');
      console.log('   - Не включена двухфакторная аутентификация');
      console.log('   - Не создан пароль приложения в настройках Яндекс');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Возможные причины ошибки подключения:');
      console.log('   - Неверный SMTP сервер или порт');
      console.log('   - Блокировка файрволом');
      console.log('   - Проблемы с интернет-соединением');
    }

    console.log('\n📖 Для решения проблем см. docs/yandex-smtp-setup-guide.md');
  }
}

// Запускаем тест
testYandexEmail();
