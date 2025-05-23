// Скрипт для назначения пользователя администратором, выполняемый непосредственно на сервере
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');

// Преобразуем exec в Promise
const execPromise = util.promisify(exec);

// Создаем интерфейс для чтения ввода пользователя
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Функция для выполнения команды
 * @param {string} command Команда для выполнения
 * @returns {Promise<string>} Результат выполнения команды
 */
async function executeCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      console.log('Предупреждение:', stderr);
    }
    return stdout;
  } catch (error) {
    throw new Error(`Ошибка выполнения команды: ${error.message}`);
  }
}

/**
 * Функция для проверки Docker-контейнеров
 * @returns {Promise<{postgresContainer: string}>} Информация о контейнерах
 */
async function checkDockerContainers() {
  try {
    console.log('Проверка Docker-контейнеров...');

    // Проверяем запущенные контейнеры
    const dockerPsCommand = 'docker ps';
    const dockerPs = await executeCommand(dockerPsCommand);
    console.log('Запущенные Docker-контейнеры:');
    console.log(dockerPs);

    // Ищем контейнер с PostgreSQL
    const postgresContainerRegex = /\b(trenerfront_postgres|postgres)\b/;
    const postgresMatch = dockerPs.match(postgresContainerRegex);
    const postgresContainer = postgresMatch ? postgresMatch[0] : null;

    if (!postgresContainer) {
      console.log(
        'Контейнер PostgreSQL не найден. Проверяем все контейнеры...'
      );
      const dockerPsAllCommand = 'docker ps -a';
      const dockerPsAll = await executeCommand(dockerPsAllCommand);
      console.log('Все Docker-контейнеры:');
      console.log(dockerPsAll);

      const postgresAllMatch = dockerPsAll.match(postgresContainerRegex);
      const postgresAllContainer = postgresAllMatch
        ? postgresAllMatch[0]
        : null;

      if (postgresAllContainer) {
        console.log(
          `Найден остановленный контейнер PostgreSQL: ${postgresAllContainer}`
        );

        // Пытаемся запустить остановленный контейнер
        try {
          console.log(
            `Пытаемся запустить контейнер ${postgresAllContainer}...`
          );
          await executeCommand(`docker start ${postgresAllContainer}`);
          console.log(`Контейнер ${postgresAllContainer} успешно запущен`);
          return { postgresContainer: postgresAllContainer };
        } catch (startError) {
          console.error(
            `Не удалось запустить контейнер: ${startError.message}`
          );
        }
      } else {
        console.log('Контейнер PostgreSQL не найден среди всех контейнеров');
      }

      return { postgresContainer: 'trenerfront_postgres' };
    } else {
      console.log(
        `Найден запущенный контейнер PostgreSQL: ${postgresContainer}`
      );
      return { postgresContainer };
    }
  } catch (error) {
    console.error('Ошибка при проверке Docker-контейнеров:', error.message);
    return { postgresContainer: 'trenerfront_postgres' };
  }
}

/**
 * Функция для проверки структуры базы данных в Docker-контейнере
 * @param {string} postgresContainer Имя контейнера PostgreSQL
 * @returns {Promise<void>}
 */
