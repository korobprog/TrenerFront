const { google } = require('googleapis');
const prisma = require('../../prisma/client');

// Добавляем логи для отладки проблемы с импортом prisma
console.log('tokenRefresher: Импортированный prisma:', prisma);
console.log('tokenRefresher: Тип prisma:', typeof prisma);
console.log(
  'tokenRefresher: prisma.account:',
  prisma ? prisma.account : 'prisma is undefined'
);

/**
 * Получает токены Google из базы данных для указанного пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object|null>} - Объект с токенами или null, если токены не найдены
 */
async function getGoogleTokensFromDB(userId) {
  try {
    console.log(
      'tokenRefresher: Вызов getGoogleTokensFromDB для userId:',
      userId
    );
    console.log('tokenRefresher: prisma доступен:', !!prisma);
    console.log(
      'tokenRefresher: prisma.account доступен:',
      prisma && !!prisma.account
    );

    // Проверка типа входного параметра userId
    if (typeof userId !== 'string') {
      console.error(
        'Ошибка: userId должен быть строкой, получено:',
        typeof userId
      );
      throw new Error(
        `Неверный тип userId: ${typeof userId}. Ожидается строка.`
      );
    }

    // Проверка, не является ли userId email-адресом
    if (userId.includes('@')) {
      console.warn(
        'Предупреждение: userId похож на email. Это может вызвать проблемы при поиске аккаунта.'
      );
      console.warn('Рекомендуется использовать ID пользователя вместо email.');
    }

    // Ищем аккаунт Google для указанного пользователя
    console.log('Детальная информация о поиске аккаунта:');
    console.log('- Ищем по userId:', userId);
    console.log('- Тип userId:', typeof userId);
    console.log('- Длина userId:', userId.length);

    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: 'google',
      },
    });

    // После выполнения запроса
    console.log(
      'Результат запроса:',
      account ? 'Аккаунт найден' : 'Аккаунт не найден'
    );
    if (account) {
      console.log('- ID аккаунта:', account.id);
      console.log('- Provider:', account.provider);
      console.log('- Наличие refresh_token:', !!account.refresh_token);
      console.log('- Наличие access_token:', !!account.access_token);
      console.log('- expires_at:', account.expires_at);
    }

    // Детальная информация о токенах из базы данных
    console.log('Детальная информация о токенах из базы данных:');
    console.log('- userId:', userId);
    console.log('- Найден аккаунт:', !!account);
    if (account) {
      console.log(
        '- refresh_token:',
        account.refresh_token
          ? `${account.refresh_token.substring(0, 10)}...`
          : 'Отсутствует'
      );
      console.log(
        '- access_token:',
        account.access_token
          ? `${account.access_token.substring(0, 10)}...`
          : 'Отсутствует'
      );
      console.log(
        '- expires_at:',
        account.expires_at
          ? new Date(account.expires_at * 1000).toISOString()
          : 'Не задано'
      );
    }

    if (!account || !account.refresh_token) {
      console.log(`Токены Google не найдены для пользователя ${userId}`);
      return null;
    }

    return {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at ? account.expires_at * 1000 : null, // Конвертируем в миллисекунды
    };
  } catch (error) {
    console.error('Ошибка при получении токенов из базы данных:', error);
    throw error;
  }
}

/**
 * Обновляет токены Google в базе данных
 * @param {string} userId - ID пользователя
 * @param {string} accessToken - Новый access token
 * @param {number} expiresAt - Время истечения токена в секундах от эпохи
 * @returns {Promise<Object>} - Обновленный объект аккаунта
 */
async function updateGoogleTokensInDB(userId, accessToken, expiresAt) {
  try {
    // Обновляем токены в базе данных
    const updatedAccount = await prisma.account.updateMany({
      where: {
        userId: userId,
        provider: 'google',
      },
      data: {
        access_token: accessToken,
        expires_at: Math.floor(expiresAt / 1000), // Конвертируем в секунды для хранения в БД
      },
    });

    console.log(
      `Токены успешно обновлены в базе данных для пользователя ${userId}`
    );
    return updatedAccount;
  } catch (error) {
    console.error('Ошибка при обновлении токенов в базе данных:', error);
    throw error;
  }
}

