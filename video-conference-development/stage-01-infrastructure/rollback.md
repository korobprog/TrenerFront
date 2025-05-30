# Инструкции для отката этапа 1: Подготовка инфраструктуры

## 🚨 Общие принципы отката

**ВНИМАНИЕ:** Откат этапа 1 является критической операцией, которая затрагивает базу данных и основную инфраструктуру проекта. Выполняйте все действия последовательно и внимательно.

## 📋 Предварительная проверка

Перед началом отката убедитесь, что:

- [ ] У вас есть доступ к резервным копиям
- [ ] Все пользователи уведомлены о техническом обслуживании
- [ ] Активные видеоконференции завершены
- [ ] Создана дополнительная резервная копия текущего состояния

## 🔄 Пошаговая процедура отката

### Шаг 1: Остановка всех сервисов

```bash
# Остановить основное приложение Next.js
pm2 stop all

# Остановить Socket.io сервер (если запущен)
pkill -f "socket-server.js"

# Остановить PeerJS сервер (если запущен)
pkill -f "peerjs-server.js"

# Остановить все Node.js процессы связанные с проектом
pkill -f "node.*video-conference"

# Проверить, что все процессы остановлены
ps aux | grep node
```

### Шаг 2: Создание резервной копии текущего состояния

```bash
# Создать резервную копию перед откатом
cd /home/korobprog/Документы/Git/TrenerFront
./video-conference-development/backups/backup-script.sh stage-01-pre-rollback
```

### Шаг 3: Откат базы данных

#### 3.1 Откат миграций Prisma

```bash
# Посмотреть список миграций
npx prisma migrate status

# Откатить миграцию видеоконференций (если была применена)
npx prisma migrate reset --force

# Восстановить из резервной копии БД
./video-conference-development/backups/restore-script.sh database
```

#### 3.2 Альтернативный способ отката БД

```bash
# Если есть конкретная резервная копия перед этапом 1
./video-conference-development/backups/restore-script.sh stage-01-infrastructure
```

### Шаг 4: Удаление установленных зависимостей

```bash
# Удалить зависимости видеоконференций
npm uninstall peerjs socket.io socket.io-client simple-peer uuid
npm uninstall react-big-calendar moment
npm uninstall node-cron web-push

# Очистить кэш npm
npm cache clean --force

# Переустановить зависимости из package-lock.json
npm ci
```

### Шаг 5: Удаление созданных файлов и директорий

```bash
# Удалить API файлы видеоконференций
rm -rf video-conference-development/stage-01-infrastructure/api/

# Удалить компоненты видеоконференций
rm -rf video-conference-development/stage-01-infrastructure/components/

# Удалить библиотеки
rm -rf video-conference-development/stage-01-infrastructure/lib/

# Удалить стили
rm -rf video-conference-development/stage-01-infrastructure/styles/

# Удалить страницы API (если были созданы)
rm -rf pages/api/video-conference/
rm -rf pages/api/socket/
rm -rf pages/api/peerjs/

# Удалить компоненты из основной директории (если были созданы)
rm -rf components/VideoConference/
rm -rf components/Calendar/
rm -rf components/Notifications/
```

### Шаг 6: Откат переменных окружения

```bash
# Создать резервную копию текущих .env файлов
cp .env.development .env.development.rollback.backup
cp .env.production .env.production.rollback.backup

# Удалить переменные видеоконференций из .env.development
sed -i '/# WebRTC Configuration/,/^$/d' .env.development
sed -i '/# PeerJS Server Configuration/,/^$/d' .env.development
sed -i '/# Socket.io Configuration/,/^$/d' .env.development
sed -i '/# Video Conference Settings/,/^$/d' .env.development
sed -i '/# Notification Settings/,/^$/d' .env.development
sed -i '/# Calendar Integration/,/^$/d' .env.development

# Удалить переменные видеоконференций из .env.production
sed -i '/# WebRTC Configuration/,/^$/d' .env.production
sed -i '/# PeerJS Server Configuration/,/^$/d' .env.production
sed -i '/# Socket.io Configuration/,/^$/d' .env.production
sed -i '/# Video Conference Settings/,/^$/d' .env.production
sed -i '/# Notification Settings/,/^$/d' .env.production
sed -i '/# Calendar Integration/,/^$/d' .env.production
```

### Шаг 7: Откат конфигурационных файлов

