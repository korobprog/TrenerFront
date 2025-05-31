import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const EventModal = ({ event, slot, onSave, onDelete, onClose }) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    eventType: 'meeting',
    attendeeIds: [],
    meetingLink: '',
    reminderMinutes: 15,
    isRecurring: false,
    recurrenceRule: '',
    createVideoRoom: false,
  });

  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (event) {
      // Редактирование существующего события
      setFormData({
        title: event.title || '',
        description: event.resource?.description || '',
        startTime: formatDateTimeLocal(event.start),
        endTime: formatDateTimeLocal(event.end),
        isAllDay: event.allDay || false,
        eventType: event.resource?.type || 'meeting',
        attendeeIds: event.resource?.attendeeIds || [],
        meetingLink: event.resource?.meetingLink || '',
        reminderMinutes: event.resource?.reminderMinutes || 15,
        isRecurring: event.resource?.isRecurring || false,
        recurrenceRule: event.resource?.recurrenceRule || '',
        createVideoRoom: !!event.resource?.videoRoomId,
      });
    } else if (slot) {
      // Создание нового события
      setFormData({
        ...formData,
        startTime: formatDateTimeLocal(slot.start),
        endTime: formatDateTimeLocal(slot.end),
        isAllDay: slot.slots?.length === 1 && slot.start.getHours() === 0,
      });
    }
  }, [event, slot]);

  const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Очищаем ошибки при изменении поля
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const addAttendee = async () => {
    if (!attendeeEmail.trim()) return;

    try {
      // Проверяем, существует ли пользователь с таким email
      const response = await fetch(
        `/api/users/search?email=${encodeURIComponent(attendeeEmail)}`
      );

      if (response.ok) {
        const userData = await response.json();
        if (userData.user) {
          const newAttendee = {
            id: userData.user.id,
            email: userData.user.email,
            name: userData.user.name,
          };

          if (!attendees.find((a) => a.id === newAttendee.id)) {
            setAttendees((prev) => [...prev, newAttendee]);
            setFormData((prev) => ({
              ...prev,
              attendeeIds: [...prev.attendeeIds, newAttendee.id],
            }));
          }
        } else {
          setErrors((prev) => ({
            ...prev,
            attendeeEmail: 'Пользователь с таким email не найден',
          }));
        }
      }
    } catch (error) {
      console.error('Ошибка поиска пользователя:', error);
      setErrors((prev) => ({
        ...prev,
        attendeeEmail: 'Ошибка поиска пользователя',
      }));
    }

    setAttendeeEmail('');
  };

  const removeAttendee = (attendeeId) => {
    setAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
    setFormData((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.filter((id) => id !== attendeeId),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название события обязательно';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Время начала обязательно';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Время окончания обязательно';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);

      if (end <= start) {
        newErrors.endTime = 'Время окончания должно быть позже времени начала';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const eventData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        organizerId: session?.user?.id,
      };

      await onSave(eventData);
    } catch (error) {
      console.error('Ошибка сохранения события:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Ошибка сохранения события',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;

    if (confirm('Вы уверены, что хотите удалить это событие?')) {
      setLoading(true);
      try {
        await onDelete(event.id);
      } catch (error) {
        console.error('Ошибка удаления события:', error);
        setErrors((prev) => ({
          ...prev,
          submit: 'Ошибка удаления события',
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? 'Редактировать событие' : 'Новое событие'}</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="title">Название события *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={errors.title ? 'error' : ''}
              placeholder="Введите название события"
            />
            {errors.title && (
              <span className="error-message">{errors.title}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Описание события (необязательно)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventType">Тип события</label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
              >
                <option value="meeting">Встреча</option>
                <option value="interview">Собеседование</option>
                <option value="training">Тренировка</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reminderMinutes">Напоминание</label>
              <select
                id="reminderMinutes"
                name="reminderMinutes"
                value={formData.reminderMinutes}
                onChange={handleInputChange}
              >
                <option value="0">Без напоминания</option>
                <option value="5">За 5 минут</option>
                <option value="15">За 15 минут</option>
                <option value="30">За 30 минут</option>
                <option value="60">За 1 час</option>
                <option value="1440">За 1 день</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="isAllDay"
                checked={formData.isAllDay}
                onChange={handleInputChange}
              />
              Весь день
            </label>
          </div>

          {!formData.isAllDay && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Время начала *</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className={errors.startTime ? 'error' : ''}
                />
                {errors.startTime && (
                  <span className="error-message">{errors.startTime}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="endTime">Время окончания *</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className={errors.endTime ? 'error' : ''}
                />
                {errors.endTime && (
                  <span className="error-message">{errors.endTime}</span>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="createVideoRoom"
                checked={formData.createVideoRoom}
                onChange={handleInputChange}
              />
              Создать видеокомнату
            </label>
          </div>

          {!formData.createVideoRoom && (
            <div className="form-group">
              <label htmlFor="meetingLink">Ссылка на встречу</label>
              <input
                type="url"
                id="meetingLink"
                name="meetingLink"
                value={formData.meetingLink}
                onChange={handleInputChange}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          <div className="form-group">
            <label>Участники</label>
            <div className="attendee-input">
              <input
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="Email участника"
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addAttendee())
                }
              />
              <button type="button" onClick={addAttendee}>
                Добавить
              </button>
            </div>
            {errors.attendeeEmail && (
              <span className="error-message">{errors.attendeeEmail}</span>
            )}

            {attendees.length > 0 && (
              <div className="attendees-list">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="attendee-item">
                    <span>{attendee.name || attendee.email}</span>
                    <button
                      type="button"
                      onClick={() => removeAttendee(attendee.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleInputChange}
              />
              Повторяющееся событие
            </label>
          </div>

          {formData.isRecurring && (
            <div className="form-group">
              <label htmlFor="recurrenceRule">Правило повторения</label>
              <select
                id="recurrenceRule"
                name="recurrenceRule"
                value={formData.recurrenceRule}
                onChange={handleInputChange}
              >
                <option value="">Выберите правило</option>
                <option value="FREQ=DAILY">Ежедневно</option>
                <option value="FREQ=WEEKLY">Еженедельно</option>
                <option value="FREQ=MONTHLY">Ежемесячно</option>
              </select>
            </div>
          )}

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <div className="modal-actions">
            {event && (
              <button
                type="button"
                className="delete-button"
                onClick={handleDelete}
                disabled={loading}
              >
                Удалить
              </button>
            )}
            <div className="action-buttons">
              <button type="button" onClick={onClose} disabled={loading}>
                Отмена
              </button>
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 8px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
          }

          .modal-header h2 {
            margin: 0;
            color: #333;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #999;
            padding: 0.25rem;
          }

          .close-button:hover {
            color: #333;
          }

          .event-form {
            padding: 1.5rem;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            transition: border-color 0.2s ease;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #2196f3;
          }

