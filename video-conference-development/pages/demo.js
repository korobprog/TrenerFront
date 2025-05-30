import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const VideoConferenceDemo = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Форма создания комнаты
  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    maxParticipants: 10,
    isPrivate: false,
    recordingEnabled: false,
  });

  // Загрузка комнат при монтировании компонента
  useEffect(() => {
    if (status === 'authenticated') {
      loadRooms();
    }
  }, [status]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/custom/rooms');

      if (!response.ok) {
        throw new Error(`Ошибка загрузки комнат: ${response.status}`);
      }

      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка загрузки комнат:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!roomForm.name.trim()) {
      setError('Название комнаты обязательно');
      return;
    }

    try {
      setCreateLoading(true);
      setError(null);

      const response = await fetch('/api/custom/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка создания комнаты');
      }

      const data = await response.json();

      // Обновляем список комнат
      await loadRooms();

      // Сбрасываем форму
      setRoomForm({
        name: '',
        description: '',
        maxParticipants: 10,
        isPrivate: false,
        recordingEnabled: false,
      });

      setShowCreateForm(false);

      // Переходим в созданную комнату
      router.push(`/video-conference/room/${data.room.roomCode}`);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка создания комнаты:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const joinRoom = (roomCode) => {
    router.push(`/video-conference/room/${roomCode}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (status === 'loading') {
    return (
      <div className="demo-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="demo-container">
        <div className="auth-required">
          <h2>Требуется авторизация</h2>
          <p>Для использования видеоконференций необходимо войти в систему.</p>
          <Link href="/api/auth/signin" className="auth-button">
            Войти в систему
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Демо видеоконференций - SuperMock</title>
        <meta
          name="description"
          content="Демонстрация системы видеоконференций SuperMock"
        />
      </Head>

      <div className="demo-container">
        <header className="demo-header">
          <div className="header-content">
            <h1>Видеоконференции SuperMock</h1>
            <p>Демонстрационная страница системы видеоконференций</p>
            <Link href="/" className="back-link">
              ← Вернуться на главную
            </Link>
          </div>
        </header>

        <main className="demo-main">
          {error && (
            <div className="error-message">
              <strong>Ошибка:</strong> {error}
              <button onClick={() => setError(null)} className="error-close">
                ×
              </button>
            </div>
          )}

          {/* Секция создания комнаты */}
          <section className="create-section">
            <div className="section-header">
              <h2>Создать новую комнату</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="toggle-button"
              >
                {showCreateForm ? 'Скрыть форму' : 'Создать комнату'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateRoom} className="create-form">
                <div className="form-group">
                  <label htmlFor="roomName">Название комнаты *</label>
                  <input
                    id="roomName"
                    type="text"
                    value={roomForm.name}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, name: e.target.value })
                    }
                    placeholder="Введите название комнаты"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="roomDescription">Описание</label>
                  <textarea
                    id="roomDescription"
                    value={roomForm.description}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, description: e.target.value })
                    }
                    placeholder="Описание комнаты (необязательно)"
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="maxParticipants">Максимум участников</label>
                    <input
                      id="maxParticipants"
                      type="number"
                      min="2"
                      max="50"
                      value={roomForm.maxParticipants}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          maxParticipants: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={roomForm.isPrivate}
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            isPrivate: e.target.checked,
                          })
                        }
                      />
                      Приватная комната
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={roomForm.recordingEnabled}
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            recordingEnabled: e.target.checked,
                          })
                        }
                      />
                      Запись включена
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="submit-button"
                  >
                    {createLoading ? 'Создание...' : 'Создать комнату'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="cancel-button"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Секция списка комнат */}
          <section className="rooms-section">
            <div className="section-header">
              <h2>Доступные комнаты</h2>
              <button
                onClick={loadRooms}
                disabled={loading}
                className="refresh-button"
              >
                {loading ? 'Обновление...' : 'Обновить'}
              </button>
            </div>

            {loading ? (
              <div className="loading">Загрузка комнат...</div>
            ) : rooms.length === 0 ? (
              <div className="empty-state">
                <p>Нет доступных комнат</p>
                <p>Создайте новую комнату, чтобы начать видеоконференцию</p>
              </div>
            ) : (
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <div key={room.id} className="room-card">
                    <div className="room-header">
                      <h3>{room.name}</h3>
                      <span
                        className={`room-status ${
                          room.isActive ? 'active' : 'inactive'
                        }`}
                      >
                        {room.isActive ? 'Активна' : 'Неактивна'}
                      </span>
                    </div>

                    {room.description && (
                      <p className="room-description">{room.description}</p>
                    )}

                    <div className="room-info">
                      <div className="info-item">
                        <span className="info-label">Код комнаты:</span>
                        <span className="info-value room-code">
                          {room.roomCode}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Участники:</span>
                        <span className="info-value">
                          {room._count.participants}/{room.maxParticipants}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Хост:</span>
                        <span className="info-value">{room.host.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Создана:</span>
                        <span className="info-value">
                          {formatDate(room.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="room-actions">
                      <button
                        onClick={() => joinRoom(room.roomCode)}
                        className="join-button"
                        disabled={!room.isActive}
                      >
                        {room.isActive ? 'Присоединиться' : 'Комната закрыта'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Секция тестирования */}
          <section className="test-section">
            <div className="section-header">
              <h2>Тестирование системы</h2>
            </div>

            <div className="test-info">
              <p>Для полного тестирования системы видеоконференций:</p>
              <ol>
                <li>Создайте новую комнату</li>
                <li>Скопируйте код комнаты</li>
                <li>Откройте новую вкладку браузера</li>
                <li>
                  Присоединитесь к комнате с другого устройства или браузера
                </li>
                <li>Протестируйте видео, аудио и демонстрацию экрана</li>
              </ol>

              <div className="test-links">
                <Link href="/test-video-conference" className="test-link">
                  Запустить системные тесты
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .demo-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .demo-header {
          background: rgba(0, 0, 0, 0.2);
          padding: 2rem 0;
          text-align: center;
        }

        .header-content h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2.5rem;
          font-weight: bold;
        }

        .header-content p {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .back-link {
          color: white;
          text-decoration: none;
          font-size: 1rem;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .back-link:hover {
          opacity: 1;
        }

        .demo-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .error-message {
          background: #ff4444;
          color: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-close {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .create-section,
        .rooms-section,
        .test-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .toggle-button,
        .refresh-button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-button:hover,
        .refresh-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .create-form {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-group input[type='checkbox'] {
          width: auto;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .submit-button {
          background: #4caf50;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          background: #45a049;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .cancel-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .loading {
          text-align: center;
          padding: 2rem;
          font-size: 1.1rem;
          opacity: 0.8;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          opacity: 0.8;
        }

        .empty-state p {
          margin: 0.5rem 0;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .room-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .room-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .room-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .room-status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .room-status.active {
          background: #4caf50;
          color: white;
        }

        .room-status.inactive {
          background: #757575;
          color: white;
        }

        .room-description {
          margin: 0 0 1rem 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .room-info {
          margin-bottom: 1.5rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .info-label {
          opacity: 0.8;
        }

        .info-value {
          font-weight: 500;
        }

        .room-code {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .room-actions {
          text-align: center;
        }

        .join-button {
          background: #2196f3;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
          width: 100%;
        }

        .join-button:hover:not(:disabled) {
          background: #1976d2;
        }

        .join-button:disabled {
          background: #757575;
          cursor: not-allowed;
        }

        .test-info {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .test-info ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .test-info li {
          margin-bottom: 0.5rem;
        }

        .test-links {
          margin-top: 1.5rem;
          text-align: center;
        }

        .test-link {
          display: inline-block;
          background: #ff9800;
          color: white;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .test-link:hover {
          background: #f57c00;
        }

        .auth-required {
          text-align: center;
          padding: 4rem 2rem;
        }

        .auth-required h2 {
          margin-bottom: 1rem;
        }

        .auth-required p {
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        .auth-button {
          display: inline-block;
          background: #4caf50;
          color: white;
          text-decoration: none;
          padding: 1rem 2rem;
          border-radius: 6px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .auth-button:hover {
          background: #45a049;
        }

        @media (max-width: 768px) {
          .demo-main {
            padding: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .rooms-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .header-content h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </>
  );
};

export default VideoConferenceDemo;
