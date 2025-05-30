import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ru';
import { useSession } from 'next-auth/react';
import EventModal from './EventModal';

// Настройка локализации
moment.locale('ru');
const localizer = momentLocalizer(moment);

const CustomCalendar = ({
  onEventSelect,
  onSlotSelect,
  videoRoomId = null,
  showStatistics = false,
  enableNotifications = true,
}) => {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (session?.user?.id) {
      loadEvents();
    }
  }, [session?.user?.id, date, view]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/custom/calendar-events?userId=${
          session.user.id
        }&date=${date.toISOString()}&view=${view}`
      );

      if (response.ok) {
        const data = await response.json();
        const formattedEvents = data.events.map((event) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          allDay: event.isAllDay,
          resource: {
            type: event.eventType,
            description: event.description,
            videoRoomId: event.videoRoomId,
            organizerId: event.organizerId,
            attendeeIds: event.attendeeIds,
            meetingLink: event.meetingLink,
            status: event.status,
            isRecurring: event.isRecurring,
          },
        }));
        setEvents(formattedEvents);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка загрузки событий');
        console.error('Ошибка загрузки событий:', response.statusText);
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
      console.error('Ошибка загрузки событий:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    setSelectedSlot(slotInfo);
    setSelectedEvent(null);
    setShowEventModal(true);
    if (onSlotSelect) {
      onSlotSelect(slotInfo);
    }
  };

  const handleEventSave = async (eventData) => {
    try {
      const url = selectedEvent
        ? `/api/custom/calendar-events?eventId=${selectedEvent.id}`
        : '/api/custom/calendar-events';
      const method = selectedEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          organizerId: session.user.id,
        }),
      });

      if (response.ok) {
        await loadEvents(); // Перезагружаем события
        setShowEventModal(false);
        setSelectedEvent(null);
        setSelectedSlot(null);

        // Показываем уведомление об успехе
        if (typeof window !== 'undefined' && window.showNotification) {
          window.showNotification(
            selectedEvent ? 'Событие обновлено' : 'Событие создано',
            'success'
          );
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сохранения события');
      }
    } catch (error) {
      console.error('Ошибка сохранения события:', error);
      if (typeof window !== 'undefined' && window.showNotification) {
        window.showNotification(error.message, 'error');
      }
    }
  };

  const handleEventDelete = async (eventId) => {
    try {
      const response = await fetch(
        `/api/custom/calendar-events?eventId=${eventId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        await loadEvents(); // Перезагружаем события
        setShowEventModal(false);
        setSelectedEvent(null);

        // Показываем уведомление об успехе
        if (typeof window !== 'undefined' && window.showNotification) {
          window.showNotification('Событие удалено', 'success');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления события');
      }
    } catch (error) {
      console.error('Ошибка удаления события:', error);
      if (typeof window !== 'undefined' && window.showNotification) {
        window.showNotification(error.message, 'error');
      }
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    switch (event.resource?.type) {
      case 'meeting':
        backgroundColor = '#4CAF50';
        borderColor = '#4CAF50';
        break;
      case 'interview':
        backgroundColor = '#FF9800';
        borderColor = '#FF9800';
        break;
      case 'training':
        backgroundColor = '#9C27B0';
        borderColor = '#9C27B0';
        break;
      default:
        backgroundColor = '#2196F3';
        borderColor = '#2196F3';
    }

    // Изменяем стиль в зависимости от статуса
    if (event.resource?.status === 'cancelled') {
      backgroundColor = '#f44336';
      borderColor = '#f44336';
    } else if (event.resource?.status === 'completed') {
      backgroundColor = '#607D8B';
      borderColor = '#607D8B';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '0.85rem',
        padding: '2px 6px',
      },
    };
  };

  const messages = {
    allDay: 'Весь день',
    previous: 'Назад',
    next: 'Вперед',
    today: 'Сегодня',
    month: 'Месяц',
    week: 'Неделя',
    day: 'День',
    agenda: 'Повестка',
    date: 'Дата',
    time: 'Время',
    event: 'Событие',
    noEventsInRange: 'Нет событий в этом диапазоне',
    showMore: (total) => `+ еще ${total}`,
  };

  const formats = {
    monthHeaderFormat: 'MMMM YYYY',
    dayHeaderFormat: 'dddd, DD MMMM YYYY',
    dayRangeHeaderFormat: ({ start, end }) =>
      `${moment(start).format('DD MMMM')} - ${moment(end).format(
        'DD MMMM YYYY'
      )}`,
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }) =>
      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
  };

  if (!session) {
    return (
      <div className="calendar-auth-required">
        <p>Для просмотра календаря необходимо войти в систему</p>
      </div>
    );
  }

  return (
    <div className="custom-calendar">
      <div className="calendar-header">
        <div className="calendar-controls">
          <button
            className={`view-button ${view === 'month' ? 'active' : ''}`}
            onClick={() => setView('month')}
          >
            Месяц
          </button>
          <button
            className={`view-button ${view === 'week' ? 'active' : ''}`}
            onClick={() => setView('week')}
          >
            Неделя
          </button>
          <button
            className={`view-button ${view === 'day' ? 'active' : ''}`}
            onClick={() => setView('day')}
          >
            День
          </button>
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-color meeting"></span>
            Встречи
          </div>
          <div className="legend-item">
            <span className="legend-color interview"></span>
            Собеседования
          </div>
          <div className="legend-item">
            <span className="legend-color training"></span>
            Тренировки
          </div>
        </div>
      </div>

      {error && (
        <div className="calendar-error">
          <p>Ошибка: {error}</p>
          <button onClick={loadEvents}>Попробовать снова</button>
        </div>
      )}

      {loading ? (
        <div className="calendar-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка событий...</p>
        </div>
      ) : (
        <div className="calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            messages={messages}
            formats={formats}
            step={30}
            timeslots={2}
            min={new Date(2023, 0, 1, 8, 0)} // 8:00 AM
            max={new Date(2023, 0, 1, 22, 0)} // 10:00 PM
            dayLayoutAlgorithm="no-overlap"
          />
        </div>
      )}

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          slot={selectedSlot}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setSelectedSlot(null);
          }}
        />
      )}

      <style jsx>{`
        .custom-calendar {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .calendar-controls {
          display: flex;
          gap: 0.5rem;
        }

        .view-button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-button:hover {
          background: #f5f5f5;
        }

        .view-button.active {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .calendar-legend {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-color.meeting {
          background: #4caf50;
        }

        .legend-color.interview {
          background: #ff9800;
        }

        .legend-color.training {
          background: #9c27b0;
        }

        .calendar-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #666;
        }

        .calendar-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #f44336;
          background: #ffebee;
          border-radius: 4px;
          margin-bottom: 1rem;
          padding: 1rem;
        }

        .calendar-error button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .calendar-auth-required {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2196f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .calendar-container {
          min-height: 600px;
        }

        /* Стили для react-big-calendar */
        :global(.rbc-calendar) {
          font-family: inherit;
        }

        :global(.rbc-header) {
          padding: 0.75rem 0.5rem;
          font-weight: 600;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        :global(.rbc-today) {
          background-color: #e3f2fd;
        }

        :global(.rbc-off-range-bg) {
          background-color: #f8f9fa;
        }

        :global(.rbc-event) {
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.85rem;
          cursor: pointer;
        }

        :global(.rbc-event:hover) {
          opacity: 0.8;
        }

        :global(.rbc-slot-selection) {
          background-color: rgba(33, 150, 243, 0.1);
          border: 1px solid #2196f3;
        }

        @media (max-width: 768px) {
          .custom-calendar {
            padding: 1rem;
          }

          .calendar-header {
            flex-direction: column;
            align-items: stretch;
          }

          .calendar-controls {
            justify-content: center;
          }

          .calendar-legend {
            justify-content: center;
          }

          .calendar-container {
            min-height: 500px;
          }

          :global(.rbc-toolbar) {
            flex-direction: column;
            gap: 0.5rem;
          }

          :global(.rbc-toolbar-label) {
            order: -1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomCalendar;
