/**
 * Тестовый скрипт для проверки исправлений статистики
 */

const https = require('https');
const http = require('http');

// Функция для выполнения HTTP запроса
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function testStatisticsAPI() {
  console.log('🧪 ТЕСТ: Проверка API статистики...\n');

  try {
    // Тестируем API endpoint
    const apiOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/statistics',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script',
      },
    };

    console.log('📡 Отправляем запрос к API...');
    const apiResponse = await makeRequest(apiOptions);

    console.log(`📊 Статус ответа API: ${apiResponse.statusCode}`);

    if (apiResponse.statusCode === 200) {
      console.log('✅ API отвечает успешно');
      console.log('📋 Структура ответа API:');

      if (typeof apiResponse.data === 'object') {
        console.log('  - success:', apiResponse.data.success);
        console.log('  - data присутствует:', !!apiResponse.data.data);

        if (apiResponse.data.data) {
          const data = apiResponse.data.data;
          console.log('  - users:', !!data.users);
          console.log('  - interviews:', !!data.interviews);
          console.log('  - points:', !!data.points);
          console.log('  - adminActivity:', !!data.adminActivity);

          if (data.users) {
            console.log('    - users.total:', data.users.total);
            console.log('    - users.byRole:', !!data.users.byRole);
          }

          if (data.interviews) {
            console.log('    - interviews.active:', data.interviews.active);
            console.log(
              '    - interviews.byStatus:',
              !!data.interviews.byStatus
            );
          }

          if (data.points) {
            console.log('    - points.totalIssued:', data.points.totalIssued);
            console.log(
              '    - points.averagePerUser:',
              data.points.averagePerUser
            );
          }
        }

        console.log('\n🔧 Тестируем функции адаптации данных...');

        // Симулируем функции адаптации
        if (apiResponse.data.data) {
          testAdaptationFunctions(apiResponse.data.data);
        }
      } else {
        console.log('❌ API вернул неверный формат данных');
      }
    } else if (
      apiResponse.statusCode === 401 ||
      apiResponse.statusCode === 403
    ) {
      console.log('🔒 API требует аутентификации (ожидаемо для тестирования)');
      console.log('📝 Структура ошибки:', apiResponse.data);
    } else {
      console.log('❌ API вернул ошибку:', apiResponse.statusCode);
      console.log('📝 Ответ:', apiResponse.data);
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error.message);
  }
}

function testAdaptationFunctions(apiData) {
  console.log('🔄 Тестируем adaptApiDataToSummary...');

  try {
    const summary = adaptApiDataToSummary(apiData);
    console.log('✅ adaptApiDataToSummary работает корректно');
    console.log('📊 Структура summary:');
    console.log('  - users.total:', summary.users.total);
    console.log('  - users.admins:', summary.users.admins);
    console.log('  - interviews.total:', summary.interviews.total);
    console.log('  - points.totalIssued:', summary.points.totalIssued);
  } catch (error) {
    console.error('❌ Ошибка в adaptApiDataToSummary:', error.message);
  }

  console.log('\n🔄 Тестируем adaptApiDataToStatistics...');

  try {
    const statistics = adaptApiDataToStatistics(apiData);
    console.log('✅ adaptApiDataToStatistics работает корректно');
    console.log('📈 Количество временных точек:', statistics.length);

    if (statistics.length > 0) {
      const firstPoint = statistics[0];
      console.log('📅 Первая временная точка:');
      console.log('  - date:', firstPoint.date);
      console.log('  - completedInterviews:', firstPoint.completedInterviews);
      console.log('  - totalUsers:', firstPoint.totalUsers);
      console.log('  - pointsIssued:', firstPoint.pointsIssued);
    }
  } catch (error) {
    console.error('❌ Ошибка в adaptApiDataToStatistics:', error.message);
  }
}

