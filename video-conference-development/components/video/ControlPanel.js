import React, { useState } from 'react';

const ControlPanel = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onStartScreenShare,
  onStopScreenShare,
  onLeaveRoom,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const handleScreenShareToggle = () => {
    if (isScreenSharing) {
      onStopScreenShare();
    } else {
      onStartScreenShare();
    }
  };

  return (
    <div className="control-panel">
      <div className="control-group main-controls">
        {/* Управление аудио */}
        <button
          className={`control-button ${
            isAudioEnabled ? 'enabled' : 'disabled'
          }`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          <span className="control-icon">{isAudioEnabled ? '🎤' : '🔇'}</span>
          <span className="control-label">
            {isAudioEnabled ? 'Микрофон' : 'Микрофон выкл.'}
          </span>
        </button>

        {/* Управление видео */}
        <button
          className={`control-button ${
            isVideoEnabled ? 'enabled' : 'disabled'
          }`}
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}
        >
          <span className="control-icon">{isVideoEnabled ? '📹' : '📷'}</span>
          <span className="control-label">
            {isVideoEnabled ? 'Камера' : 'Камера выкл.'}
          </span>
        </button>

        {/* Демонстрация экрана */}
        <button
          className={`control-button ${isScreenSharing ? 'active' : ''}`}
          onClick={handleScreenShareToggle}
          title={
            isScreenSharing
              ? 'Остановить демонстрацию экрана'
              : 'Демонстрация экрана'
          }
        >
          <span className="control-icon">🖥️</span>
          <span className="control-label">
            {isScreenSharing ? 'Остановить показ' : 'Показать экран'}
          </span>
        </button>
      </div>

      <div className="control-group secondary-controls">
        {/* Участники */}
        <button
          className={`control-button ${showParticipants ? 'active' : ''}`}
          onClick={() => setShowParticipants(!showParticipants)}
          title="Участники"
        >
          <span className="control-icon">👥</span>
          <span className="control-label">Участники</span>
        </button>

        {/* Настройки */}
        <button
          className={`control-button ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Настройки"
        >
          <span className="control-icon">⚙️</span>
          <span className="control-label">Настройки</span>
        </button>

        {/* Покинуть комнату */}
        <button
          className="control-button leave-button"
          onClick={onLeaveRoom}
          title="Покинуть комнату"
        >
          <span className="control-icon">📞</span>
          <span className="control-label">Выйти</span>
        </button>
      </div>

      {/* Панель настроек */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Настройки</h3>
            <button
              className="close-button"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>
          </div>

          <div className="settings-content">
            <div className="setting-group">
              <h4>Аудио</h4>
              <div className="setting-item">
                <label>Устройство ввода:</label>
                <select className="setting-select">
                  <option>Микрофон по умолчанию</option>
                </select>
              </div>
              <div className="setting-item">
                <label>Качество аудио:</label>
                <select className="setting-select">
                  <option value="low">Низкое</option>
                  <option value="medium">Среднее</option>
                  <option value="high" selected>
                    Высокое
                  </option>
                </select>
              </div>
            </div>

            <div className="setting-group">
              <h4>Видео</h4>
              <div className="setting-item">
                <label>Камера:</label>
                <select className="setting-select">
                  <option>Камера по умолчанию</option>
                </select>
              </div>
              <div className="setting-item">
                <label>Качество видео:</label>
                <select className="setting-select">
                  <option value="480p">480p</option>
                  <option value="720p" selected>
                    720p
                  </option>
                  <option value="1080p">1080p</option>
                </select>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" />
                  Размытие фона
                </label>
              </div>
            </div>

            <div className="setting-group">
              <h4>Общие</h4>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Уведомления
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Автоматически включать аудио при входе
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" />
                  Автоматически включать видео при входе
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Панель участников */}
      {showParticipants && (
        <div className="participants-panel">
          <div className="participants-header">
            <h3>Участники</h3>
            <button
              className="close-button"
              onClick={() => setShowParticipants(false)}
            >
              ✕
            </button>
          </div>

          <div className="participants-content">
            <div className="participant-item">
              <div className="participant-avatar">В</div>
              <div className="participant-info">
                <span className="participant-name">Вы</span>
                <span className="participant-status">Ведущий</span>
              </div>
              <div className="participant-controls">
                <span className="media-indicator">🎤</span>
                <span className="media-indicator">📹</span>
              </div>
            </div>

            {/* Здесь будут отображаться другие участники */}
          </div>
        </div>
      )}

      <style jsx>{`
        .control-panel {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: #2a2a2a;
          border-top: 1px solid #3a3a3a;
        }

        .control-group {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .control-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          background: #3a3a3a;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 80px;
        }

        .control-button:hover {
          background: #4a4a4a;
          transform: translateY(-1px);
        }

        .control-button.enabled {
          background: #4caf50;
        }

        .control-button.enabled:hover {
          background: #45a049;
        }

        .control-button.disabled {
          background: #f44336;
        }

        .control-button.disabled:hover {
          background: #da190b;
        }

        .control-button.active {
          background: #2196f3;
        }

        .control-button.active:hover {
          background: #1976d2;
        }

        .leave-button {
          background: #f44336 !important;
        }

        .leave-button:hover {
          background: #da190b !important;
        }

        .control-icon {
          font-size: 1.5rem;
        }

        .control-label {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .settings-panel,
        .participants-panel {
          position: absolute;
          bottom: 100%;
          right: 2rem;
          width: 350px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .settings-header,
        .participants-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #3a3a3a;
        }

        .settings-header h3,
        .participants-header h3 {
          margin: 0;
          color: white;
          font-size: 1.1rem;
        }

        .close-button {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0.25rem;
        }

        .close-button:hover {
          color: white;
        }

        .settings-content,
        .participants-content {
          padding: 1rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .setting-group {
          margin-bottom: 1.5rem;
        }

        .setting-group h4 {
          margin: 0 0 0.75rem 0;
          color: #ccc;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .setting-item {
          margin-bottom: 0.75rem;
        }

        .setting-item label {
          display: block;
          color: white;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .setting-select {
          width: 100%;
          padding: 0.5rem;
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          border-radius: 4px;
          color: white;
          font-size: 0.9rem;
        }

        .setting-select:focus {
          outline: none;
          border-color: #2196f3;
        }

        .setting-item input[type='checkbox'] {
          margin-right: 0.5rem;
        }

        .participant-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 0.5rem;
        }

        .participant-item:hover {
          background: #3a3a3a;
        }

        .participant-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #4caf50;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }

        .participant-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .participant-name {
          color: white;
          font-weight: 500;
        }

        .participant-status {
          color: #999;
          font-size: 0.8rem;
        }

        .participant-controls {
          display: flex;
          gap: 0.5rem;
        }

        .media-indicator {
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .control-panel {
            padding: 0.75rem 1rem;
          }

          .control-group {
            gap: 0.5rem;
          }

          .control-button {
            min-width: 60px;
            padding: 0.5rem 0.75rem;
          }

          .control-label {
            font-size: 0.7rem;
          }

          .settings-panel,
          .participants-panel {
            width: 300px;
            right: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