async function checkDatabaseStructure(postgresContainer) {
  try {
    console.log('Проверка структуры базы данных в Docker-контейнере...');

    // Проверяем список баз данных
    const listDbCommand = `docker exec ${postgresContainer} psql -U postgres -c "\\l"`;
    try {
      const dbList = await executeCommand(listDbCommand);
      console.log('Список баз данных:');
      console.log(dbList);
    } catch (error) {
      console.log('Ошибка при получении списка баз данных:', error.message);
    }

    // Проверяем таблицы в базе данных (предполагаем, что база данных называется 'postgres')
    const listTablesCommand = `docker exec ${postgresContainer} psql -U postgres -c "\\dt"`;
    try {
      const tablesList = await executeCommand(listTablesCommand);
      console.log('Список таблиц:');
      console.log(tablesList);
    } catch (error) {
      console.log('Ошибка при получении списка таблиц:', error.message);
    }

    // Проверяем наличие таблицы User
    const checkUserTableCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT * FROM \\\"User\\\" LIMIT 5;"`;
    try {
      const userTable = await executeCommand(checkUserTableCommand);
      console.log('Данные из таблицы User:');
      console.log(userTable);
    } catch (error) {
      console.log(
        'Ошибка при получении данных из таблицы User:',
        error.message
      );

      // Пробуем найти правильное имя таблицы
      const findUserTableCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%user%';"`;
      try {
        const userTableName = await executeCommand(findUserTableCommand);
        console.log('Найденные таблицы, содержащие "user" в имени:');
        console.log(userTableName);
      } catch (innerError) {
        console.log('Ошибка при поиске таблицы User:', innerError.message);
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке структуры базы данных:', error.message);
  }
}

/**
 * Функция для проверки существования пользователя в базе данных
 * @param {string} email Email пользователя
 * @param {string} postgresContainer Имя контейнера PostgreSQL
 * @returns {Promise<boolean>} Существует ли пользователь
 */
async function checkUserExists(email, postgresContainer) {
  try {
    console.log(`Проверка существования пользователя с email ${email}...`);

    // Используем прямой SQL-запрос к PostgreSQL
    const sqlCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT * FROM \\\"User\\\" WHERE email = '${email}';"`;

    try {
      const sqlOutput = await executeCommand(sqlCommand);
      console.log('Результат SQL-запроса:');
      console.log(sqlOutput);

      return sqlOutput.includes(email) && !sqlOutput.includes('0 rows');
    } catch (sqlError) {
      console.error('Ошибка при выполнении SQL-запроса:', sqlError.message);

      // Пробуем поискать по частичному совпадению
      const partialEmailSearch = email.split('@')[0];
      const partialSqlCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT * FROM \\\"User\\\" WHERE email LIKE '%${partialEmailSearch}%';"`;

      try {
        const partialSqlOutput = await executeCommand(partialSqlCommand);
        console.log('Результат поиска по частичному совпадению:');
        console.log(partialSqlOutput);

        if (!partialSqlOutput.includes('0 rows')) {
          console.log('Найдены похожие пользователи');
        }

        return false;
      } catch (partialSqlError) {
        console.error(
          'Ошибка при поиске по частичному совпадению:',
          partialSqlError.message
        );
        return false;
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error.message);
    return false;
  }
}

/**
 * Функция для проверки, является ли пользователь уже администратором
 * @param {string} email Email пользователя
 * @param {string} postgresContainer Имя контейнера PostgreSQL
 * @returns {Promise<boolean>} Является ли пользователь администратором
 */
async function isUserAdmin(email, postgresContainer) {
  try {
    console.log(
      `Проверка, является ли пользователь ${email} администратором...`
    );

    // Используем прямой SQL-запрос к PostgreSQL
    const sqlCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT * FROM \\\"User\\\" WHERE email = '${email}';"`;

    try {
      const sqlOutput = await executeCommand(sqlCommand);
      console.log('Результат SQL-запроса:');
      console.log(sqlOutput);

      return sqlOutput.includes('admin');
    } catch (sqlError) {
      console.error('Ошибка при выполнении SQL-запроса:', sqlError.message);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при проверке роли пользователя:', error.message);
    return false;
  }
}

/**
 * Функция для назначения пользователя администратором
 * @param {string} email Email пользователя
 * @param {string} postgresContainer Имя контейнера PostgreSQL
 * @returns {Promise<boolean>} Успешно ли выполнена операция
 */
async function makeUserAdmin(email, postgresContainer) {
  try {
    console.log(`Назначение пользователя ${email} администратором...`);

    // Используем прямой SQL-запрос к PostgreSQL
    const sqlCommand = `docker exec ${postgresContainer} psql -U postgres -c "UPDATE \\\"User\\\" SET role = 'admin' WHERE email = '${email}';"`;

    try {
      const sqlOutput = await executeCommand(sqlCommand);
      console.log('Результат SQL-запроса:');
      console.log(sqlOutput);

      // Проверяем, что роль успешно обновлена
      const isAdmin = await isUserAdmin(email, postgresContainer);
      return isAdmin;
    } catch (sqlError) {
      console.error('Ошибка при выполнении SQL-запроса:', sqlError.message);
      return false;
    }
  } catch (error) {
    console.error(
      'Ошибка при назначении пользователя администратором:',
      error.message
    );
    return false;
  }
}

/**
 * Функция для создания записи в логе административных действий
 * @param {string} email Email пользователя
 * @param {string} postgresContainer Имя контейнера PostgreSQL
 * @returns {Promise<boolean>} Успешно ли выполнена операция
 */
async function createAdminActionLog(email, postgresContainer) {
  try {
    console.log(`Создание записи в логе для пользователя ${email}...`);

    // Получаем ID пользователя
    const getUserIdCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT id FROM \\\"User\\\" WHERE email = '${email}';"`;

    try {
      const userIdOutput = await executeCommand(getUserIdCommand);
      console.log('Результат запроса ID пользователя:');
      console.log(userIdOutput);

      // Извлекаем ID из вывода (предполагаем формат вывода psql)
      const userIdMatch = userIdOutput.match(/\|\s+([0-9a-f-]+)\s+\|/);
      if (!userIdMatch) {
        console.error('Не удалось получить ID пользователя');
        return false;
      }

      const userId = userIdMatch[1];
      console.log(`Получен ID пользователя: ${userId}`);

      // Проверяем существование таблицы AdminActionLog
      const checkTableCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AdminActionLog');"`;
      const tableCheckOutput = await executeCommand(checkTableCommand);

      if (!tableCheckOutput.includes('t')) {
        console.log(
          'Таблица AdminActionLog не существует, пропускаем создание записи в логе'
        );
        return false;
      }

      // Создаем запись в логе
      const timestamp = new Date().toISOString();
      const createLogCommand = `docker exec ${postgresContainer} psql -U postgres -c "INSERT INTO \\\"AdminActionLog\\\" (\\\"adminId\\\", action, \\\"entityType\\\", \\\"entityId\\\", details, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('${userId}', 'create_admin', 'user', '${userId}', '{\\\"message\\\": \\\"Назначение пользователя администратором через серверный скрипт\\\"}', '${timestamp}', '${timestamp}');"`;

      const logOutput = await executeCommand(createLogCommand);
      console.log('Результат создания записи в логе:');
      console.log(logOutput);

      return logOutput.includes('INSERT');
    } catch (error) {
      console.error('Ошибка при работе с логом:', error.message);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при создании записи в логе:', error.message);
    return false;
  }
}

/**
 * Основная функция для назначения пользователя администратором
 * @param {string} email Email пользователя
 */
async function makeAdminUser(email) {
  try {
    // Проверяем Docker-контейнеры
    const { postgresContainer } = await checkDockerContainers();
    console.log(`Используем контейнер PostgreSQL: ${postgresContainer}`);

    // Проверяем структуру базы данных в Docker
    await checkDatabaseStructure(postgresContainer);

    // Проверяем существование пользователя
    const userExists = await checkUserExists(email, postgresContainer);
    if (!userExists) {
      console.error(`Пользователь с email ${email} не найден`);
      return false;
    }

    // Проверяем, не является ли пользователь уже администратором
    const isAdmin = await isUserAdmin(email, postgresContainer);
    if (isAdmin) {
      console.log(`Пользователь ${email} уже является администратором`);
      return true;
    }

    // Назначаем пользователя администратором
    const success = await makeUserAdmin(email, postgresContainer);
    if (!success) {
      console.error('Не удалось назначить пользователя администратором');
      return false;
    }

    console.log(`Пользователь ${email} успешно назначен администратором`);

    // Создаем запись в логе административных действий
    const logCreated = await createAdminActionLog(email, postgresContainer);
    if (logCreated) {
      console.log('Запись в логе административных действий создана');
    } else {
      console.warn(
        'Не удалось создать запись в логе административных действий'
      );
    }

    return true;
  } catch (error) {
    console.error('Ошибка при выполнении операции:', error.message);
    return false;
  }
}

// Основная функция скрипта
async function main() {
  try {
    // Запрашиваем email пользователя
    rl.question(
      'Введите email пользователя, которого нужно сделать администратором: ',
      async (email) => {
        if (!email || !email.trim()) {
          console.error('Email не может быть пустым');
          rl.close();
          return;
        }

        const success = await makeAdminUser(email.trim());
        rl.close();

        // Выходим с соответствующим кодом
        process.exit(success ? 0 : 1);
      }
    );
  } catch (error) {
    console.error('Ошибка при выполнении скрипта:', error);
    rl.close();
    process.exit(1);
  }
}

// Запускаем основную функцию
main();