```bash
# Восстановить package.json из Git (если изменения были закоммичены)
git checkout HEAD~1 -- package.json

# Восстановить next.config.js (если был изменен)
git checkout HEAD~1 -- next.config.js

# Восстановить prisma/schema.prisma
git checkout HEAD~1 -- prisma/schema.prisma

# Или восстановить из резервной копии
./video-conference-development/backups/restore-script.sh files
```

### Шаг 8: Регенерация Prisma Client

```bash
# Регенерировать Prisma Client для старой схемы
npx prisma generate

# Проверить подключение к базе данных
npx prisma db pull
```

## ✅ Проверка после отката

### 8.1 Проверка базы данных

```bash
# Проверить подключение к БД
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  console.log('Пользователей в БД:', count);
  process.exit(0);
}).catch(err => {
  console.error('Ошибка БД:', err);
  process.exit(1);
});
"
```

### 8.2 Проверка приложения

```bash
# Запустить приложение в режиме разработки
npm run dev

# Проверить, что приложение запускается без ошибок
curl -f http://localhost:3000 || echo "Ошибка запуска приложения"
```

### 8.3 Функциональные проверки

- [ ] Главная страница загружается без ошибок
- [ ] Авторизация работает корректно
- [ ] Существующие функции (собеседования, тренировки) работают
- [ ] API endpoints отвечают корректно
- [ ] База данных содержит все данные
- [ ] Нет ошибок в логах приложения

### 8.4 Проверка отсутствия артефактов видеоконференций

- [ ] Нет упоминаний VideoRoom в схеме БД
- [ ] Нет компонентов видеоконференций
- [ ] Нет переменных окружения для WebRTC
- [ ] Нет зависимостей peerjs, socket.io в package.json

## 🔍 Диагностика проблем

### Если приложение не запускается:

```bash
# Проверить логи
npm run dev 2>&1 | tee rollback-debug.log

# Проверить зависимости
npm list --depth=0

# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

### Если база данных недоступна:

```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить подключение
psql -U postgres -h localhost -d trener_db -c "SELECT version();"

# Восстановить из более ранней резервной копии
./video-conference-development/backups/restore-script.sh database [дата]
```

### Если есть конфликты миграций:

```bash
# Сбросить состояние миграций
npx prisma migrate reset --force

# Применить только базовые миграции
npx prisma migrate deploy
```

## 📝 Контрольные точки отката

### Обязательные резервные копии перед этапом 1:

1. **База данных:** `backup_YYYY-MM-DD_HH-MM-SS_database.sql.gz`
2. **Файлы проекта:** `stage-01-infrastructure_YYYY-MM-DD_HH-MM-SS.tar.gz`
3. **Git коммит:** Хэш коммита перед началом этапа
4. **Переменные окружения:** Копии .env файлов

### Файлы для восстановления:

- `package.json` - список зависимостей
- `prisma/schema.prisma` - схема базы данных
- `.env.development` и `.env.production` - переменные окружения
- `next.config.js` - конфигурация Next.js

## 🚨 Экстренный откат

В случае критических проблем:

```bash
# Полный откат из резервной копии
./video-conference-development/backups/restore-script.sh full

# Или восстановление конкретного этапа
./video-conference-development/backups/restore-script.sh stage-01-infrastructure

# Перезапуск всех сервисов
pm2 restart all
```

## 📞 Контакты для поддержки

В случае проблем с откатом:

1. Проверить логи в `video-conference-development/backups/logs/`
2. Создать issue с описанием проблемы
3. Приложить файлы логов и вывод команд диагностики

## 📊 Отчет об откате

После завершения отката заполните:

```markdown
## Отчет об откате этапа 1

**Дата отката:** [дата]
**Время начала:** [время]
**Время завершения:** [время]
**Причина отката:** [причина]

### Выполненные действия:

- [ ] Остановка сервисов
- [ ] Откат базы данных
- [ ] Удаление зависимостей
- [ ] Удаление файлов
- [ ] Откат переменных окружения
- [ ] Проверка функциональности

### Проблемы при откате:

[описание проблем]

### Статус после отката:

- Приложение: [работает/не работает]
- База данных: [восстановлена/проблемы]
- Функциональность: [полная/частичная/нет]

**Ответственный за откат:** [имя]
```

---

**ВАЖНО:** После успешного отката обязательно обновите документацию и уведомите команду о завершении процедуры.
