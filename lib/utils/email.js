const nodemailer = require('nodemailer');
const { sendMailViaGmailApi } = require('./googleGmail');

// Создаем транспорт для отправки email через SMTP (для обратной совместимости)
// В продакшене используется Gmail API
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password',
  },
});

/**
 * Отправляет электронное письмо через Gmail API
 * @param {Object} mailOptions - Параметры письма
 * @param {string} userId - ID пользователя (если не указан, используется системный аккаунт)
 * @returns {Promise<Object>} - Результат отправки
 */
async function sendEmailViaGmailApi(
  mailOptions,
  userId = process.env.GMAIL_USER_ID
) {
  console.log('Email: Отправка через Gmail API');
  console.log('Email: Получатель:', mailOptions.to);
  console.log('Email: Тема:', mailOptions.subject);

  try {
    // В режиме разработки просто логируем, что письмо было бы отправлено
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.ENABLE_REAL_EMAILS !== 'true'
    ) {
      console.log('Email: В режиме разработки письмо не отправляется');
      console.log('Email: Получатель:', mailOptions.to);
      console.log('Email: Тема:', mailOptions.subject);
      return { success: true, message: 'Email would be sent in production' };
    }

    // Отправляем email через Gmail API
    const result = await sendMailViaGmailApi(mailOptions, userId);

    if (result.success) {
      console.log(
        'Email: Письмо отправлено через Gmail API:',
        result.messageId
      );
      return { success: true, messageId: result.messageId };
    } else {
      // Если Gmail API не сработал, пробуем отправить через SMTP как запасной вариант
      console.warn(
        'Email: Ошибка при отправке через Gmail API, пробуем SMTP:',
        result.error
      );
      const info = await transporter.sendMail(mailOptions);
      console.log('Email: Письмо отправлено через SMTP:', info.messageId);
      return { success: true, messageId: info.messageId, fallbackToSMTP: true };
    }
  } catch (error) {
    console.error('Email: Ошибка при отправке письма:', error);
    return {
      success: false,
      error: error.message,
      details: error,
      timestamp: new Date().toISOString(),
      config: {
        useGmailApi: true,
        fallbackToSMTP: true,
        gmailUserConfigured: !!process.env.GMAIL_USER_ID,
        smtpConfigured: !!process.env.EMAIL_PASSWORD,
      },
    };
  }
}

/**
 * Отправляет уведомление интервьюеру о том, что к нему записались на собеседование
 * @param {Object} interviewer - Объект с данными интервьюера
 * @param {Object} interviewee - Объект с данными интервьюируемого
 * @param {Object} interview - Объект с данными о собеседовании
 * @returns {Promise} - Промис с результатом отправки
 */
async function sendInterviewBookingNotification(
  interviewer,
  interviewee,
  interview
) {
  console.log('Email: Отправка уведомления о записи на собеседование');
  console.log('Email: Интервьюер:', interviewer.name, interviewer.email);
  console.log('Email: Интервьюируемый:', interviewee.name, interviewee.email);
  console.log('Email: Собеседование:', interview.id, interview.scheduledTime);

  // Форматируем дату и время собеседования
  const formattedDate = new Date(interview.scheduledTime).toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  const formattedTime = new Date(interview.scheduledTime).toLocaleTimeString(
    'ru-RU',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  // Создаем HTML-шаблон письма
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Уведомление о записи на собеседование</h2>
      <p>Здравствуйте, <strong>${interviewer.name}</strong>!</p>
      <p>Пользователь <strong>${interviewee.name}</strong> записался к вам на собеседование.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Дата:</strong> ${formattedDate}</p>
        <p style="margin: 5px 0;"><strong>Время:</strong> ${formattedTime}</p>
        <p style="margin: 5px 0;"><strong>Ссылка на встречу:</strong> <a href="${interview.meetingLink}" target="_blank">${interview.meetingLink}</a></p>
      </div>
      <p>Пожалуйста, убедитесь, что вы будете доступны в указанное время.</p>
      <p>Если у вас возникли вопросы или вы не можете провести собеседование, пожалуйста, свяжитесь с интервьюируемым по email: <a href="mailto:${interviewee.email}">${interviewee.email}</a></p>
      <p style="text-align: center; margin-top: 30px; color: #777; font-size: 12px;">Это автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.</p>
    </div>
  `;

  // Опции для отправки email
  const mailOptions = {
    from:
      process.env.EMAIL_FROM || '"Сервис собеседований" <noreply@example.com>',
    to: interviewer.email,
    subject: 'Новая запись на собеседование',
    html: htmlTemplate,
    // Можно добавить текстовую версию для клиентов, не поддерживающих HTML
    text: `Здравствуйте, ${interviewer.name}! Пользователь ${interviewee.name} записался к вам на собеседование. Дата: ${formattedDate}, Время: ${formattedTime}. Ссылка на встречу: ${interview.meetingLink}`,
  };

  try {
    // Отправляем email через Gmail API
    return await sendEmailViaGmailApi(mailOptions, process.env.GMAIL_USER_ID);
  } catch (error) {
    console.error(
      'Email: Ошибка при отправке уведомления о собеседовании:',
      error
    );
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendInterviewBookingNotification,
  sendEmailViaGmailApi,
};
