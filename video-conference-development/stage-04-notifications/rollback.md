# Инструкции для отката этапа 4

## Процедура отката

В случае необходимости отката изменений этапа 4:

### 1. Отключение системы уведомлений

```bash
# Остановить сервисы уведомлений
pm2 stop notification-service
# Отключить email сервис
pm2 stop email-service
```

### 2. Восстановление базы данных

```bash
# Восстановить из резервной копии
./backups/restore-script.sh stage-04-backup
```

### 3. Откат компонентов уведомлений

```bash
# Удалить компоненты уведомлений
rm -rf components/notifications/
rm -rf pages/api/notifications/
rm -rf lib/notifications/
rm -rf public/sw.js
```

### 4. Восстановление конфигурации

```bash
# Восстановить email конфигурацию
git checkout HEAD~1 -- .env.local
# Восстановить service worker
git checkout HEAD~1 -- next.config.js
```

## Контрольные точки

- Резервная копия перед добавлением уведомлений
- Снимок состояния без notification системы
- SMTP credentials backup

## Проверка после отката

- [ ] Система работает без уведомлений
- [ ] Нет ошибок email сервиса
- [ ] Push уведомления отключены
- [ ] Service worker удален
- [ ] Базовая функциональность сохранена
