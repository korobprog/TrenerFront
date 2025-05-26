// Скрипт для назначения пользователя администратором через SSH
const { Client } = require('ssh2');
const readline = require('readline');

// Создаем интерфейс для чтения ввода пользователя
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Конфигурация SSH-подключения
const sshConfig = {
  host: '217.198.6.238', // IP-адрес сервера
  username: process.env.SSH_USERNAME || undefined, // Имя пользователя из переменной окружения или будет запрошено
  password: process.env.SSH_PASSWORD || undefined, // Пароль из переменной окружения или будет запрошено
  // privateKey: require('fs').readFileSync('/path/to/private/key'), // Раскомментировать, если используется ключ
};

/**
 * Функция для выполнения команды на удаленном сервере
 * @param {Client} conn SSH-соединение
 * @param {string} command Команда для выполнения
 * @returns {Promise<string>} Результат выполнения команды
 */
function executeCommand(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let output = '';
      let errorOutput = '';

      stream.on('data', (data) => {
        output += data.toString();
      });

      stream.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      stream.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Команда завершилась с кодом ${code}: ${errorOutput}`)
          );
        }
        resolve(output);
      });
    });
  });
}

/**
 * Функция для проверки Docker-контейнеров на сервере
 * @param {Client} conn SSH-соединение
 * @returns {Promise<{projectPath: string, postgresContainer: string}>} Информация о контейнерах
 */
async function checkDockerContainers(conn) {
  try {
    console.log('Проверка Docker-контейнеров на сервере...');

    // Проверяем запущенные контейнеры
    const dockerPsCommand = 'docker ps';
    const dockerPs = await executeCommand(conn, dockerPsCommand);
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
      const dockerPsAll = await executeCommand(conn, dockerPsAllCommand);
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
      } else {
        console.log('Контейнер PostgreSQL не найден среди всех контейнеров');
      }
    } else {
      console.log(
        `Найден запущенный контейнер PostgreSQL: ${postgresContainer}`
      );
    }

    // Проверяем директорию проекта
    const findProjectCommand =
      'find / -name "docker-compose.yml" -type f 2>/dev/null | grep -v node_modules';
    try {
      const projectFiles = await executeCommand(conn, findProjectCommand);
      console.log('Найденные файлы docker-compose.yml:');
      console.log(projectFiles);

      const projectPaths = projectFiles.trim().split('\n').filter(Boolean);
      let projectPath = '';

      if (projectPaths.length > 0) {
        // Берем директорию первого найденного docker-compose.yml
        projectPath = projectPaths[0].replace('/docker-compose.yml', '');
        console.log(`Предполагаемый путь к проекту: ${projectPath}`);
      } else {
        console.log(
          'Файл docker-compose.yml не найден, используем стандартный путь'
        );
        projectPath = '/var/www/supermock';
      }

      return {
        projectPath,
        postgresContainer: postgresContainer || 'trenerfront_postgres',
      };
    } catch (error) {
      console.log('Ошибка при поиске файла docker-compose.yml:', error.message);
      return {
        projectPath: '/var/www/supermock',
        postgresContainer: postgresContainer || 'trenerfront_postgres',
      };
    }
  } catch (error) {
    console.error('Ошибка при проверке Docker-контейнеров:', error.message);
    return {
      projectPath: '/var/www/supermock',
      postgresContainer: 'trenerfront_postgres',
    };
  }
}

/**
 * Функция для проверки структуры базы данных в Docker-контейнере
 * @param {Client} conn SSH-соединение
 * @param {string} postgresContainer Имя контейнера PostgreSQL
 * @returns {Promise<void>}
 */
async function checkDatabaseStructure(conn, postgresContainer) {
  try {
    console.log('Проверка структуры базы данных в Docker-контейнере...');

    // Проверяем список баз данных
    const listDbCommand = `docker exec ${postgresContainer} psql -U postgres -c "\\l"`;
    try {
      const dbList = await executeCommand(conn, listDbCommand);
      console.log('Список баз данных:');
      console.log(dbList);
    } catch (error) {
      console.log('Ошибка при получении списка баз данных:', error.message);
    }

    // Проверяем таблицы в базе данных (предполагаем, что база данных называется 'postgres')
    const listTablesCommand = `docker exec ${postgresContainer} psql -U postgres -c "\\dt"`;
    try {
      const tablesList = await executeCommand(conn, listTablesCommand);
      console.log('Список таблиц:');
      console.log(tablesList);
    } catch (error) {
      console.log('Ошибка при получении списка таблиц:', error.message);
    }

    // Проверяем наличие таблицы User
    const checkUserTableCommand = `docker exec ${postgresContainer} psql -U postgres -c "SELECT * FROM \\\"User\\\" LIMIT 5;"`;
    try {
      const userTable = await executeCommand(conn, checkUserTableCommand);
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
        const userTableName = await executeCommand(conn, findUserTableCommand);
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
 * Функция для проверки существования пользователя в базе данных через Prisma в Docker
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @param {string} projectPath Путь к проекту на сервере
 * @returns {Promise<boolean>} Существует ли пользователь
 */
async function checkUserExists(conn, email, projectPath) {
  try {
    console.log(`Проверка существования пользователя с email ${email}...`);

    // Команда для проверки существования пользователя через Prisma
    const command = `cd ${projectPath} && npx prisma studio --browser none && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function checkUser() {
        try {
          // Сначала проверим, есть ли пользователь с точным совпадением email
          const user = await prisma.user.findUnique({
            where: { email: '${email}' }
          });
          
          if (user) {
            console.log('USER_EXISTS');
            console.log(JSON.stringify(user, null, 2));
            return;
          }
          
          // Если точного совпадения нет, попробуем поискать по частичному совпадению
          const similarUsers = await prisma.user.findMany({
            where: {
              email: {
                contains: '${email.split('@')[0]}' // Ищем по части email до @
              }
            },
            take: 5
          });
          
          if (similarUsers.length > 0) {
            console.log('SIMILAR_USERS_FOUND');
            console.log('Найдены похожие пользователи:');
            similarUsers.forEach(user => {
              console.log(JSON.stringify(user, null, 2));
            });
          } else {
            console.log('USER_NOT_FOUND');
            
            // Проверим, есть ли вообще пользователи в базе
            const userCount = await prisma.user.count();
            console.log('Общее количество пользователей в базе:', userCount);
            
            if (userCount > 0) {
              // Выведем несколько примеров пользователей
              const sampleUsers = await prisma.user.findMany({
                take: 3
              });
              console.log('Примеры пользователей в базе:');
              sampleUsers.forEach(user => {
                console.log(JSON.stringify(user, null, 2));
              });
            }
          }
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      checkUser();
    "`;

    try {
      const output = await executeCommand(conn, command);
      console.log(output);

      // Проверяем, содержит ли вывод маркер существования пользователя
      return output.includes('USER_EXISTS');
    } catch (error) {
      console.error('Ошибка при выполнении Prisma-запроса:', error.message);

      // Пробуем альтернативный подход через прямой SQL-запрос к PostgreSQL
      console.log('Пробуем альтернативный подход через SQL...');
      const postgresCommand = `docker exec trenerfront_postgres psql -U postgres -c "SELECT * FROM \\\"User\\\" WHERE email = '${email}';"`;

      try {
        const sqlOutput = await executeCommand(conn, postgresCommand);
        console.log('Результат SQL-запроса:');
        console.log(sqlOutput);

        return sqlOutput.includes(email) && !sqlOutput.includes('0 rows');
      } catch (sqlError) {
        console.error('Ошибка при выполнении SQL-запроса:', sqlError.message);
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
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @param {string} projectPath Путь к проекту на сервере
 * @returns {Promise<boolean>} Является ли пользователь администратором
 */
async function isUserAdmin(conn, email, projectPath) {
  try {
    // Команда для проверки роли пользователя через Prisma
    const command = `cd ${projectPath} && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function checkUserRole() {
        try {
          const user = await prisma.user.findUnique({
            where: { email: '${email}' },
            select: { role: true, id: true, email: true }
          });
          
          if (user) {
            console.log('Информация о пользователе:');
            console.log(JSON.stringify(user, null, 2));
            console.log(user.role === 'admin' ? 'IS_ADMIN' : 'NOT_ADMIN');
          } else {
            console.log('USER_NOT_FOUND');
          }
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      checkUserRole();
    "`;

    try {
      const output = await executeCommand(conn, command);
      console.log(output);

      // Проверяем, содержит ли вывод маркер администратора
      return output.includes('IS_ADMIN');
    } catch (error) {
      console.error('Ошибка при выполнении Prisma-запроса:', error.message);

      // Пробуем альтернативный подход через прямой SQL-запрос к PostgreSQL
      console.log('Пробуем альтернативный подход через SQL...');
      const postgresCommand = `docker exec trenerfront_postgres psql -U postgres -c "SELECT * FROM \\\"User\\\" WHERE email = '${email}';"`;

      try {
        const sqlOutput = await executeCommand(conn, postgresCommand);
        console.log('Результат SQL-запроса:');
        console.log(sqlOutput);

        return sqlOutput.includes('admin');
      } catch (sqlError) {
        console.error('Ошибка при выполнении SQL-запроса:', sqlError.message);
        return false;
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке роли пользователя:', error.message);
    return false;
  }
}

/**
 * Функция для назначения пользователя администратором
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @param {string} projectPath Путь к проекту на сервере
 * @returns {Promise<boolean>} Успешно ли выполнена операция
 */
async function makeUserAdmin(conn, email, projectPath) {
  try {
    // Команда для обновления роли пользователя через Prisma
    const command = `cd ${projectPath} && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function makeUserAdmin() {
        try {
          const updatedUser = await prisma.user.update({
            where: { email: '${email}' },
            data: { role: 'admin' }
          });
          console.log('USER_UPDATED');
          console.log(JSON.stringify(updatedUser, null, 2));
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      makeUserAdmin();
    "`;

    try {
      const output = await executeCommand(conn, command);
      console.log(output);

      // Проверяем, что роль успешно обновлена
      const isAdmin = await isUserAdmin(conn, email, projectPath);
      return isAdmin;
    } catch (error) {
      console.error('Ошибка при выполнении Prisma-запроса:', error.message);

      // Пробуем альтернативный подход через прямой SQL-запрос к PostgreSQL
      console.log('Пробуем альтернативный подход через SQL...');
      const postgresCommand = `docker exec trenerfront_postgres psql -U postgres -c "UPDATE \\\"User\\\" SET role = 'admin' WHERE email = '${email}';"`;

      try {
        const sqlOutput = await executeCommand(conn, postgresCommand);
        console.log('Результат SQL-запроса:');
        console.log(sqlOutput);

        // Проверяем, что роль успешно обновлена
        const isAdmin = await isUserAdmin(conn, email, projectPath);
        return isAdmin;
      } catch (sqlError) {
        console.error('Ошибка при выполнении SQL-запроса:', sqlError.message);
        return false;
      }
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
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @param {string} projectPath Путь к проекту на сервере
 * @returns {Promise<boolean>} Успешно ли выполнена операция
 */
async function createAdminActionLog(conn, email, projectPath) {
  try {
    // Получаем ID пользователя
    const getUserIdCommand = `cd ${projectPath} && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function getUserId() {
        try {
          const user = await prisma.user.findUnique({
            where: { email: '${email}' },
            select: { id: true }
          });
          if (user) {
            console.log('USER_ID:' + user.id);
          } else {
            console.error('USER_NOT_FOUND');
          }
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      getUserId();
    "`;

    try {
      const userIdOutput = await executeCommand(conn, getUserIdCommand);
      console.log(userIdOutput);

      // Извлекаем ID из вывода
      const userIdMatch = userIdOutput.match(/USER_ID:([\w-]+)/);
      if (!userIdMatch) {
        console.error('Не удалось получить ID пользователя');
        return false;
      }

      const userId = userIdMatch[1];

      // Проверяем существование таблицы AdminActionLog
      const checkTableCommand = `cd ${projectPath} && node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function checkTable() {
          try {
            // Проверяем, есть ли метод adminActionLog у prisma
            if (typeof prisma.adminActionLog === 'undefined') {
              console.log('TABLE_NOT_EXISTS');
              return;
            }
            
            // Если метод есть, пробуем получить количество записей
            const count = await prisma.adminActionLog.count();
            console.log('TABLE_EXISTS');
            console.log('Количество записей в таблице AdminActionLog:', count);
          } catch (error) {
            console.error('ERROR:', error.message);
            if (error.message.includes('does not exist')) {
              console.log('TABLE_NOT_EXISTS');
            }
          } finally {
            await prisma.$disconnect();
          }
        }
        
        checkTable();
      "`;
      const tableCheckOutput = await executeCommand(conn, checkTableCommand);
      console.log(tableCheckOutput);

      // Если таблица не существует, выходим
      if (tableCheckOutput.includes('TABLE_NOT_EXISTS')) {
        console.log(
          'Таблица AdminActionLog не существует, пропускаем создание записи в логе'
        );
        return false;
      }

      // Создаем запись в логе
      const createLogCommand = `cd ${projectPath} && node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function createLog() {
          try {
            const log = await prisma.adminActionLog.create({
              data: {
                adminId: '${userId}',
                action: 'create_admin',
                entityType: 'user',
                entityId: '${userId}',
                details: {
                  message: 'Назначение пользователя администратором через SSH'
                }
              }
            });
            console.log('LOG_CREATED');
            console.log(JSON.stringify(log, null, 2));
          } catch (error) {
            console.error('ERROR:', error.message);
          } finally {
            await prisma.$disconnect();
          }
        }
        
        createLog();
      "`;
      const logOutput = await executeCommand(conn, createLogCommand);
      console.log(logOutput);

      return logOutput.includes('LOG_CREATED');
    } catch (error) {
      console.error('Ошибка при выполнении Prisma-запроса:', error.message);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при создании записи в логе:', error.message);
    return false;
  }
}

/**
 * Основная функция для назначения пользователя администратором через SSH
 * @param {string} email Email пользователя
 */
async function makeAdminUserSSH(email) {
  const conn = new Client();

  // Функция для запроса учетных данных SSH, если они не указаны в конфигурации
  const promptForCredentials = () => {
    return new Promise((resolve) => {
      if (!sshConfig.username) {
        rl.question('Введите имя пользователя SSH: ', (username) => {
          // Проверяем, не содержит ли ввод пользователя адрес сервера
          if (username.includes('@')) {
            const parts = username.split('@');
            sshConfig.username = parts[0];
            // Если пользователь ввел другой хост, обновляем его
            if (parts[1] && parts[1] !== sshConfig.host) {
              sshConfig.host = parts[1];
            }
          } else {
            sshConfig.username = username;
          }

          if (!sshConfig.password && !sshConfig.privateKey) {
            rl.question('Введите пароль SSH: ', (password) => {
              sshConfig.password = password;
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else if (!sshConfig.password && !sshConfig.privateKey) {
        rl.question('Введите пароль SSH: ', (password) => {
          sshConfig.password = password;
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  try {
    // Запрашиваем учетные данные SSH, если необходимо
    await promptForCredentials();

    // Подключаемся к серверу
    await new Promise((resolve, reject) => {
      conn
        .on('ready', () => {
          console.log('SSH-соединение установлено');
          resolve();
        })
        .on('error', (err) => {
          reject(new Error(`Ошибка SSH-соединения: ${err.message}`));
        })
        .connect(sshConfig);
    });

    // Проверяем Docker-контейнеры и определяем путь к проекту
    const { projectPath, postgresContainer } = await checkDockerContainers(
      conn
    );
    console.log(`Используем путь к проекту: ${projectPath}`);
    console.log(`Используем контейнер PostgreSQL: ${postgresContainer}`);

    // Проверяем структуру базы данных в Docker
    await checkDatabaseStructure(conn, postgresContainer);

    // Проверяем существование пользователя
    const userExists = await checkUserExists(conn, email, projectPath);
    if (!userExists) {
      console.error(`Пользователь с email ${email} не найден на сервере`);
      return false;
    }

    // Проверяем, не является ли пользователь уже администратором
    const isAdmin = await isUserAdmin(conn, email, projectPath);
    if (isAdmin) {
      console.log(
        `Пользователь ${email} уже является администратором на сервере`
      );
      return true;
    }

    // Назначаем пользователя администратором
    const success = await makeUserAdmin(conn, email, projectPath);
    if (!success) {
      console.error('Не удалось назначить пользователя администратором');
      return false;
    }

    console.log(
      `Пользователь ${email} успешно назначен администратором на сервере`
    );

    // Создаем запись в логе административных действий
    const logCreated = await createAdminActionLog(conn, email, projectPath);
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
  } finally {
    // Закрываем SSH-соединение
    conn.end();
  }
}

// Основная функция скрипта
async function main() {
  try {
    // Запрашиваем email пользователя
    rl.question(
      'Введите email пользователя, которого нужно сделать администратором на сервере: ',
      async (email) => {
        if (!email || !email.trim()) {
          console.error('Email не может быть пустым');
          rl.close();
          return;
        }

        const success = await makeAdminUserSSH(email.trim());
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
