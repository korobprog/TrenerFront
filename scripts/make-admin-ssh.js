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
 * Функция для проверки существования пользователя в базе данных
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @returns {Promise<boolean>} Существует ли пользователь
 */
async function checkUserExists(conn, email) {
  try {
    // Команда для проверки существования пользователя через Prisma
    const command = `cd /root/supermock && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function checkUser() {
        try {
          const user = await prisma.user.findUnique({
            where: { email: '${email}' }
          });
          console.log(user ? 'USER_EXISTS' : 'USER_NOT_FOUND');
          if (user) console.log(JSON.stringify(user));
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      checkUser();
    "`;
    const output = await executeCommand(conn, command);

    // Проверяем, содержит ли вывод маркер существования пользователя
    return output.includes('USER_EXISTS');
  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error.message);
    return false;
  }
}

/**
 * Функция для проверки, является ли пользователь уже администратором
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @returns {Promise<boolean>} Является ли пользователь администратором
 */
async function isUserAdmin(conn, email) {
  try {
    // Команда для проверки роли пользователя через Prisma
    const command = `cd /root/supermock && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function checkUserRole() {
        try {
          const user = await prisma.user.findUnique({
            where: { email: '${email}' },
            select: { role: true }
          });
          console.log(user && user.role === 'admin' ? 'IS_ADMIN' : 'NOT_ADMIN');
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      checkUserRole();
    "`;
    const output = await executeCommand(conn, command);

    // Проверяем, содержит ли вывод маркер администратора
    return output.includes('IS_ADMIN');
  } catch (error) {
    console.error('Ошибка при проверке роли пользователя:', error.message);
    return false;
  }
}

/**
 * Функция для назначения пользователя администратором
 * @param {Client} conn SSH-соединение
 * @param {string} email Email пользователя
 * @returns {Promise<boolean>} Успешно ли выполнена операция
 */
async function makeUserAdmin(conn, email) {
  try {
    // Команда для обновления роли пользователя через Prisma
    const command = `cd /root/supermock && node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function makeUserAdmin() {
        try {
          const updatedUser = await prisma.user.update({
            where: { email: '${email}' },
            data: { role: 'admin' }
          });
          console.log('USER_UPDATED');
          console.log(JSON.stringify(updatedUser));
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      makeUserAdmin();
    "`;
    await executeCommand(conn, command);

    // Проверяем, что роль успешно обновлена
    const isAdmin = await isUserAdmin(conn, email);
    return isAdmin;
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
 * @returns {Promise<boolean>} Успешно ли выполнена операция
 */
async function createAdminActionLog(conn, email) {
  try {
    // Получаем ID пользователя
    const getUserIdCommand = `cd /root/supermock && node -e "
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
    const userIdOutput = await executeCommand(conn, getUserIdCommand);

    // Извлекаем ID из вывода
    const userIdMatch = userIdOutput.match(/USER_ID:([\w-]+)/);
    if (!userIdMatch) {
      console.error('Не удалось получить ID пользователя');
      return false;
    }

    const userId = userIdMatch[1];

    // Создаем запись в логе
    const createLogCommand = `cd /root/supermock && node -e "
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
        } catch (error) {
          console.error('ERROR:', error.message);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      createLog();
    "`;
    await executeCommand(conn, createLogCommand);

    return true;
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

    // Проверяем существование пользователя
    const userExists = await checkUserExists(conn, email);
    if (!userExists) {
      console.error(`Пользователь с email ${email} не найден на сервере`);
      return false;
    }

    // Проверяем, не является ли пользователь уже администратором
    const isAdmin = await isUserAdmin(conn, email);
    if (isAdmin) {
      console.log(
        `Пользователь ${email} уже является администратором на сервере`
      );
      return true;
    }

    // Назначаем пользователя администратором
    const success = await makeUserAdmin(conn, email);
    if (!success) {
      console.error('Не удалось назначить пользователя администратором');
      return false;
    }

    console.log(
      `Пользователь ${email} успешно назначен администратором на сервере`
    );

    // Создаем запись в логе административных действий
    const logCreated = await createAdminActionLog(conn, email);
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
