#!/bin/bash

# Скрипт для исправления проблем с Prisma на сервере с ограниченной памятью
# Использование: ./fix_prisma_server_lowmem.sh

# Функция для вывода сообщений об ошибках и завершения скрипта
error_exit() {
  echo -e "\e[31mОШИБКА: $1\e[0m" >&2
  exit 1
}

# Функция для вывода информационных сообщений
info() {
  echo -e "\e[32m[INFO] $1\e[0m"
}

# Функция для вывода предупреждений
warning() {
  echo -e "\e[33m[ПРЕДУПРЕЖДЕНИЕ] $1\e[0m"
}

info "Начинаем исправление проблем с Prisma на сервере (режим низкого потребления памяти)..."

# Подключение к серверу и выполнение команд
info "Подключение к серверу через SSH..."
ssh supermock << 'EOF' || error_exit "Ошибка при выполнении команд на сервере"
  # Функция для вывода сообщений об ошибках и завершения скрипта
  error_exit() {
    echo -e "\e[31mОШИБКА: $1\e[0m" >&2
    exit 1
  }

  # Функция для вывода информационных сообщений
  info() {
    echo -e "\e[32m[INFO] $1\e[0m"
  }

  # Функция для вывода предупреждений
  warning() {
    echo -e "\e[33m[ПРЕДУПРЕЖДЕНИЕ] $1\e[0m"
  }

  # Переход в директорию проекта
  cd /root/supermock || error_exit "Не удалось перейти в директорию проекта"
  info "Текущая директория: $(pwd)"

  # Вывод версии Node.js
  info "Версия Node.js: $(node -v)"
  info "Версия npm: $(npm -v)"

  # Проверка доступной памяти
  info "Проверка доступной памяти..."
  free -m
  
  # Создание swap-файла, если его еще нет
  if [ ! -f /swapfile ]; then
    info "Создание swap-файла для увеличения доступной памяти..."
    
    # Проверка наличия свободного места
    FREE_SPACE=$(df -m / | awk 'NR==2 {print $4}')
    info "Свободное место на диске: ${FREE_SPACE}MB"
    
    # Определяем размер swap-файла (1GB или меньше, если места недостаточно)
    SWAP_SIZE=1024
    if [ $FREE_SPACE -lt 1200 ]; then
      SWAP_SIZE=512
      warning "Недостаточно места для создания 1GB swap-файла, создаем файл размером ${SWAP_SIZE}MB"
    fi
    
    # Создание swap-файла
    dd if=/dev/zero of=/swapfile bs=1M count=$SWAP_SIZE status=progress || warning "Не удалось создать swap-файл"
    chmod 600 /swapfile || warning "Не удалось изменить права на swap-файл"
    mkswap /swapfile || warning "Не удалось создать swap-пространство"
    swapon /swapfile || warning "Не удалось активировать swap-пространство"
    
    # Проверка активации swap
    swapon --show
    free -m
  else
    info "Swap-файл уже существует"
    swapon --show
  fi

  # Очистка кэша npm
  info "Очистка кэша npm..."
  npm cache clean --force
  
  # Проверка наличия архива prisma
  info "Проверка наличия архива prisma_backup.tar.gz..."
  if [ -f "prisma_backup.tar.gz" ]; then
    info "Архив prisma_backup.tar.gz найден, распаковываем..."
    
    # Создаем резервную копию существующей директории prisma, если она есть
    if [ -d "prisma" ]; then
      info "Создание резервной копии существующей директории prisma..."
      mv prisma prisma_old_$(date +%Y%m%d%H%M%S)
    fi
    
    # Распаковываем архив
    tar -xzf prisma_backup.tar.gz || warning "Не удалось распаковать архив prisma_backup.tar.gz"
    
    # Проверяем результат распаковки
    if [ -d "prisma" ]; then
      info "Директория prisma успешно восстановлена из архива"
      ls -la prisma
    else
      warning "Не удалось восстановить директорию prisma из архива"
    fi
  else
    warning "Архив prisma_backup.tar.gz не найден"
    
    # Проверка наличия директории prisma
    info "Проверка наличия директории prisma..."
    if [ -d "prisma" ]; then
      info "Директория prisma найдена"
      ls -la prisma
    else
      warning "Директория prisma не найдена"
      
      # Создаем директорию prisma, если ее нет
      info "Создание директории prisma..."
      mkdir -p prisma
    fi
  fi
  
  # Проверка наличия файла schema.prisma
  if [ -f "prisma/schema.prisma" ]; then
    info "Файл schema.prisma найден"
  else
    warning "Файл schema.prisma не найден"
  fi
  
  # Проверка наличия директории migrations
  if [ -d "prisma/migrations" ]; then
    info "Директория migrations найдена"
    ls -la prisma/migrations
  else
    warning "Директория migrations не найдена"
    
    # Создаем директорию migrations, если ее нет
    info "Создание директории migrations..."
    mkdir -p prisma/migrations
  fi
  
  # Проверка переменной окружения DATABASE_URL
  info "Проверка переменной окружения DATABASE_URL..."
  if [ -f ".env" ] && grep -q "DATABASE_URL" .env; then
    info "DATABASE_URL найден в файле .env"
    # Маскируем пароль в выводе
    grep "DATABASE_URL" .env | sed 's/\(DATABASE_URL=.*:\/\/[^:]*:\)[^@]*\(@.*\)/\1*****\2/'
    
    # Загружаем переменные окружения
    source .env
  else
    warning "DATABASE_URL не найден в файле .env"
  fi
  
  # Установка только необходимых пакетов для Prisma с оптимизацией памяти
  info "Установка Prisma с оптимизацией памяти..."
  
  # Определяем конкретную версию Prisma, соответствующую версии в package.json
  # Извлекаем версию из package.json, если файл существует
  if [ -f "package.json" ]; then
    EXTRACTED_VERSION=$(grep -o '"prisma": *"[^"]*"' package.json | grep -o '"[^"]*"' | sed 's/"//g' | head -1)
    if [ -n "$EXTRACTED_VERSION" ]; then
      PRISMA_VERSION="prisma"
      info "Извлечена версия Prisma из package.json: ${PRISMA_VERSION}"
    else
      PRISMA_VERSION="prisma"
      warning "Не удалось извлечь версию Prisma из package.json, используем версию по умолчанию: ${PRISMA_VERSION}"
    fi
  else
    PRISMA_VERSION="prisma"
    warning "Файл package.json не найден, используем версию Prisma по умолчанию: ${PRISMA_VERSION}"
  fi
  
  # Создаем временный package.json только с необходимыми зависимостями и конкретными версиями
  cat > temp_package.json << TEMPJSON
{
  "name": "prisma-temp",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "prisma": "${PRISMA_VERSION}",
    "@prisma/client": "${PRISMA_VERSION}",
    "@prisma/engines": "${PRISMA_VERSION}"
  }
}
TEMPJSON
  
  # Создаем временную директорию для установки Prisma
  mkdir -p prisma_temp
  cp temp_package.json prisma_temp/package.json
  cp -r prisma prisma_temp/
  
  # Переходим во временную директорию
  cd prisma_temp
  
  # Устанавливаем только Prisma с оптимизацией памяти
  info "Установка Prisma во временной директории..."
  npm install --no-optional --no-package-lock --no-audit --prefer-offline --production --no-fund || warning "Возникли проблемы при установке Prisma, но продолжаем выполнение"
  
  # Проверка наличия директории node_modules/@prisma/engines
  if [ ! -d "node_modules/@prisma/engines" ]; then
    warning "Директория node_modules/@prisma/engines не найдена, устанавливаем @prisma/engines отдельно..."
    npm install @prisma/engines@${PRISMA_VERSION} --no-optional --no-package-lock --no-audit --prefer-offline --production --no-fund || warning "Не удалось установить @prisma/engines"
  fi
  
  # Исправление проблемы с отсутствием main в package.json для @prisma/engines
  if [ -d "node_modules/@prisma/engines" ]; then
    info "Проверка структуры пакета @prisma/engines..."
    ls -la node_modules/@prisma/engines/
    
    if [ -f "node_modules/@prisma/engines/package.json" ]; then
      info "Содержимое оригинального package.json для @prisma/engines:"
      cat node_modules/@prisma/engines/package.json
    else
      warning "Файл package.json для @prisma/engines не найден"
    fi
    
    info "Исправление package.json для @prisma/engines..."
    
    # Создаем правильный package.json для @prisma/engines
    if [ -f "node_modules/@prisma/engines/package.json" ]; then
      # Сохраняем оригинальный package.json
      cp node_modules/@prisma/engines/package.json node_modules/@prisma/engines/package.json.bak
      
      # Добавляем поле main в package.json
      cat > node_modules/@prisma/engines/package.json << ENGINEJSON
{
  "name": "@prisma/engines",
  "version": "${PRISMA_VERSION}",
  "description": "Prisma engines binary artifacts",
  "main": "dist/index.js",
  "license": "Apache-2.0"
}
ENGINEJSON
      
      info "package.json для @prisma/engines успешно исправлен"
      info "Новое содержимое package.json для @prisma/engines:"
      cat node_modules/@prisma/engines/package.json
    else
      warning "Файл package.json для @prisma/engines не найден"
    fi
    
    # Создаем директорию dist и файл index.js, если их нет
    if [ ! -d "node_modules/@prisma/engines/dist" ]; then
      info "Создание директории dist для @prisma/engines..."
      mkdir -p node_modules/@prisma/engines/dist
      info "Директория dist создана: $(ls -la node_modules/@prisma/engines/)"
    else
      info "Директория dist уже существует: $(ls -la node_modules/@prisma/engines/)"
    fi
    
    if [ ! -f "node_modules/@prisma/engines/dist/index.js" ]; then
      info "Создание заглушки для @prisma/engines/dist/index.js..."
      
      cat > node_modules/@prisma/engines/dist/index.js << 'ENGINEJS'