/**
 * Проверяет и при необходимости обновляет токен
 * @param {Object} options - Параметры
 * @param {string} options.userId - ID пользователя
 * @param {number} options.expiryThreshold - Порог в секундах, при котором токен считается "скоро истекающим"
 * @returns {Promise<Object>} - Объект с токенами
 */
async function refreshTokenIfNeeded(options = { expiryThreshold: 300 }) {
  console.log('tokenRefresher: Вызов refreshTokenIfNeeded с опциями:', options);

  // Проверяем, передан ли userId
  if (!options.userId) {
    // Для обратной совместимости используем токены из переменных окружения
    console.warn(
      'tokenRefresher: userId не указан, используем токены из переменных окружения (устаревший метод)'
    );

    const currentTime = Date.now();
    const expiryDate = parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0', 10);
    const thresholdTime = currentTime + options.expiryThreshold * 1000;

    console.log(
      'tokenRefresher: Текущее время:',
      new Date(currentTime).toISOString()
    );
    console.log(
      'tokenRefresher: Время истечения токена:',
      expiryDate ? new Date(expiryDate).toISOString() : 'не задано'
    );
    console.log(
      'tokenRefresher: Пороговое время:',
      new Date(thresholdTime).toISOString()
    );
    console.log(
      'tokenRefresher: Токен доступа существует:',
      !!process.env.GOOGLE_ACCESS_TOKEN
    );

    // Если токен отсутствует или скоро истечет, возвращаем ошибку
    if (
      !process.env.GOOGLE_ACCESS_TOKEN ||
      !expiryDate ||
      expiryDate < thresholdTime
    ) {
      console.error(
        'tokenRefresher: Токены в переменных окружения отсутствуют или истекли'
      );
      throw new Error(
        'Токены в переменных окружения отсутствуют или истекли. Необходимо использовать токены из базы данных.'
      );
    }

    console.log('tokenRefresher: Возвращаем токены из переменных окружения');
    // Возвращаем токены из переменных окружения
    return {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      expiry_date: expiryDate,
    };
  }

  console.log(
    'tokenRefresher: Получение токенов из базы данных для пользователя',
    options.userId
  );
  // Получаем токены из базы данных
  const tokens = await getGoogleTokensFromDB(options.userId);
  console.log('tokenRefresher: Токены получены из БД:', tokens ? 'Да' : 'Нет');

  if (!tokens) {
    console.error(
      'tokenRefresher: Токены Google не найдены для пользователя',
      options.userId
    );
    throw new Error(
      `Токены Google не найдены для пользователя ${options.userId}`
    );
  }

  const currentTime = Date.now();

  // Убедимся, что expires_at - это число и преобразуем его в миллисекунды, если оно не равно 0
  let expiryDate = 0;
  if (tokens.expires_at) {
    // Проверяем, что expires_at - это число
    if (typeof tokens.expires_at === 'number') {
      expiryDate = tokens.expires_at;
    } else {
      console.warn(
        'tokenRefresher: expires_at не является числом:',
        tokens.expires_at
      );
      // Пытаемся преобразовать в число
      try {
        expiryDate = Number(tokens.expires_at);
        if (isNaN(expiryDate)) {
          console.error(
            'tokenRefresher: Не удалось преобразовать expires_at в число'
          );
          expiryDate = 0;
        }
      } catch (e) {
        console.error(
          'tokenRefresher: Ошибка при преобразовании expires_at:',
          e
        );
        expiryDate = 0;
      }
    }
  }

  // Убедимся, что expiryThreshold - это число
  let expiryThreshold = 300; // значение по умолчанию
  if (options.expiryThreshold !== undefined) {
    if (typeof options.expiryThreshold === 'number') {
      expiryThreshold = options.expiryThreshold;
    } else {
      console.warn(
        'tokenRefresher: expiryThreshold не является числом:',
        options.expiryThreshold
      );
      try {
        expiryThreshold = Number(options.expiryThreshold);
        if (isNaN(expiryThreshold)) {
          console.error(
            'tokenRefresher: Не удалось преобразовать expiryThreshold в число, используем значение по умолчанию'
          );
          expiryThreshold = 300;
        }
      } catch (e) {
        console.error(
          'tokenRefresher: Ошибка при преобразовании expiryThreshold:',
          e
        );
        expiryThreshold = 300;
      }
    }
  }

  const thresholdTime = currentTime + expiryThreshold * 1000;

  console.log(
    'tokenRefresher: Текущее время:',
    new Date(currentTime).toISOString(),
    '(миллисекунды:',
    currentTime,
    ')'
  );
  console.log(
    'tokenRefresher: Время истечения токена:',
    expiryDate ? new Date(expiryDate).toISOString() : 'не задано',
    '(миллисекунды:',
    expiryDate,
    ')'
  );
  console.log(
    'tokenRefresher: Пороговое время:',
    new Date(thresholdTime).toISOString(),
    '(миллисекунды:',
    thresholdTime,
    ')'
  );
  console.log(
    'tokenRefresher: Токен доступа существует:',
    !!tokens.access_token
  );
  console.log(
    'tokenRefresher: Токен обновления существует:',
    !!tokens.refresh_token
  );

  // Проверяем, истекает ли токен в ближайшее время
  let tokenNeedsRefresh = false;

  if (!tokens.access_token) {
    console.log(
      'tokenRefresher: Токен доступа отсутствует, требуется обновление'
    );
    tokenNeedsRefresh = true;
  } else if (!expiryDate) {
    console.log(
      'tokenRefresher: Время истечения токена не задано, требуется обновление'
    );
    tokenNeedsRefresh = true;
  } else {
    try {
      // Проверяем, что оба значения являются числами и больше 0
      if (typeof expiryDate !== 'number' || typeof thresholdTime !== 'number') {
        console.error(
          'tokenRefresher: Некорректные типы данных для сравнения:',
          `expiryDate (${typeof expiryDate}): ${expiryDate}`,
          `thresholdTime (${typeof thresholdTime}): ${thresholdTime}`
        );
        tokenNeedsRefresh = true;
      } else if (expiryDate <= 0) {
        console.error(
          'tokenRefresher: Некорректное значение expiryDate:',
          expiryDate
        );
        tokenNeedsRefresh = true;
      } else if (thresholdTime <= 0) {
        console.error(
          'tokenRefresher: Некорректное значение thresholdTime:',
          thresholdTime
        );
        tokenNeedsRefresh = true;
      } else if (expiryDate < thresholdTime) {
        console.log(
          'tokenRefresher: Токен скоро истечет, требуется обновление',
          `(expiryDate: ${expiryDate}, thresholdTime: ${thresholdTime})`
        );
        tokenNeedsRefresh = true;
      } else {
        console.log(
          'tokenRefresher: Токен действителен, обновление не требуется',
          `(expiryDate: ${expiryDate}, thresholdTime: ${thresholdTime})`
        );
        console.log(
          'tokenRefresher: Время истечения:',
          new Date(expiryDate).toISOString()
        );
        console.log(
          'tokenRefresher: Пороговое время:',
          new Date(thresholdTime).toISOString()
        );
      }
    } catch (error) {
      console.error(
        'tokenRefresher: Ошибка при сравнении времени истечения токена:',
        error.message,
        `expiryDate: ${expiryDate}, thresholdTime: ${thresholdTime}`
      );
      console.log(
        'tokenRefresher: Принудительное обновление токена из-за ошибки сравнения времени'
      );
      tokenNeedsRefresh = true;
    }
  }

  if (tokenNeedsRefresh) {
    console.log(
      `tokenRefresher: Токен требует обновления для пользователя ${options.userId}, обновляем...`
    );

    // Перед обновлением токена
    console.log('Детальная информация перед обновлением токена:');
    console.log('- userId:', options.userId);
    console.log(
      '- refresh_token:',
      tokens.refresh_token
        ? tokens.refresh_token.substring(0, 10) + '...'
        : 'отсутствует'
    );

    // Проверяем наличие refresh токена
    if (!tokens.refresh_token) {
      console.error(
        `tokenRefresher: Отсутствует refresh_token для пользователя ${options.userId}`
      );
      throw new Error(
        `Отсутствует refresh_token для пользователя ${options.userId}. Невозможно обновить токен.`
      );
    }

    console.log('tokenRefresher: Создание OAuth2 клиента');
    console.log(
      'tokenRefresher: GOOGLE_CLIENT_ID существует:',
      !!process.env.GOOGLE_CLIENT_ID
    );
    console.log(
      'tokenRefresher: GOOGLE_CLIENT_SECRET существует:',
      !!process.env.GOOGLE_CLIENT_SECRET
    );
    console.log(
      'tokenRefresher: GOOGLE_REDIRECT_URI существует:',
      !!process.env.GOOGLE_REDIRECT_URI
    );
    console.log(
      'tokenRefresher: GOOGLE_REDIRECT_URI значение:',
      process.env.GOOGLE_REDIRECT_URI
    );

    // Проверка валидности URL
    console.log('tokenRefresher: process.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('tokenRefresher: NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    try {
      if (process.env.GOOGLE_REDIRECT_URI) {
        console.log(
          'tokenRefresher: GOOGLE_REDIRECT_URI перед проверкой:',
          process.env.GOOGLE_REDIRECT_URI
        );
        new URL(process.env.GOOGLE_REDIRECT_URI);
        console.log(
          'tokenRefresher: GOOGLE_REDIRECT_URI является валидным URL'
        );
      } else {
        console.error(
          'tokenRefresher: GOOGLE_REDIRECT_URI не определен или пустой'
        );
      }
    } catch (error) {
      console.error(
        'tokenRefresher: GOOGLE_REDIRECT_URI не является валидным URL:',
        error.message
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем refresh_token для получения нового access_token
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });
    console.log(
      'tokenRefresher: Учетные данные установлены для OAuth2 клиента'
    );

    try {
      console.log(
        'tokenRefresher: Запрос нового токена через refreshAccessToken'
      );
      // Запрашиваем новый токен
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('tokenRefresher: Новый токен получен успешно');
      console.log(
        'tokenRefresher: Время жизни нового токена (секунды):',
        credentials.expires_in
      );

      // Вычисляем время истечения
      const newExpiryTime = Date.now() + credentials.expires_in * 1000;
      console.log(
        'tokenRefresher: Новое время истечения:',
        new Date(newExpiryTime).toISOString()
      );

      // Обновляем токены в базе данных
      console.log('tokenRefresher: Обновление токенов в базе данных');
      await updateGoogleTokensInDB(
        options.userId,
        credentials.access_token,
        newExpiryTime
      );
      console.log('tokenRefresher: Токены успешно обновлены в базе данных');

      return {
        access_token: credentials.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: newExpiryTime, // Используем expires_at вместо expiry_date для согласованности
      };
    } catch (error) {
      console.error(
        `tokenRefresher: Ошибка при обновлении токена для пользователя ${options.userId}:`,
        error.message
      );
      console.error('tokenRefresher: Стек ошибки:', error.stack);

      // Детальная информация об ошибке обновления токена
      console.log('Детальная информация об ошибке обновления токена:');
      console.log('- Тип ошибки:', error.name);
      console.log('- Сообщение:', error.message);
      console.log(
        '- Полный ответ от Google:',
        error.response ? JSON.stringify(error.response.data) : 'нет данных'
      );

      // Получаем текущее время для отслеживания частоты ошибок
      const currentErrorTime = Date.now();

      // Создаем или обновляем глобальный объект для отслеживания ошибок по пользователям
      if (!global._tokenRefreshErrors) {
        global._tokenRefreshErrors = {};
      }

      // Получаем или инициализируем данные об ошибках для текущего пользователя
      if (!global._tokenRefreshErrors[options.userId]) {
        global._tokenRefreshErrors[options.userId] = {
          lastErrorTime: 0,
          errorCount: 0,
          backoffTime: 5000, // Начальное время задержки (5 секунд)
        };
      }

      const userErrors = global._tokenRefreshErrors[options.userId];

      // Увеличиваем счетчик ошибок
      userErrors.errorCount++;

      // Проверяем, не слишком ли часто происходят ошибки
      const timeSinceLastError = currentErrorTime - userErrors.lastErrorTime;
      userErrors.lastErrorTime = currentErrorTime;

      // Если ошибки происходят слишком часто, увеличиваем время задержки
      if (timeSinceLastError < 60000) {
        // Меньше минуты между ошибками
        userErrors.backoffTime = Math.min(userErrors.backoffTime * 2, 3600000); // Максимум 1 час
        console.log(
          `tokenRefresher: Увеличено время задержки до ${userErrors.backoffTime}ms для пользователя ${options.userId}`
        );
      }

      // Если количество ошибок превышает порог, возвращаем текущие токены вместо выбрасывания исключения
      if (
        userErrors.errorCount > 3 &&
        timeSinceLastError < userErrors.backoffTime
      ) {
        console.warn(
          `tokenRefresher: Предотвращена циклическая перезагрузка для пользователя ${options.userId}. ` +
            `Слишком много ошибок (${userErrors.errorCount}) за короткий промежуток времени.`
        );

        // Если у нас есть действующий access_token, возвращаем его несмотря на ошибку
        if (tokens.access_token) {
          console.log(
            `tokenRefresher: Возвращаем существующий access_token, несмотря на ошибку обновления`
          );
          return tokens;
        }
      }

      // Расширенная диагностика ошибок Google OAuth
      if (error.message.includes('invalid_grant')) {
        console.error(
          'tokenRefresher: КРИТИЧЕСКАЯ ОШИБКА - Недействительный токен обновления (invalid_grant)'
        );
        console.error(
          'tokenRefresher: Refresh token был отозван или истек. Требуется полная повторная авторизация.'
        );
        console.error('tokenRefresher: Проверка refresh_token в базе данных:');
        console.error(
          '- Длина refresh_token:',
          tokens.refresh_token ? tokens.refresh_token.length : 0
        );
        console.error(
          '- Первые 10 символов:',
          tokens.refresh_token
            ? tokens.refresh_token.substring(0, 10) + '...'
            : 'отсутствует'
        );
      } else if (error.message.includes('invalid_client')) {
        console.error(
          'tokenRefresher: КРИТИЧЕСКАЯ ОШИБКА - Недействительный клиент (invalid_client)'
        );
        console.error(
          'tokenRefresher: Проверьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET в настройках приложения.'
        );
      } else if (error.message.includes('unauthorized_client')) {
        console.error(
          'tokenRefresher: КРИТИЧЕСКАЯ ОШИБКА - Неавторизованный клиент (unauthorized_client)'
        );
        console.error(
          'tokenRefresher: Проверьте настройки проекта в Google Cloud Console.'
        );
      } else if (
        error.message.includes('network') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT'
      ) {
        console.error(
          'tokenRefresher: ОШИБКА СЕТИ - Проблема с подключением к серверам Google'
        );
        console.error(
          'tokenRefresher: Возможно временная проблема с сетью или серверами Google недоступны'
        );

        // При сетевых ошибках возвращаем текущие токены, если они есть
        if (tokens.access_token) {
          console.log(
            `tokenRefresher: Возвращаем существующий access_token из-за сетевой ошибки`
          );
          return tokens;
        }
      }

      console.error('tokenRefresher: Детали ошибки:', {
        name: error.name,
        code: error.code,
        status: error.status,
        response: error.response
          ? JSON.stringify(error.response.data)
          : 'нет данных',
      });

      // Специальная обработка для случая истекшего или отозванного токена
      if (
        error.message.includes('invalid_grant') ||
        error.message.includes('Token has been expired or revoked')
      ) {
        const reAuthError = new Error(
          'Токен Google был отозван или истек. Необходимо повторно авторизоваться в Google. ' +
            'Пожалуйста, выйдите из системы и войдите снова, используя свою учетную запись Google.'
        );
        reAuthError.code = 'GOOGLE_AUTH_REQUIRED';
        reAuthError.originalError = error;
        throw reAuthError;
      }

      // Если это сетевая ошибка и у нас нет действующего токена, выбрасываем исключение
      // с более информативным сообщением
      if (
        (error.message.includes('network') ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT') &&
        !tokens.access_token
      ) {
        const networkError = new Error(
          'Не удалось обновить токен из-за проблем с сетью. Пожалуйста, проверьте подключение к интернету и повторите попытку позже.'
        );
        networkError.code = 'NETWORK_ERROR';
        networkError.originalError = error;
        throw networkError;
      }

      throw error;
    }
  }

  console.log(
    'tokenRefresher: Токен еще действителен, возвращаем текущие значения'
  );
  // Если токен еще действителен, возвращаем текущие значения
  return tokens;
}

/**
 * Получает настроенный OAuth2 клиент с актуальными токенами
 * @param {string} userId - ID пользователя (опционально, для обратной совместимости)
 * @returns {Promise<OAuth2Client>} - Настроенный OAuth2 клиент
 */
async function getAuthenticatedOAuth2Client(userId) {
  console.log(
    `DEBUG: Вызов getAuthenticatedOAuth2Client для userId: ${userId}`
  );
  try {
    // Обновляем токен при необходимости
    console.log(`DEBUG: Вызов refreshTokenIfNeeded для userId: ${userId}`);
    const tokens = await refreshTokenIfNeeded({ userId });
    console.log(`DEBUG: Получены токены:`, {
      access_token: tokens.access_token ? 'Присутствует' : 'Отсутствует',
      refresh_token: tokens.refresh_token ? 'Присутствует' : 'Отсутствует',
      expires_at: tokens.expires_at,
    });

    // Создаем OAuth2 клиент
    console.log(`DEBUG: Создание OAuth2 клиента`);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Устанавливаем токены
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at, // Используем expires_at из токенов, но expiry_date для OAuth2 клиента
    });
    console.log(`DEBUG: Токены установлены для OAuth2 клиента`);

    return oauth2Client;
  } catch (error) {
    console.error('Ошибка при получении OAuth2 клиента:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      response: error.response
        ? JSON.stringify(error.response.data)
        : 'нет данных',
    });

    // Проверяем, является ли ошибка связанной с истекшим токеном
    if (
      error.message.includes('invalid_grant') ||
      error.message.includes('Token has been expired or revoked') ||
      error.code === 'GOOGLE_AUTH_REQUIRED'
    ) {
      const reAuthError = new Error(
        'Токен Google был отозван или истек. Необходимо повторно авторизоваться в Google. ' +
          'Пожалуйста, выйдите из системы и войдите снова, используя свою учетную запись Google.'
      );
      reAuthError.code = 'GOOGLE_AUTH_REQUIRED';
      reAuthError.originalError = error;
      throw reAuthError;
    }

    throw error;
  }
}

// Экспорт для CommonJS
module.exports = {
  refreshTokenIfNeeded,
  getAuthenticatedOAuth2Client,
  getGoogleTokensFromDB,
  updateGoogleTokensInDB,
};
