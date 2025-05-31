import React, { useRef, useEffect, useState } from 'react';

const ParticipantVideo = ({ peer, participants }) => {
  const videoRef = useRef();
  const [participantInfo, setParticipantInfo] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    // Находим информацию об участнике
    const info = participants.find((p) => p.userId === peer.userId);
    setParticipantInfo(info);
  }, [participants, peer.userId]);

  useEffect(() => {
    if (peer.stream && videoRef.current) {
      videoRef.current.srcObject = peer.stream;
    }

    // Мониторинг качества соединения
    if (peer.peer && peer.peer._pc) {
      const pc = peer.peer._pc;

      const checkConnectionQuality = () => {
        pc.getStats()
          .then((stats) => {
            stats.forEach((report) => {
              if (
                report.type === 'inbound-rtp' &&
                report.mediaType === 'video'
              ) {
                const packetsLost = report.packetsLost || 0;
                const packetsReceived = report.packetsReceived || 0;
                const lossRate = packetsLost / (packetsLost + packetsReceived);

                if (lossRate < 0.02) {
                  setConnectionQuality('excellent');
                } else if (lossRate < 0.05) {
                  setConnectionQuality('good');
                } else if (lossRate < 0.1) {
                  setConnectionQuality('fair');
                } else {
                  setConnectionQuality('poor');
                }
              }
            });
          })
          .catch((err) => {
            console.error('Ошибка получения статистики соединения:', err);
          });
      };

      const qualityInterval = setInterval(checkConnectionQuality, 5000);

      return () => {
        clearInterval(qualityInterval);
      };
    }
  }, [peer]);

  useEffect(() => {
    // Обработка изменений в медиа треках
    if (peer.stream) {
      const videoTrack = peer.stream.getVideoTracks()[0];
      const audioTrack = peer.stream.getAudioTracks()[0];

      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);

        // Проверяем, является ли это демонстрацией экрана
        videoTrack.onended = () => {
          setIsScreenSharing(false);
        };

        // Определяем тип видео трека (камера или экран)
        const settings = videoTrack.getSettings();
        if (settings.displaySurface) {
          setIsScreenSharing(true);
        }
      }

      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [peer.stream]);

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getConnectionQualityText = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'Отличное';
      case 'good':
        return 'Хорошее';
      case 'fair':
        return 'Удовлетворительное';
      case 'poor':
        return 'Плохое';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <div className="participant-video-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`participant-video ${
          !isVideoEnabled ? 'video-disabled' : ''
        }`}
      />

      {!isVideoEnabled && (
        <div className="video-placeholder">
          <div className="avatar">
            {participantInfo?.userName?.charAt(0)?.toUpperCase() ||
              peer.userName?.charAt(0)?.toUpperCase() ||
              '?'}
          </div>
        </div>
      )}

      <div className="participant-overlay">
        <div className="participant-info">
          <span className="participant-name">
            {participantInfo?.userName || peer.userName || 'Участник'}
          </span>
          {participantInfo?.role === 'host' && (
            <span className="host-badge">Ведущий</span>
          )}
          {participantInfo?.role === 'moderator' && (
            <span className="moderator-badge">Модератор</span>
          )}
        </div>

        <div className="participant-controls">
          <div className="media-status">
            <span
              className={`audio-indicator ${
                isAudioEnabled ? 'enabled' : 'disabled'
              }`}
            >
              {isAudioEnabled ? '🎤' : '🔇'}
            </span>
            <span
              className={`video-indicator ${
                isVideoEnabled ? 'enabled' : 'disabled'
              }`}
            >
              {isVideoEnabled ? '📹' : '📷'}
            </span>
            {isScreenSharing && (
              <span className="screen-share-indicator">🖥️</span>
            )}
          </div>

          <div
            className="connection-quality"
            style={{ color: getConnectionQualityColor() }}
            title={`Качество соединения: ${getConnectionQualityText()}`}
          >
            ●
          </div>
        </div>
      </div>

      {isScreenSharing && (
        <div className="screen-share-banner">Демонстрация экрана</div>
      )}

      <style jsx>{`
        .participant-video-container {
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 16/9;
          border: 2px solid #333;
          transition: border-color 0.3s ease;
        }

        .participant-video-container:hover {
          border-color: #555;
        }

        .participant-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-disabled {
          display: none;
        }

        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          color: white;
          border: 3px solid rgba(255, 255, 255, 0.3);
        }

        .participant-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .participant-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .participant-name {
          font-weight: bold;
          color: white;
          font-size: 0.9rem;
        }

        .host-badge {
          background: #ff6b35;
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          align-self: flex-start;
        }

        .moderator-badge {
          background: #4caf50;
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          align-self: flex-start;
        }

        .participant-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .media-status {
          display: flex;
          gap: 0.25rem;
        }

        .audio-indicator,
        .video-indicator,
        .screen-share-indicator {
          font-size: 1rem;
          opacity: 0.8;
        }

        .audio-indicator.disabled,
        .video-indicator.disabled {
          opacity: 0.3;
        }

        .connection-quality {
          font-size: 1.2rem;
          cursor: help;
        }

        .screen-share-banner {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          background: #ff4444;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .participant-overlay {
            padding: 0.5rem;
          }

          .participant-name {
            font-size: 0.8rem;
          }

          .avatar {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ParticipantVideo;