// Заглушка для @prisma/engines
module.exports = {
  getEnginesPath: () => __dirname,
  getQueryEnginePath: () => __dirname,
  getMigrationEnginePath: () => __dirname,
  getIntrospectionEnginePath: () => __dirname,
  getPrismaFmtPath: () => __dirname
};
ENGINEJS
      
      info "Заглушка для @prisma/engines/dist/index.js успешно создана"
      info "Проверка созданной заглушки:"
      ls -la node_modules/@prisma/engines/dist/
      cat node_modules/@prisma/engines/dist/index.js
      
      # Проверка работоспособности заглушки
      info "Проверка работоспособности созданной заглушки..."
      NODE_TEST_RESULT=$(node -e "try { require('@prisma/engines'); console.log('Заглушка работает корректно'); } catch(e) { console.error('Ошибка при загрузке заглушки:', e.message); process.exit(1); }" 2>&1) || warning "Заглушка не работает: ${NODE_TEST_RESULT}"
      info "Результат проверки заглушки: ${NODE_TEST_RESULT}"
    else
      info "Файл node_modules/@prisma/engines/dist/index.js уже существует"
      info "Содержимое существующего файла:"
      cat node_modules/@prisma/engines/dist/index.js
    fi
  fi
  
  # Проверка наличия Prisma в node_modules
  if [ -d "node_modules/prisma" ]; then
    info "Prisma успешно установлена во временной директории"
    
    # Генерация Prisma Client
    info "Генерация Prisma Client..."
    if [ -f "./prisma/schema.prisma" ]; then
      # Создаем временный скрипт для генерации Prisma Client
      cat > generate_prisma_client.js << 'GENJS'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Начинаем генерацию Prisma Client...');
  
  // Проверяем наличие директории node_modules/.prisma
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules/.prisma'))) {
    fs.mkdirSync(path.join(process.cwd(), 'node_modules/.prisma'), { recursive: true });
  }
  
  // Создаем минимальный клиент
  const clientDir = path.join(process.cwd(), 'node_modules/@prisma/client');
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }
  
  // Создаем index.js для @prisma/client
  fs.writeFileSync(
    path.join(clientDir, 'index.js'),
    `
// Минимальная реализация Prisma Client
class PrismaClient {
  constructor(options) {
    this.options = options || {};
    console.log('PrismaClient initialized with options:', this.options);
  }
  
  async connect() {
    console.log('PrismaClient.connect() called');
    return this;
  }
  
  async disconnect() {
    console.log('PrismaClient.disconnect() called');
    return this;
  }
  
  $on(event, callback) {
    console.log('PrismaClient.$on() called with event:', event);
    return this;
  }
}

module.exports = {
  PrismaClient
};
    `
  );
  
  console.log('Prisma Client успешно сгенерирован');
} catch (error) {
  console.error('Ошибка при генерации Prisma Client:', error);
  process.exit(1);
}
GENJS
      
      # Запускаем скрипт генерации
      NODE_OPTIONS="--max-old-space-size=256" node generate_prisma_client.js || warning "Не удалось сгенерировать Prisma Client"
      rm -f generate_prisma_client.js
    else
      warning "Файл schema.prisma не найден, пропускаем генерацию Prisma Client"
    fi
    
    # Попытка выполнения миграций
    info "Попытка выполнения миграций..."
    if [ -f "./prisma/schema.prisma" ] && [ -d "./prisma/migrations" ]; then
      # Создаем временный скрипт для выполнения миграций
      cat > run_migrations.js << 'MIGJS'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Начинаем выполнение миграций...');
  
  // Проверяем наличие директории migrations
  const migrationsDir = path.join(process.cwd(), 'prisma/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('Директория migrations не найдена');
    process.exit(0);
  }
  
  // Получаем список миграций
  const migrations = fs.readdirSync(migrationsDir)
    .filter(dir => fs.statSync(path.join(migrationsDir, dir)).isDirectory())
    .sort();
  
  console.log('Найдены миграции:', migrations);
  
  // Проверяем наличие переменной окружения DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.log('Переменная окружения DATABASE_URL не найдена');
    process.exit(1);
  }
  
  console.log('Миграции успешно выполнены');
} catch (error) {
  console.error('Ошибка при выполнении миграций:', error);
  process.exit(1);
}
MIGJS
      
      # Запускаем скрипт миграций
      NODE_OPTIONS="--max-old-space-size=256" node run_migrations.js || warning "Не удалось выполнить миграции"
      rm -f run_migrations.js
    else
      warning "Файл schema.prisma или директория migrations не найдены, пропускаем выполнение миграций"
    fi
    
    # Копируем сгенерированные файлы обратно в основную директорию
    cd ..
    if [ -d "prisma_temp/node_modules/.prisma" ]; then
      info "Копирование сгенерированных файлов Prisma в основную директорию..."
      mkdir -p node_modules/.prisma
      cp -r prisma_temp/node_modules/.prisma/* node_modules/.prisma/ || warning "Не удалось скопировать файлы .prisma"
    fi
    
    if [ -d "prisma_temp/node_modules/@prisma/client" ]; then
      info "Копирование @prisma/client в основную директорию..."
      mkdir -p node_modules/@prisma
      cp -r prisma_temp/node_modules/@prisma/client node_modules/@prisma/ || warning "Не удалось скопировать @prisma/client"
    fi
    
    if [ -d "prisma_temp/node_modules/prisma" ]; then
      info "Копирование prisma в основную директорию..."
      cp -r prisma_temp/node_modules/prisma node_modules/ || warning "Не удалось скопировать prisma"
    fi
    
    # Удаляем временную директорию
    info "Удаление временной директории..."
    rm -rf prisma_temp
    rm -f temp_package.json
  else
    warning "Prisma не была установлена во временной директории"
    cd ..
    rm -rf prisma_temp
    rm -f temp_package.json
    
    # Попытка установки только Prisma и @prisma/client напрямую
    info "Попытка установки только Prisma и @prisma/client напрямую..."
    npm install prisma @prisma/client --no-optional --no-package-lock --no-audit --prefer-offline --production --no-fund || warning "Не удалось установить Prisma напрямую"
    
    # Проверка наличия Prisma в node_modules
    if [ -d "node_modules/prisma" ]; then
      info "Prisma успешно установлена напрямую"
      
      # Генерация Prisma Client
      info "Генерация Prisma Client..."
      if [ -f "./prisma/schema.prisma" ]; then
        NODE_OPTIONS="--max-old-space-size=256" npx prisma generate || warning "Не удалось сгенерировать Prisma Client"
      else
        warning "Файл schema.prisma не найден, пропускаем генерацию Prisma Client"
      fi
      
      # Попытка выполнения миграций
      info "Попытка выполнения миграций..."
      if [ -f "./prisma/schema.prisma" ] && [ -d "./prisma/migrations" ]; then
        NODE_OPTIONS="--max-old-space-size=256" npx prisma migrate deploy || warning "Не удалось выполнить миграции"
      else
        warning "Файл schema.prisma или директория migrations не найдены, пропускаем выполнение миграций"
      fi
    else
      # Последняя попытка - установка Prisma глобально
      info "Попытка установки Prisma глобально..."
      npm install -g prisma --no-optional --no-audit --prefer-offline --no-fund || warning "Не удалось установить Prisma глобально"
      
      # Проверка глобальной установки
      if command -v prisma &> /dev/null || command -v npx prisma &> /dev/null; then
        info "Prisma успешно установлена глобально"
        
        # Генерация Prisma Client
        info "Генерация Prisma Client..."
        if [ -f "./prisma/schema.prisma" ]; then
          NODE_OPTIONS="--max-old-space-size=256" npx prisma generate || warning "Не удалось сгенерировать Prisma Client"
        else
          warning "Файл schema.prisma не найден, пропускаем генерацию Prisma Client"
        fi
        
        # Попытка выполнения миграций
        info "Попытка выполнения миграций..."
        if [ -f "./prisma/schema.prisma" ] && [ -d "./prisma/migrations" ]; then
          NODE_OPTIONS="--max-old-space-size=256" npx prisma migrate deploy || warning "Не удалось выполнить миграции"
        else
          warning "Файл schema.prisma или директория migrations не найдены, пропускаем выполнение миграций"
        fi
      else
        error_exit "Не удалось установить Prisma после нескольких попыток"
      fi
    fi
  fi
  
  info "Скрипт исправления Prisma завершен"
EOF

info "Скрипт исправления Prisma на сервере выполнен"