// Копируем функции адаптации для тестирования
function adaptApiDataToSummary(apiData) {
  if (!apiData || typeof apiData !== 'object') {
    throw new Error('adaptApiDataToSummary: Неверные входные данные');
  }

  const {
    users = {},
    interviews = {},
    points = {},
    adminActivity = {},
  } = apiData;

  const usersByRole = users.byRole || {};
  const admins = (usersByRole.admin || 0) + (usersByRole.superadmin || 0);
  const regular = usersByRole.user || 0;

  const interviewsByStatus = interviews.byStatus || {};
  const totalInterviews = Object.values(interviewsByStatus).reduce(
    (sum, count) => sum + (typeof count === 'number' ? count : 0),
    0
  );

  const safeNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  return {
    users: {
      total: safeNumber(users.total),
      admins: safeNumber(admins),
      regular: safeNumber(regular),
      blocked: safeNumber(users.blocked),
    },
    interviews: {
      total: safeNumber(totalInterviews),
      completed: safeNumber(interviewsByStatus.completed),
      pending: safeNumber(interviewsByStatus.pending),
      booked: safeNumber(interviewsByStatus.confirmed),
      cancelled: safeNumber(interviewsByStatus.cancelled),
      noShow: safeNumber(interviewsByStatus.no_show),
    },
    points: {
      totalIssued: safeNumber(points.totalIssued),
      totalSpent: 0,
      averagePerUser: safeNumber(points.averagePerUser),
    },
    feedback: {
      count: 0,
      averageTechnicalScore: 0,
      averageInterviewerRating: 0,
    },
    violations: {
      count: 0,
    },
  };
}

function adaptApiDataToStatistics(apiData) {
  if (!apiData || typeof apiData !== 'object') {
    throw new Error('adaptApiDataToStatistics: Неверные входные данные');
  }

  const { users = {}, interviews = {}, points = {} } = apiData;

  const safeNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : Math.max(0, num);
  };

  const timeSeriesData = [];
  const today = new Date();

  const interviewsByStatus = interviews.byStatus || {};
  const totalUsers = safeNumber(users.total);
  const newUsersLast30Days = safeNumber(users.newLast30Days);
  const totalPointsIssued = safeNumber(points.totalIssued);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayFactor = (7 - i) / 7;

    const completedCount = safeNumber(interviewsByStatus.completed);
    const pendingCount = safeNumber(interviewsByStatus.pending);
    const confirmedCount = safeNumber(interviewsByStatus.confirmed);
    const cancelledCount = safeNumber(interviewsByStatus.cancelled);
    const noShowCount = safeNumber(interviewsByStatus.no_show);

    timeSeriesData.push({
      date: date.toISOString(),
      completedInterviews: Math.max(
        0,
        Math.round((completedCount * dayFactor) / 7)
      ),
      pendingInterviews: Math.max(
        0,
        Math.round((pendingCount * dayFactor) / 7)
      ),
      bookedInterviews: Math.max(
        0,
        Math.round((confirmedCount * dayFactor) / 7)
      ),
      cancelledInterviews: Math.max(
        0,
        Math.round((cancelledCount * dayFactor) / 7)
      ),
      noShowInterviews: Math.max(0, Math.round((noShowCount * dayFactor) / 7)),
      totalUsers: Math.max(0, Math.round(totalUsers * dayFactor)),
      newUsers: Math.max(0, Math.round((newUsersLast30Days * dayFactor) / 30)),
      activeUsers: Math.max(0, Math.round(totalUsers * dayFactor * 0.3)),
      pointsIssued: Math.max(
        0,
        Math.round((totalPointsIssued * dayFactor) / 7)
      ),
      pointsSpent: Math.max(
        0,
        Math.round((totalPointsIssued * dayFactor) / 10)
      ),
      averageTechnicalScore: Math.max(
        0,
        Math.min(5, 3.5 + (Math.sin(i) + 1) * 0.75)
      ),
      averageInterviewerRating: Math.max(
        0,
        Math.min(5, 4.0 + (Math.cos(i) + 1) * 0.5)
      ),
    });
  }

  return timeSeriesData;
}

// Запускаем тест
console.log('🚀 Запуск тестирования исправлений статистики...\n');
testStatisticsAPI()
  .then(() => {
    console.log('\n✅ Тестирование завершено');
  })
  .catch((error) => {
    console.error('\n❌ Ошибка при тестировании:', error);
  });
