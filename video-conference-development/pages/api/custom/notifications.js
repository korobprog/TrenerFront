import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { method } = req;

    switch (method) {
      case 'POST':
        return await handleSendNotification(req, res, session.user.id);
      case 'GET':
        return await handleGetNotifications(req, res, session.user.id);
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res
          .status(405)
          .json({ error: `Метод ${method} не поддерживается` });
    }
  } catch (error) {
    console.error('Ошибка API уведомлений:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Отправка уведомлений
async function handleSendNotification(req, res, userId) {
  try {
    const { eventId, type, recipients, customMessage } = req.body;

    if (!eventId || !type) {
      return res.status(400).json({
        error: 'Обязательные поля: eventId, type',
      });
    }

    // Получаем информацию о событии
    const event = await prisma.customCalendarEvent.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        videoRoom: {
          select: { id: true, name: true, roomCode: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    // Проверяем права доступа
    if (event.organizerId !== userId) {
      return res.status(403).json({
        error: 'Только организатор может отправлять уведомления',
      });
    }

    // Определяем получателей
    let recipientEmails = [];

    if (recipients && recipients.length > 0) {
      // Используем указанных получателей
      const users = await prisma.user.findMany({
        where: { id: { in: recipients } },
        select: { email: true, name: true },
      });
      recipientEmails = users
        .filter((user) => user.email)
        .map((user) => ({
          email: user.email,
          name: user.name,
        }));
    } else if (event.attendeeIds && event.attendeeIds.length > 0) {
      // Используем участников события
      const attendees = await prisma.user.findMany({
        where: { id: { in: event.attendeeIds } },
        select: { email: true, name: true },
      });
      recipientEmails = attendees
        .filter((user) => user.email)
        .map((user) => ({
          email: user.email,
          name: user.name,
        }));
    }

    if (recipientEmails.length === 0) {
      return res.status(400).json({
        error: 'Не найдены получатели для отправки уведомлений',
      });
    }

    // Отправляем уведомления
    const results = await Promise.allSettled(
      recipientEmails.map((recipient) =>
        sendEmailNotification(event, recipient, type, customMessage)
      )
    );

    const successful = results.filter(
      (result) => result.status === 'fulfilled'
    ).length;
    const failed = results.filter(
      (result) => result.status === 'rejected'
    ).length;

    return res.status(200).json({
      message: 'Уведомления отправлены',
      successful,
      failed,
      total: recipientEmails.length,
    });
  } catch (error) {
    console.error('Ошибка отправки уведомлений:', error);
    return res.status(500).json({ error: 'Ошибка отправки уведомлений' });
  }
}

// Получение истории уведомлений
async function handleGetNotifications(req, res, userId) {
  try {
    const { eventId, limit = 50 } = req.query;

    // Здесь можно реализовать логику получения истории уведомлений
    // Для этого потребуется создать отдельную модель NotificationLog в базе данных

    // Пока возвращаем заглушку
    const notifications = [];

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    return res.status(500).json({ error: 'Ошибка получения уведомлений' });
  }
}

// Функция отправки email уведомлений
async function sendEmailNotification(event, recipient, type, customMessage) {
  try {
    // Настройка транспорта для отправки email
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Формируем содержимое письма в зависимости от типа уведомления
    const emailContent = generateEmailContent(event, type, customMessage);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient.email,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Уведомление отправлено: ${recipient.email}`);
    return result;
  } catch (error) {
    console.error(`Ошибка отправки уведомления на ${recipient.email}:`, error);
    throw error;
  }
}

// Генерация содержимого email
function generateEmailContent(event, type, customMessage) {
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(date));
  };

  const startTime = formatDate(event.startTime);
  const endTime = formatDate(event.endTime);

  let subject, html;

  switch (type) {
    case 'reminder':
      subject = `Напоминание: ${event.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Напоминание о предстоящем событии</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
            ${
              event.description
                ? `<p style="color: #666; margin: 5px 0;">${event.description}</p>`
                : ''
            }
            <p style="margin: 5px 0;"><strong>Время:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;"><strong>Организатор:</strong> ${
              event.organizer.name
            }</p>
            ${
              event.videoRoom
                ? `<p style="margin: 5px 0;"><strong>Комната:</strong> ${event.videoRoom.name} (Код: ${event.videoRoom.roomCode})</p>`
                : ''
            }
            ${
              event.meetingLink
                ? `<p style="margin: 5px 0;"><strong>Ссылка:</strong> <a href="${event.meetingLink}">${event.meetingLink}</a></p>`
                : ''
            }
          </div>
          ${
            customMessage
              ? `<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #1976d2;">${customMessage}</p></div>`
              : ''
          }
          <p style="color: #666; font-size: 14px;">Это автоматическое уведомление от системы видеоконференций.</p>
        </div>
      `;
      break;

    case 'invitation':
      subject = `Приглашение: ${event.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Приглашение на событие</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
            ${
              event.description
                ? `<p style="color: #666; margin: 5px 0;">${event.description}</p>`
                : ''
            }
            <p style="margin: 5px 0;"><strong>Время:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;"><strong>Организатор:</strong> ${
              event.organizer.name
            }</p>
            ${
              event.videoRoom
                ? `<p style="margin: 5px 0;"><strong>Комната:</strong> ${event.videoRoom.name} (Код: ${event.videoRoom.roomCode})</p>`
                : ''
            }
            ${
              event.meetingLink
                ? `<p style="margin: 5px 0;"><strong>Ссылка:</strong> <a href="${event.meetingLink}">${event.meetingLink}</a></p>`
                : ''
            }
          </div>
          ${
            customMessage
              ? `<div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #2e7d32;">${customMessage}</p></div>`
              : ''
          }
          <p style="color: #666; font-size: 14px;">Вы приглашены на это событие. Пожалуйста, подтвердите свое участие.</p>
        </div>
      `;
      break;

    case 'cancellation':
      subject = `Отмена: ${event.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Событие отменено</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
            ${
              event.description
                ? `<p style="color: #666; margin: 5px 0;">${event.description}</p>`
                : ''
            }
            <p style="margin: 5px 0;"><strong>Было запланировано:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;"><strong>Организатор:</strong> ${
              event.organizer.name
            }</p>
          </div>
          ${
            customMessage
              ? `<div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #c62828;">${customMessage}</p></div>`
              : ''
          }
          <p style="color: #666; font-size: 14px;">Событие было отменено организатором.</p>
        </div>
      `;
      break;

    case 'update':
      subject = `Изменение: ${event.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">Событие изменено</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
            ${
              event.description
                ? `<p style="color: #666; margin: 5px 0;">${event.description}</p>`
                : ''
            }
            <p style="margin: 5px 0;"><strong>Время:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;"><strong>Организатор:</strong> ${
              event.organizer.name
            }</p>
            ${
              event.videoRoom
                ? `<p style="margin: 5px 0;"><strong>Комната:</strong> ${event.videoRoom.name} (Код: ${event.videoRoom.roomCode})</p>`
                : ''
            }
            ${
              event.meetingLink
                ? `<p style="margin: 5px 0;"><strong>Ссылка:</strong> <a href="${event.meetingLink}">${event.meetingLink}</a></p>`
                : ''
            }
          </div>
          ${
            customMessage
              ? `<div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #ef6c00;">${customMessage}</p></div>`
              : ''
          }
          <p style="color: #666; font-size: 14px;">В событии произошли изменения. Пожалуйста, проверьте обновленную информацию.</p>
        </div>
      `;
      break;

    default:
      subject = `Уведомление: ${event.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Уведомление о событии</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
            ${
              event.description
                ? `<p style="color: #666; margin: 5px 0;">${event.description}</p>`
                : ''
            }
            <p style="margin: 5px 0;"><strong>Время:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;"><strong>Организатор:</strong> ${
              event.organizer.name
            }</p>
            ${
              event.videoRoom
                ? `<p style="margin: 5px 0;"><strong>Комната:</strong> ${event.videoRoom.name} (Код: ${event.videoRoom.roomCode})</p>`
                : ''
            }
            ${
              event.meetingLink
                ? `<p style="margin: 5px 0;"><strong>Ссылка:</strong> <a href="${event.meetingLink}">${event.meetingLink}</a></p>`
                : ''
            }
          </div>
          ${
            customMessage
              ? `<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #1976d2;">${customMessage}</p></div>`
              : ''
          }
          <p style="color: #666; font-size: 14px;">Это уведомление от системы видеоконференций.</p>
        </div>
      `;
  }

  return { subject, html };
}

// Функция для автоматической отправки напоминаний
export async function sendAutomaticReminders() {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 минут вперед

    // Находим события, которые начинаются через 15 минут
    const upcomingEvents = await prisma.customCalendarEvent.findMany({
      where: {
        startTime: {
          gte: now,
          lte: reminderTime,
        },
        status: 'scheduled',
        reminderMinutes: { not: null },
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        videoRoom: {
          select: { id: true, name: true, roomCode: true },
        },
      },
    });

    for (const event of upcomingEvents) {
      if (event.attendeeIds && event.attendeeIds.length > 0) {
        const attendees = await prisma.user.findMany({
          where: { id: { in: event.attendeeIds } },
          select: { email: true, name: true },
        });

        const recipients = attendees.filter((user) => user.email);

        await Promise.allSettled(
          recipients.map((recipient) =>
            sendEmailNotification(event, recipient, 'reminder')
          )
        );

        console.log(`Отправлены напоминания для события: ${event.title}`);
      }
    }
  } catch (error) {
    console.error('Ошибка отправки автоматических напоминаний:', error);
  }
}
