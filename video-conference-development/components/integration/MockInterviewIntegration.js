import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useNotification } from '../../../contexts/NotificationContext';

const MockInterviewIntegration = ({ mockInterviewId, interview }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  const [videoRoom, setVideoRoom] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (mockInterviewId) {
      fetchVideoRoom();
    }
  }, [mockInterviewId]);

  async function fetchVideoRoom() {
    try {
      const response = await fetch(
        `/api/mock-interviews/${mockInterviewId}/video-room`
      );

      if (response.ok) {
        const room = await response.json();
        setVideoRoom(room);
      } else if (response.status !== 404) {
        console.error('Ошибка получения видеокомнаты:', response.statusText);
      }
    } catch (err) {
      console.error('Ошибка получения видеокомнаты:', err);
    }
  }

  async function createVideoRoom() {
    try {
      setIsCreatingRoom(true);

      const response = await fetch(
        `/api/mock-interviews/${mockInterviewId}/video-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Собеседование ${new Date(
              interview.scheduledTime
            ).toLocaleDateString('ru-RU')}`,
            description: `Видеокомната для собеседования между ${
              interview.interviewer?.name
            } и ${interview.interviewee?.name || 'кандидатом'}`,
            isPrivate: true,
            maxParticipants: 2,
            scheduledStartTime: interview.scheduledTime,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Не удалось создать видеокомнату');
      }

      const newRoom = await response.json();
      setVideoRoom(newRoom);
      showSuccess('Видеокомната успешно создана');
    } catch (err) {
      console.error('Ошибка создания видеокомнаты:', err);
      showError(err.message);
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function joinVideoRoom() {
    if (!videoRoom) return;

    try {
      setIsJoining(true);

      // Переходим на страницу видеокомнаты
      router.push(`/video-conference/room/${videoRoom.roomCode}`);
    } catch (err) {
      console.error('Ошибка присоединения к видеокомнате:', err);
      showError('Не удалось присоединиться к видеокомнате');
    } finally {
      setIsJoining(false);
    }
  }

  // Проверяем права доступа
  const isInterviewer = interview?.interviewerId === session?.user?.id;
  const isInterviewee = interview?.intervieweeId === session?.user?.id;
  const hasAccess = isInterviewer || isInterviewee;

  if (!hasAccess) {
    return null;
  }

  // Проверяем статус собеседования
  const canUseVideoRoom =
    interview?.status === 'booked' || interview?.status === 'completed';

  if (!canUseVideoRoom) {
    return (
      <div className="video-integration-disabled">
        <div className="info-message">
          <span className="info-icon">ℹ️</span>
          <p>
            Видеоконференция будет доступна после подтверждения собеседования
          </p>
        </div>
        <style jsx>{`
          .video-integration-disabled {
            margin: 1rem 0;
            padding: 1rem;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
          }
          .info-message {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .info-icon {
            font-size: 1.2rem;
          }
          .info-message p {
            margin: 0;
            color: #6c757d;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="video-integration">
      <div className="video-section">
        <h3>Видеоконференция</h3>

        {videoRoom ? (
          <div className="video-room-info">
            <div className="room-details">
              <p>
                <strong>Комната:</strong> {videoRoom.name}
              </p>
              <p>
                <strong>Код комнаты:</strong> <code>{videoRoom.roomCode}</code>
              </p>
              {videoRoom.description && (
                <p>
                  <strong>Описание:</strong> {videoRoom.description}
                </p>
              )}
            </div>

            <div className="video-actions">
              <button
                onClick={joinVideoRoom}
                disabled={isJoining}
                className="join-video-btn"
              >
                {isJoining ? (
                  <>
                    <span className="spinner"></span>
                    Подключение...
                  </>
                ) : (
                  <>🎥 Присоединиться к видеоконференции</>
                )}
              </button>

              <div className="video-info">
                <small>
                  💡 Убедитесь, что у вас есть доступ к камере и микрофону
                </small>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-video-room">
            <p>Видеокомната для этого собеседования еще не создана</p>

            {isInterviewer && (
              <button
                onClick={createVideoRoom}
                disabled={isCreatingRoom}
                className="create-video-btn"
              >
                {isCreatingRoom ? (
                  <>
                    <span className="spinner"></span>
                    Создание...
                  </>
                ) : (
                  <>➕ Создать видеокомнату</>
                )}
              </button>
            )}

            {isInterviewee && (
              <div className="waiting-message">
                <span className="waiting-icon">⏳</span>
                <p>Ожидание создания видеокомнаты интервьюером</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .video-integration {
          margin: 1.5rem 0;
          padding: 1.5rem;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
        }

        .video-section h3 {
          margin: 0 0 1rem 0;
          color: #495057;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .video-section h3::before {
          content: '🎥';
          font-size: 1.2rem;
        }

        .video-room-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .room-details {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .room-details p {
          margin: 0.5rem 0;
          color: #495057;
        }

        .room-details code {
          background: #e9ecef;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          color: #495057;
        }

        .video-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .join-video-btn,
        .create-video-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .join-video-btn:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
        }

        .create-video-btn {
          background: #007bff;
        }

        .create-video-btn:hover:not(:disabled) {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .join-video-btn:disabled,
        .create-video-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .video-info {
          text-align: center;
        }

        .video-info small {
          color: #6c757d;
          font-style: italic;
        }

        .no-video-room {
          text-align: center;
          padding: 1rem;
        }

        .no-video-room p {
          margin: 0 0 1rem 0;
          color: #6c757d;
        }

        .waiting-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          margin-top: 1rem;
        }

        .waiting-icon {
          font-size: 1.5rem;
        }

        .waiting-message p {
          margin: 0;
          color: #856404;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .video-integration {
            margin: 1rem 0;
            padding: 1rem;
          }

          .join-video-btn,
          .create-video-btn {
            padding: 0.875rem 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MockInterviewIntegration;
