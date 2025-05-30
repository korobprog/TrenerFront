import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import ParticipantVideo from './ParticipantVideo';
import ControlPanel from './ControlPanel';
import {
  getWebRTCConfig,
  getMediaConstraints,
  logWebRTCConfig,
} from '../../lib/webrtc-config';

const VideoRoom = ({ roomId, userId, userName }) => {
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [participants, setParticipants] = useState([]);

  const socketRef = useRef();
  const localVideoRef = useRef();
  const peersRef = useRef([]);

  useEffect(() => {
    // Логирование WebRTC конфигурации для отладки
    logWebRTCConfig();

    // Инициализация Socket.IO соединения
    socketRef.current = io({
      path: '/api/socket-server',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Обработка ошибок подключения
    socketRef.current.on('connect_error', (error) => {
      console.error('Ошибка подключения к Socket.IO:', error);
    });

    socketRef.current.on('connect', () => {
      console.log('Успешно подключились к Socket.IO серверу');

      // Присоединяемся к комнате после успешного подключения
      socketRef.current.emit('join-room', {
        roomId,
        userId,
        userName,
      });
    });

    // Получение локального медиа потока с улучшенными настройками
    const mediaConstraints = getMediaConstraints('medium', true);

    navigator.mediaDevices
      .getUserMedia(mediaConstraints)
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log('Локальный медиа поток получен:', {
          video: stream.getVideoTracks().length > 0,
          audio: stream.getAudioTracks().length > 0,
        });
      })
      .catch((err) => {
        console.error('Ошибка доступа к медиа устройствам:', err);
        // Попытка получить только аудио если видео недоступно
        navigator.mediaDevices
          .getUserMedia({ video: false, audio: true })
          .then((audioStream) => {
            setLocalStream(audioStream);
            console.log('Получен только аудио поток');
          })
          .catch((audioErr) => {
            console.error('Ошибка получения аудио потока:', audioErr);
          });
      });

    // Обработчики Socket.IO событий
    socketRef.current.on('room-joined', (data) => {
      setRoomInfo({
        name: `Комната ${roomId}`,
        participants: data.participants,
      });
      setParticipants(data.participants);

      // Создаем peer соединения с существующими участниками
      data.participants.forEach((participant) => {
        createPeer(participant.userId, participant.userName, true);
      });
    });

    socketRef.current.on('user-joined', (userData) => {
      createPeer(userData.userId, userData.userName, false);
      // Обновляем список участников
      setParticipants((prev) => [...prev, userData]);
    });

    socketRef.current.on('user-left', (userData) => {
      const peerObj = peersRef.current.find(
        (p) => p.userId === userData.userId
      );
      if (peerObj) {
        peerObj.peer.destroy();
        peersRef.current = peersRef.current.filter(
          (p) => p.userId !== userData.userId
        );
        setPeers(peersRef.current);
      }
      // Обновляем список участников
      setParticipants((prev) =>
        prev.filter((p) => p.userId !== userData.userId)
      );
    });

    socketRef.current.on('offer', (data) => {
      const peer = createPeer(data.fromUserId, data.fromUserId, false);
      peer.signal(data.offer);
    });

    socketRef.current.on('answer', (data) => {
      const peerObj = peersRef.current.find(
        (p) => p.userId === data.fromUserId
      );
      if (peerObj) {
        peerObj.peer.signal(data.answer);
      }
    });

    socketRef.current.on('ice-candidate', (data) => {
      const peerObj = peersRef.current.find(
        (p) => p.userId === data.fromUserId
      );
      if (peerObj) {
        peerObj.peer.signal(data.candidate);
      }
    });

    socketRef.current.on('user-video-toggled', (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId
            ? { ...p, videoEnabled: data.videoEnabled }
            : p
        )
      );
    });

    socketRef.current.on('user-audio-toggled', (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId
            ? { ...p, audioEnabled: data.audioEnabled }
            : p
        )
      );
    });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      socketRef.current.disconnect();
      peersRef.current.forEach((peerObj) => {
        peerObj.peer.destroy();
      });
    };
  }, [roomId, userId, userName]);

  const createPeer = (userId, userName, initiator, signal = null) => {
    // Используем улучшенную WebRTC конфигурацию
    const webrtcConfig = getWebRTCConfig();

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: localStream,
      config: webrtcConfig,
    });

    console.log(
      `Создание peer соединения с ${userName} (${userId}), initiator: ${initiator}`
    );

    peer.on('signal', (signal) => {
      console.log(`Signaling событие от peer ${userId}:`, signal.type);

      if (initiator) {
        socketRef.current.emit('offer', {
          targetSocketId: userId,
          offer: signal,
          fromUserId: socketRef.current.id,
        });
      } else {
        socketRef.current.emit('answer', {
          targetSocketId: userId,
          answer: signal,
          fromUserId: socketRef.current.id,
        });
      }
    });

    peer.on('stream', (stream) => {
      console.log(`Получен медиа поток от ${userName} (${userId})`);

      const peerObj = {
        userId,
        userName,
        peer,
        stream,
      };

      peersRef.current.push(peerObj);
      setPeers([...peersRef.current]);
    });

    peer.on('connect', () => {
      console.log(`P2P соединение установлено с ${userName} (${userId})`);
    });

    peer.on('close', () => {
      console.log(`P2P соединение закрыто с ${userName} (${userId})`);
    });

    peer.on('error', (err) => {
      console.error(`Ошибка P2P соединения с ${userName} (${userId}):`, err);
    });

    if (signal) {
      peer.signal(signal);
    }

    return peer;
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        // Уведомляем других участников об изменении статуса видео
        socketRef.current.emit('toggle-video', {
          videoEnabled: videoTrack.enabled,
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        // Уведомляем других участников об изменении статуса аудио
        socketRef.current.emit('toggle-audio', {
          audioEnabled: audioTrack.enabled,
        });
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      console.log('Демонстрация экрана начата');

      // Заменяем видео трек на экран
      const videoTrack = screenStream.getVideoTracks()[0];

      // Обновляем локальный поток
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      // Обновляем локальный поток для всех peer соединений
      peersRef.current.forEach((peerObj) => {
        const sender = peerObj.peer._pc
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack).catch((err) => {
            console.error('Ошибка замены видео трека:', err);
          });
        }
      });

      setIsScreenSharing(true);

      // Обработка завершения демонстрации экрана
      videoTrack.onended = () => {
        console.log('Демонстрация экрана завершена пользователем');
        stopScreenShare();
      };

      socketRef.current.emit('toggle-screen-share', {
        screenShareEnabled: true,
      });
    } catch (err) {
      console.error('Ошибка демонстрации экрана:', err);
      if (err.name === 'NotAllowedError') {
        alert('Доступ к демонстрации экрана отклонен');
      } else if (err.name === 'NotSupportedError') {
        alert('Демонстрация экрана не поддерживается в этом браузере');
      }
    }
  };

  const stopScreenShare = async () => {
    try {
      console.log('Остановка демонстрации экрана');

      // Возвращаемся к камере с улучшенными настройками
      const mediaConstraints = getMediaConstraints('medium', true);
      const cameraStream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );

      const videoTrack = cameraStream.getVideoTracks()[0];

      // Обновляем локальный поток
      setLocalStream(cameraStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }

      // Обновляем видео трек для всех peer соединений
      peersRef.current.forEach((peerObj) => {
        const sender = peerObj.peer._pc
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack).catch((err) => {
            console.error('Ошибка замены видео трека обратно на камеру:', err);
          });
        }
      });

      setIsScreenSharing(false);

      socketRef.current.emit('toggle-screen-share', {
        screenShareEnabled: false,
      });
    } catch (err) {
      console.error('Ошибка остановки демонстрации экрана:', err);
      setIsScreenSharing(false);
    }
  };

  const leaveRoom = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    socketRef.current.disconnect();

    // Перенаправление на главную страницу видеоконференций
    window.location.href = '/video-conference';
  };

  return (
    <div className="video-room">
      <div className="video-room-header">
        <h2>{roomInfo?.name || `Комната ${roomId}`}</h2>
        <div className="participants-count">
          Участников: {participants.length}
        </div>
      </div>

      <div className="video-grid">
        {/* Локальное видео */}
        <div className="video-container local-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`video-element ${
              !isVideoEnabled ? 'video-disabled' : ''
            }`}
          />
          <div className="video-overlay">
            <span className="participant-name">Вы ({userName})</span>
            {isScreenSharing && (
              <span className="screen-share-indicator">
                Демонстрация экрана
              </span>
            )}
          </div>
        </div>

        {/* Видео других участников */}
        {peers.map((peerObj) => (
          <ParticipantVideo
            key={peerObj.userId}
            peer={peerObj}
            participants={participants}
          />
        ))}
      </div>

      <ControlPanel
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onLeaveRoom={leaveRoom}
      />

      <style jsx>{`
        .video-room {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1a1a1a;
          color: white;
        }

        .video-room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: #2a2a2a;
          border-bottom: 1px solid #3a3a3a;
        }

        .video-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          padding: 1rem;
          overflow-y: auto;
        }

        .video-container {
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 16/9;
        }

        .local-video {
          border: 2px solid #4caf50;
        }

        .video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-disabled {
          filter: brightness(0.3);
        }

        .video-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .participant-name {
          font-weight: bold;
        }

        .screen-share-indicator {
          background: #ff4444;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .participants-count {
          background: #333;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default VideoRoom;
