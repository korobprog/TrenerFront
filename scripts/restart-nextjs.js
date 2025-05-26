// Скрипт для безопасного перезапуска сервера Next.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Запуск скрипта для безопасного перезапуска сервера Next.js...');

// Функция для выполнения команды и возврата результата как Promise
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Ошибка выполнения команды: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

// Функция для поиска и остановки процесса Next.js
async function findAndStopNextProcess() {
  try {
    console.log('Поиск процесса Next.js...');

    // Получаем список процессов, содержащих "next"
    const processListOutput = await execCommand(
      'ps aux | grep "[n]ext" || true'
    );

    if (!processListOutput.trim()) {
      console.log('Процесс Next.js не найден. Возможно, он уже остановлен.');
      return false;
    }

    console.log('Найдены следующие процессы Next.js:');
    console.log(processListOutput);

    // Извлекаем PID процессов Next.js
    const lines = processListOutput.trim().split('\n');
    const nextProcesses = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const pid = parts[1];
        // Проверяем, что это действительно процесс Next.js, а не VS Code или другой процесс
        const cmdlineFile = `/proc/${pid}/cmdline`;

        try {
          if (fs.existsSync(cmdlineFile)) {
            const cmdline = fs.readFileSync(cmdlineFile, 'utf8');
            // Исключаем текущий скрипт (restart-nextjs.js)
            const currentPid = process.pid.toString();
            if (
              cmdline.includes('next') &&
              !cmdline.includes('code') &&
              pid !== currentPid
            ) {
              nextProcesses.push(pid);
            }
          }
        } catch (err) {
          console.log(
            `Не удалось прочитать cmdline для PID ${pid}: ${err.message}`
          );
        }
      }
    }

    if (nextProcesses.length === 0) {
      console.log('Не найдено процессов Next.js для остановки.');
      return false;
    }

    console.log(
      `Найдено ${
        nextProcesses.length
      } процессов Next.js для остановки: ${nextProcesses.join(', ')}`
    );

    // Останавливаем процессы Next.js
    for (const pid of nextProcesses) {
      console.log(`Остановка процесса Next.js с PID ${pid}...`);
      await execCommand(`kill ${pid}`);
    }

    console.log('Процессы Next.js успешно остановлены.');
    return true;
  } catch (error) {
    console.error('Ошибка при поиске и остановке процесса Next.js:', error);
    return false;
  }
}

// Функция для запуска сервера Next.js
async function startNextServer() {
  try {
    console.log('Запуск сервера Next.js...');

    // Запускаем сервер Next.js в фоновом режиме
    const child = exec('npm run dev', (error, stdout, stderr) => {
      if (error) {
        console.error(`Ошибка запуска сервера Next.js: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
    });
    // Отключаем родительский процесс от дочернего
    child.unref();

    console.log('Сервер Next.js запущен в фоновом режиме.');
    console.log('Теперь вы можете попробовать войти как суперадминистратор:');
    console.log('- Логин: admin');
    console.log('- Пароль: krishna1284radha');
    console.log('- URL: http://localhost:3000/admin/superadmin-signin');

    return true;
  } catch (error) {
    console.error('Ошибка при запуске сервера Next.js:', error);
    return false;
  }
}

// Основная функция
async function main() {
  try {
    // Останавливаем текущий процесс Next.js
    await findAndStopNextProcess();

    // Небольшая пауза перед запуском нового процесса
    console.log('Ожидание 2 секунды перед запуском нового процесса...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Запускаем новый процесс Next.js
    await startNextServer();

    console.log('Скрипт для безопасного перезапуска сервера Next.js завершен.');
  } catch (error) {
    console.error('Ошибка при выполнении скрипта:', error);
  }
}

// Запускаем основную функцию
main();
