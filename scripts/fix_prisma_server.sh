#!/bin/bash

# Скрипт для исправления проблем с Prisma на сервере
# Использование: ./fix_prisma_server.sh

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

info "Начинаем исправление проблем с Prisma на сервере..."

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

  # Очистка кэша npm
  info "Очистка кэша npm..."
  npm cache clean --force
  
  # Удаление node_modules и package-lock.json
  info "Удаление node_modules и package-lock.json..."
  rm -rf node_modules package-lock.json
  
  # Установка Prisma глобально
  info "Установка Prisma глобально..."
  npm install -g prisma
  
  # Проверка глобальной установки Prisma
  info "Проверка глобальной установки Prisma..."
  prisma -v || {
    warning "Не удалось выполнить команду prisma -v. Проверяем путь к глобальным модулям..."
    ls -la $(npm root -g)
    warning "Попытка использования npx prisma..."
    npx prisma -v || warning "Не удалось выполнить команду npx prisma -v"
  }
  
  # Установка зависимостей проекта
  info "Установка зависимостей проекта..."
  npm install
  
  # Проверка наличия Prisma в node_modules
  info "Проверка наличия Prisma в node_modules..."
  if [ -d "node_modules/prisma" ]; then
    info "Prisma найдена в node_modules"
    ls -la node_modules/prisma
    ls -la node_modules/prisma/build || warning "Директория build не найдена в node_modules/prisma"
  else
    warning "Prisma не найдена в node_modules. Попытка установки..."
    npm install prisma
    
    if [ -d "node_modules/prisma" ]; then
      info "Prisma успешно установлена"
      ls -la node_modules/prisma
    else
      error_exit "Не удалось установить Prisma"
    fi
  fi
  
  # Проверка наличия @prisma/client в node_modules
  info "Проверка наличия @prisma/client в node_modules..."
  if [ -d "node_modules/@prisma/client" ]; then
    info "@prisma/client найден в node_modules"
  else
    warning "@prisma/client не найден в node_modules. Попытка установки..."
    npm install @prisma/client
    
    if [ -d "node_modules/@prisma/client" ]; then
      info "@prisma/client успешно установлен"
    else
      error_exit "Не удалось установить @prisma/client"
    fi
  fi
  
  # Генерация Prisma Client
  info "Генерация Prisma Client..."
  npx prisma generate || warning "Не удалось сгенерировать Prisma Client"
  
  # Проверка наличия директории prisma
  info "Проверка наличия директории prisma..."
  if [ -d "prisma" ]; then
    info "Директория prisma найдена"
    ls -la prisma
    
    # Проверка наличия файла schema.prisma
    if [ -f "prisma/schema.prisma" ]; then
      info "Файл schema.prisma найден"
      head -n 10 prisma/schema.prisma
    else
      warning "Файл schema.prisma не найден"
    fi
    
    # Проверка наличия директории migrations
    if [ -d "prisma/migrations" ]; then
      info "Директория migrations найдена"
      ls -la prisma/migrations
    else
      warning "Директория migrations не найдена"
    fi
  else
    warning "Директория prisma не найдена"
  fi
  
  # Проверка переменной окружения DATABASE_URL
  info "Проверка переменной окружения DATABASE_URL..."
  if [ -f ".env" ] && grep -q "DATABASE_URL" .env; then
    info "DATABASE_URL найден в файле .env"
    # Маскируем пароль в выводе
    grep "DATABASE_URL" .env | sed 's/\(DATABASE_URL=.*:\/\/[^:]*:\)[^@]*\(@.*\)/\1*****\2/'
  else
    warning "DATABASE_URL не найден в файле .env"
  fi
  
  # Попытка выполнения миграций
  info "Попытка выполнения миграций..."
  npx prisma migrate deploy || {
    warning "Не удалось выполнить миграции. Попытка с флагом --force..."
    npx prisma migrate deploy --force || warning "Не удалось выполнить миграции с флагом --force"
  }
  
  info "Скрипт исправления Prisma завершен"
EOF

info "Скрипт исправления Prisma на сервере выполнен"