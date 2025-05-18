#!/bin/bash

# Скрипт для анализа и очистки директории на сервере
# Использование: ./clean_server.sh [--yes]
# Опции:
#   --yes  Автоматически подтверждать удаление файлов без запроса

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

# Функция для вывода заголовков
header() {
  echo -e "\e[1;34m\n=== $1 ===\e[0m"
}

# Текущая дата для имени резервной копии
CURRENT_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="supermock_backup_${CURRENT_DATE}.tar.gz"
# Определяем локальный путь для резервных копий (не используется в SSH-сессии)
BACKUP_PATH="/root/backups"

# Проверяем наличие флага автоматического подтверждения
AUTO_CONFIRM=false
if [ "$1" == "--yes" ]; then
  AUTO_CONFIRM=true
  info "Режим автоматического подтверждения активирован"
fi

info "Начинаем анализ и очистку директории на сервере..."

# Подключение к серверу и выполнение команд
header "Подключение к серверу"
info "Подключение к серверу через SSH (алиас 'supermock')..."

# Создаем команду для экспорта переменной AUTO_CONFIRM, если нужно
SSH_COMMAND=""
if [ "$AUTO_CONFIRM" = true ]; then
  SSH_COMMAND="export AUTO_CONFIRM=true; "
fi

# Подключаемся к серверу и выполняем команды
ssh supermock "${SSH_COMMAND}bash -s" << 'EOF' || error_exit "Ошибка при выполнении команд на сервере"
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

  # Функция для вывода заголовков
  header() {
    echo -e "\e[1;34m\n=== $1 ===\e[0m"
  }

  # Функция для проверки успешности выполнения команды
  check_status() {
    if [ $? -ne 0 ]; then
      error_exit "$1"
    fi
  }

  # Переход в директорию проекта
  cd /root/supermock || error_exit "Не удалось перейти в директорию /root/supermock"

  # Анализ текущего использования диска
  header "Анализ текущего использования диска"
  info "Текущее использование диска в директории /root/supermock:"
  du -sh /root/supermock
  check_status "Не удалось получить информацию о размере директории"

  # Вывод списка файлов и директорий с размерами
  header "Список файлов и директорий с размерами"
  info "Список файлов и директорий в /root/supermock:"
  du -sh * | sort -hr
  check_status "Не удалось получить список файлов и директорий"

  # Проверка наличия директории app
  if [ ! -d "app" ]; then
    warning "Директория 'app' не найдена! Проверьте правильность пути."
    ls -la
    error_exit "Директория 'app' не найдена в /root/supermock"
  fi

  # Определяем путь для резервных копий на сервере
  BACKUP_PATH="/root/backups"
  
  # Генерируем уникальное имя файла архива с использованием текущей даты и времени
  CURRENT_DATE=$(date +"%Y%m%d_%H%M%S")
  BACKUP_NAME="supermock_backup_${CURRENT_DATE}.tar.gz"
  
  # Создание директории для резервных копий, если она не существует
  header "Создание резервной копии"
  info "Создание директории для резервных копий: ${BACKUP_PATH}"
  if [ -z "${BACKUP_PATH}" ]; then
    error_exit "Путь для резервных копий не определен"
  fi
  
  mkdir -p "${BACKUP_PATH}"
  check_status "Не удалось создать директорию для резервных копий"

  # Создание резервной копии директории app и критически важных файлов
  info "Создание резервной копии директории 'app' и критически важных файлов..."
  
  # Список критически важных файлов и директорий для сохранения
  # Добавляем директорию app и другие потенциально важные файлы
  CRITICAL_FILES=(
    "app"
    "ecosystem.config.js"
    ".env*"
    "package.json"
    "package-lock.json"
    "nginx.conf"
  )
  
  # Создаем временную директорию для резервной копии
  TEMP_BACKUP_DIR="/tmp/supermock_backup_temp"
  mkdir -p ${TEMP_BACKUP_DIR}
  check_status "Не удалось создать временную директорию для резервной копии"
  
  # Копируем критически важные файлы во временную директорию
  for file in "${CRITICAL_FILES[@]}"; do
    if [ -e "$file" ]; then
      cp -r "$file" ${TEMP_BACKUP_DIR}/
      check_status "Не удалось скопировать $file в временную директорию"
    fi
  done
  
  # Создаем архив из временной директории
  if [ ! -d "${BACKUP_PATH}" ]; then
    error_exit "Директория для резервных копий не существует: ${BACKUP_PATH}"
  fi
  
  # Проверяем, что имя файла архива определено
  if [ -z "${BACKUP_NAME}" ]; then
    error_exit "Имя файла архива не определено"
  fi
  
  # Формируем полный путь к файлу архива
  BACKUP_FULL_PATH="${BACKUP_PATH}/${BACKUP_NAME}"
  info "Создание архива: ${BACKUP_FULL_PATH}"
  
  tar -czf "${BACKUP_FULL_PATH}" -C "${TEMP_BACKUP_DIR}" .
  check_status "Не удалось создать архив резервной копии"
  
  # Удаляем временную директорию
  rm -rf ${TEMP_BACKUP_DIR}
  check_status "Не удалось удалить временную директорию"
  
  # Проверяем, что архив был успешно создан
  if [ ! -f "${BACKUP_FULL_PATH}" ]; then
    error_exit "Архив не был создан по пути: ${BACKUP_FULL_PATH}"
  fi
  
  info "Резервная копия успешно создана: ${BACKUP_FULL_PATH}"
  info "Размер архива: $(du -h "${BACKUP_FULL_PATH}" | cut -f1)"

  # Определение файлов и директорий для удаления
  header "Определение файлов для удаления"
  info "Определение файлов и директорий, которые можно безопасно удалить..."
  
  # Список файлов и директорий, которые можно безопасно удалить
  # Исключаем директорию app и другие критически важные файлы
  SAFE_TO_DELETE=()
  
  for file in *; do
    # Пропускаем критически важные файлы и директории
    SKIP=false
    for critical in "${CRITICAL_FILES[@]}"; do
      if [[ "$file" == $critical || "$file" == ${critical}* ]]; then
        SKIP=true
        break
      fi
    done
    
    if [ "$SKIP" = false ]; then
      SAFE_TO_DELETE+=("$file")
      echo "Будет удалено: $file ($(du -sh "$file" | cut -f1))"
    else
      echo "Будет сохранено: $file (критически важный файл/директория)"
    fi
  done
  
  # Запрос подтверждения перед удалением
  header "Подтверждение удаления"
  echo "Вышеуказанные файлы и директории будут удалены."
  echo "Резервная копия критически важных файлов создана в ${BACKUP_FULL_PATH}"
  
  # Проверяем, нужно ли запрашивать подтверждение
  if [ "${AUTO_CONFIRM}" = "true" ]; then
    info "Автоматическое подтверждение активировано, продолжаем удаление..."
    CONFIRM="yes"
  else
    echo ""
    echo "Для продолжения введите 'yes':"
    read -r CONFIRM
  fi
  
  if [ "$CONFIRM" != "yes" ]; then
    warning "Операция отменена пользователем."
    exit 0
  fi
  
  # Удаление файлов и директорий
  header "Удаление файлов"
  info "Удаление ненужных файлов и директорий..."
  
  # Запоминаем начальный размер директории
  INITIAL_SIZE=$(du -s /root/supermock | cut -f1)
  
  for file in "${SAFE_TO_DELETE[@]}"; do
    if [ -e "$file" ]; then
      info "Удаление: $file"
      rm -rf "$file"
      check_status "Не удалось удалить $file"
    fi
  done
  
  # Анализ освобожденного места
  header "Результаты очистки"
  FINAL_SIZE=$(du -s /root/supermock | cut -f1)
  FREED_SPACE=$((INITIAL_SIZE - FINAL_SIZE))
  
  info "Начальный размер директории: $(echo $INITIAL_SIZE | awk '{printf "%.2f MB", $1/1024}')"
  info "Текущий размер директории: $(echo $FINAL_SIZE | awk '{printf "%.2f MB", $1/1024}')"
  info "Освобождено места: $(echo $FREED_SPACE | awk '{printf "%.2f MB", $1/1024}')"
  
  # Вывод оставшихся файлов и директорий
  header "Оставшиеся файлы и директории"
  ls -la
  
  info "Очистка директории успешно завершена!"
EOF

# Проверка статуса выполнения SSH команд
if [ $? -ne 0 ]; then
  error_exit "Произошла ошибка при выполнении команд на сервере"
fi

info "Скрипт очистки успешно выполнен."