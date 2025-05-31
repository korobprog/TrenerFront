// Тест для диагностики проблемы с встроенной видеосистемой
const testBuiltInVideoCreation = async () => {
  console.log('=== ТЕСТ СОЗДАНИЯ ВСТРОЕННОЙ ВИДЕОСИСТЕМЫ ===');

  try {
    // 1. Тестируем создание VideoRoom напрямую
    console.log('1. Тестирование создания VideoRoom...');
    const videoRoomResponse = await fetch(
      'http://localhost:3000/api/video-conferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: document.cookie, // Передаем cookies для авторизации
        },
        body: JSON.stringify({
          name: 'Тестовая комната для собеседования',
          description: 'Тест создания встроенной видеосистемы',
          isPrivate: true,
          maxParticipants: 2,
          scheduledStartTime: new Date(
            Date.now() + 60 * 60 * 1000
          ).toISOString(), // +1 час
          recordingEnabled: false,
          settings: {
            allowScreenShare: true,
            allowChat: true,
            autoRecord: false,
          },
        }),
      }
    );

    console.log('VideoRoom API Response Status:', videoRoomResponse.status);
    const videoRoomData = await videoRoomResponse.json();
    console.log('VideoRoom API Response Data:', videoRoomData);

    if (!videoRoomResponse.ok) {
      console.error('❌ Ошибка создания VideoRoom:', videoRoomData);
      return false;
    }

    console.log('✅ VideoRoom создана успешно:', {
      id: videoRoomData.id,
      code: videoRoomData.code,
      name: videoRoomData.name,
    });

    // 2. Тестируем создание собеседования с built_in типом
    console.log('\n2. Тестирование создания собеседования с built_in...');
    const interviewResponse = await fetch(
      'http://localhost:3000/api/mock-interviews',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: document.cookie,
        },
        body: JSON.stringify({
          scheduledTime: new Date(
            Date.now() + 2 * 60 * 60 * 1000
          ).toISOString(), // +2 часа
          videoType: 'built_in',
        }),
      }
    );

    console.log('Interview API Response Status:', interviewResponse.status);
    const interviewData = await interviewResponse.json();
    console.log('Interview API Response Data:', interviewData);

    if (!interviewResponse.ok) {
      console.error('❌ Ошибка создания собеседования:', interviewData);
      return false;
    }

    console.log('✅ Собеседование создано успешно:', {
      id: interviewData.id,
      videoType: interviewData.videoType,
      videoRoomId: interviewData.videoRoomId,
      meetingLink: interviewData.meetingLink,
    });

    return true;
  } catch (error) {
    console.error('❌ Критическая ошибка в тесте:', error);
    return false;
  }
};

// Запуск теста
testBuiltInVideoCreation().then((success) => {
  if (success) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО');
  } else {
    console.log('\n💥 ТЕСТЫ ЗАВЕРШИЛИСЬ С ОШИБКАМИ');
  }
});
