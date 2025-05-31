import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import VideoRoom from '../../components/video/VideoRoom';
import { useNotification } from '../../../contexts/NotificationContext';

export default function VideoRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { code } = router.query;
  const { showError, showSuccess } = useNotification();

  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session && code) {
      fetchRoomData();
    }
  }, [session, code, status]);

  async function fetchRoomData() {
    try {
      setIsLoading(true);
      setError(null);

      // Получаем информацию о комнате по коду
      const response = await fetch(`/api/video-rooms/by-code/${code}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Видеокомната не найдена');
        }
        throw new Error('Ошибка загрузки видеокомнаты');
      }

      const room = await response.json();

      // Проверяем права доступа к комнате
      if (room.isPrivate && !canAccessRoom(room)) {
        throw new Error('У вас нет доступа к этой видеокомнате');
      }

      setRoomData(room);

      // Присоединяемся к комнате
      await joinRoom(room.id);
    } catch (err) {
      console.error('Ошибка загрузки комнаты:', err);
      setError(err.message);
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function canAccessRoom(room) {
    const userId = session?.user?.id;

    // Хост всегда имеет доступ
    if (room.hostId === userId) {
      return true;
    }

    // Проверяем, есть ли пользователь в списке участников
    const isParticipant = room.participants?.some((p) => p.userId === userId);
    if (isParticipant) {
      return true;
    }

    // Если комната связана с mock-interview, проверяем права доступа
    if (room.mockInterviewId) {
      return (
        room.mockInterview?.interviewerId === userId ||
        room.mockInterview?.intervieweeId === userId
      );
    }

    // Для публичных комнат доступ открыт всем
    return !room.isPrivate;
  }

  async function joinRoom(roomId) {
    try {
      const response = await fetch(`/api/video-rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось присоединиться к комнате');
      }

      showSuccess('Успешно присоединились к видеокомнате');
    } catch (err) {
      console.error('Ошибка присоединения к комнате:', err);
      showError(err.message);
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка видеокомнаты...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #1a1a1a;
            color: white;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top: 4px solid #4caf50;
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
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h1>Ошибка доступа к видеокомнате</h1>
          <p>{error}</p>
          <div className="error-actions">
            <button
              onClick={() => router.push('/mock-interviews')}
              className="btn-primary"
            >
              Вернуться к собеседованиям
            </button>
            <button onClick={() => router.push('/')} className="btn-secondary">
              На главную
            </button>
          </div>
        </div>
        <style jsx>{`
          .error-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #1a1a1a;
            color: white;
            padding: 2rem;
          }
          .error-content {
            text-align: center;
            max-width: 500px;
          }
          .error-content h1 {
            color: #ff4444;
            margin-bottom: 1rem;
          }
          .error-content p {
            margin-bottom: 2rem;
            color: #ccc;
          }
          .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }
          .btn-primary,
          .btn-secondary {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            transition: background-color 0.2s;
          }
          .btn-primary {
            background: #4caf50;
            color: white;
          }
          .btn-primary:hover {
            background: #45a049;
          }
          .btn-secondary {
            background: #333;
            color: white;
          }
          .btn-secondary:hover {
            background: #555;
          }
        `}</style>
      </div>
    );
  }

  if (!roomData) {
    return null;
  }

  return (
    <div className="video-room-page">
      <VideoRoom
        roomId={roomData.id}
        roomCode={code}
        userId={session.user.id}
        userName={session.user.name || session.user.email}
        roomData={roomData}
      />
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
