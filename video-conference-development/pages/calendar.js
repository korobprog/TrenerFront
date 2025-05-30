import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import CustomCalendar from '../components/calendar/CustomCalendar';
import NotificationCenter from '../components/notifications/NotificationCenter';
import { useCalendar } from '../hooks/useCalendar';
import {
  formatDateTime,
  getEventsStatistics,
  groupEventsByDay,
} from '../lib/calendar-utils';

const CalendarPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  const {
    events,
    loading,
    error,
    refreshEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar(session?.user?.id);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="calendar-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Фильтрация событий
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.eventType === filterType;
    return matchesSearch && matchesType;
  });

  // Статистика событий
  const statistics = getEventsStatistics(filteredEvents);
  const groupedEvents = groupEventsByDay(filteredEvents);

  const handleEventSelect = (event) => {
    console.log('Выбрано событие:', event);
  };

  const handleSlotSelect = (slotInfo) => {
    console.log('Выбран слот:', slotInfo);
  };

  const handleCreateVideoConference = async (eventData) => {
    try {
      // Создаем событие с видеокомнатой
      const eventWithVideo = {
        ...eventData,
        createVideoRoom: true,
        eventType: 'meeting',
      };

      const newEvent = await createEvent(eventWithVideo);

      if (newEvent.videoRoomId) {
        // Перенаправляем в видеокомнату
        router.push(`/room/${newEvent.videoRoomId}`);
      }
    } catch (error) {
      console.error('Ошибка создания видеоконференции:', error);
    }
  };

  const upcomingEvents = filteredEvents
    .filter((event) => new Date(event.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="header-left">
          <h1>Календарь событий</h1>
          <p>Управление встречами и видеоконференциями</p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowStatistics(!showStatistics)}
          >
            📊 Статистика
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔 Уведомления
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const now = new Date();
              const endTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 час
              handleCreateVideoConference({
                title: 'Быстрая встреча',
                startTime: now.toISOString(),
                endTime: endTime.toISOString(),
                description: 'Быстро созданная видеоконференция',
              });
            }}
          >
            🎥 Быстрая встреча
          </button>
        </div>
      </div>

      <div className="calendar-controls">
        <div className="search-filter">
          <div className="search-box">
            <input
              type="text"
              placeholder="Поиск событий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все типы</option>
            <option value="meeting">Встречи</option>
            <option value="interview">Собеседования</option>
            <option value="training">Тренировки</option>
          </select>
        </div>

        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Месяц
          </button>
          <button
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Неделя
          </button>
          <button
            className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            День
          </button>
        </div>
      </div>

      <div className="calendar-content">
        <div className="calendar-main">
          {error && (
            <div className="error-message">
              <p>Ошибка загрузки событий: {error}</p>
              <button onClick={refreshEvents} className="btn btn-secondary">
                Повторить
              </button>
            </div>
          )}

          <CustomCalendar
            userId={session.user.id}
            onEventSelect={handleEventSelect}
            onSlotSelect={handleSlotSelect}
            view={viewMode}
            date={selectedDate}
            events={filteredEvents}
          />
        </div>

        <div className="calendar-sidebar">
          {/* Предстоящие события */}
          <div className="sidebar-section">
            <h3>Предстоящие события</h3>
            {upcomingEvents.length > 0 ? (
              <div className="upcoming-events">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="upcoming-event">
                    <div className="event-time">
                      {formatDateTime(event.startTime, 'time')}
                    </div>
                    <div className="event-details">
                      <div className="event-title">{event.title}</div>
                      <div className="event-type">{event.eventType}</div>
                    </div>
                    {event.videoRoomId && (
                      <button
                        className="join-btn"
                        onClick={() =>
                          router.push(`/room/${event.videoRoomId}`)
                        }
                      >
                        Войти
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-events">Нет предстоящих событий</p>
            )}
          </div>

          {/* Статистика */}
          {showStatistics && (
            <div className="sidebar-section">
              <h3>Статистика</h3>
              <div className="statistics">
                <div className="stat-item">
                  <span className="stat-label">Всего событий:</span>
                  <span className="stat-value">{statistics.total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Предстоящих:</span>
                  <span className="stat-value">
                    {statistics.upcomingEvents}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Прошедших:</span>
                  <span className="stat-value">{statistics.pastEvents}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Средняя длительность:</span>
                  <span className="stat-value">
                    {Math.round(statistics.averageDuration)} мин
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Быстрые действия */}
          <div className="sidebar-section">
            <h3>Быстрые действия</h3>
            <div className="quick-actions">
              <button
                className="quick-action-btn"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(10, 0, 0, 0);
                  const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000);

                  handleCreateVideoConference({
                    title: 'Встреча на завтра',
                    startTime: tomorrow.toISOString(),
                    endTime: endTime.toISOString(),
                    description: 'Запланированная встреча',
                  });
                }}
              >
                📅 Встреча на завтра
              </button>
              <button
                className="quick-action-btn"
                onClick={() => router.push('/video-conference')}
              >
                🎥 Видеоконференции
              </button>
              <button
                className="quick-action-btn"
                onClick={refreshEvents}
                disabled={loading}
              >
                🔄 Обновить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Центр уведомлений */}
      {showNotifications && (
        <NotificationCenter
          userId={session.user.id}
          onClose={() => setShowNotifications(false)}
        />
      )}

      <style jsx>{`
        .calendar-page {
          min-height: 100vh;
          background: #f5f7fa;
          padding: 2rem;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-left h1 {
          margin: 0 0 0.5rem 0;
          color: #2c3e50;
          font-size: 2rem;
          font-weight: 600;
        }

        .header-left p {
          margin: 0;
          color: #7f8c8d;
          font-size: 1.1rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover {
          background: #2980b9;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #ecf0f1;
          color: #2c3e50;
        }

        .btn-secondary:hover {
          background: #d5dbdb;
        }

        .calendar-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .search-filter {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .search-box {
          position: relative;
        }

        .search-input {
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          width: 300px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #7f8c8d;
        }

        .filter-select {
          padding: 0.75rem 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
        }

        .view-controls {
          display: flex;
          gap: 0.5rem;
        }

        .view-btn {
          padding: 0.75rem 1.5rem;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn:hover {
          background: #f8f9fa;
        }

        .view-btn.active {
          background: #3498db;
          color: white;
          border-color: #3498db;
        }

        .calendar-content {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }

        .calendar-main {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .calendar-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar-section {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .sidebar-section h3 {
          margin: 0 0 1rem 0;
          color: #2c3e50;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .upcoming-events {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .upcoming-event {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .event-time {
          font-weight: 600;
          color: #3498db;
          min-width: 60px;
        }

        .event-details {
          flex: 1;
        }

        .event-title {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 0.25rem;
        }

        .event-type {
          font-size: 0.9rem;
          color: #7f8c8d;
          text-transform: capitalize;
        }

        .join-btn {
          padding: 0.5rem 1rem;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .join-btn:hover {
          background: #229954;
        }

        .no-events {
          color: #7f8c8d;
          font-style: italic;
          text-align: center;
          padding: 2rem;
        }

        .statistics {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #ecf0f1;
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-label {
          color: #7f8c8d;
        }

        .stat-value {
          font-weight: 600;
          color: #2c3e50;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .quick-action-btn {
          padding: 0.75rem 1rem;
          background: #ecf0f1;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          font-size: 0.95rem;
        }

        .quick-action-btn:hover {
          background: #d5dbdb;
          transform: translateY(-1px);
        }

        .quick-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .error-message p {
          color: #c33;
          margin: 0 0 1rem 0;
        }

        .calendar-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #7f8c8d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
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

        @media (max-width: 1200px) {
          .calendar-content {
            grid-template-columns: 1fr;
          }

          .calendar-sidebar {
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .calendar-page {
            padding: 1rem;
          }

          .calendar-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .header-actions {
            flex-wrap: wrap;
            justify-content: center;
          }

          .calendar-controls {
            flex-direction: column;
            gap: 1rem;
          }

          .search-filter {
            flex-direction: column;
            width: 100%;
          }

          .search-input {
            width: 100%;
          }

          .view-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;
