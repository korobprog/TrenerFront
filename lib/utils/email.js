const nodemailer = require('nodemailer');

// Создаем транспорт для отправки email
// В продакшене нужно будет заменить на реальные данные SMTP-сервера
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
    // В режиме разработки просто логируем, что письмо было бы отправлено
    if (process.env.NODE_ENV === 'development') {
      console.log('Email: В режиме разработки письмо не отправляется');
      console.log('Email: Получатель:', mailOptions.to);
      console.log('Email: Тема:', mailOptions.subject);
      return { success: true, message: 'Email would be sent in production' };
    }

    // Отправляем email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email: Письмо отправлено:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email: Ошибка при отправке письма:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendInterviewBookingNotification,
};
