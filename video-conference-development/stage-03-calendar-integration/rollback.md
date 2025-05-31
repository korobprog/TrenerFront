# Инструкции для отката этапа 3

## Процедура отката

В случае необходимости отката изменений этапа 3:

### 1. Отключение календарной интеграции

```bash
# Остановить календарные сервисы
pm2 stop calendar-sync
# Отключить webhook уведомления
curl -X DELETE https://api.google.com/calendar/webhooks
```

### 2. Восстановление базы данных

```bash
# Восстановить из резервной копии
./backups/restore-script.sh stage-03-backup
```

### 3. Откат календарных компонентов

```bash
# Удалить календарные компоненты
rm -rf components/calendar/
rm -rf pages/api/calendar/
rm -rf lib/google-calendar/
```

### 4. Восстановление конфигурации

```bash
# Восстановить Google API конфигурацию
git checkout HEAD~1 -- .env.local
# Восстановить календарные настройки
git checkout HEAD~1 -- calendar.config.js
```

## Контрольные точки

- Резервная копия перед календарной интеграцией
- Снимок состояния без календаря
- Google API credentials backup

## Проверка после отката

- [ ] Видеоконференции работают без календаря
- [ ] Нет ошибок Google API
- [ ] Базовая функциональность сохранена
- [ ] Webhook уведомления отключены
