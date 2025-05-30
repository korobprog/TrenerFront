# 🚨 Next.js Troubleshooting - Быстрое решение проблем

## Проблема: Сервер зависает на "Starting..."

### ⚡ Быстрое решение (1 команда)

```bash
npm run dev:fix
```

### 🔧 Ручное решение

```bash
# 1. Остановить процессы
pkill -f "next"

# 2. Очистить кеш
npm run cache:clear

# 3. Переустановить зависимости (если нужно)
npm run deps:reinstall

# 4. Запустить сервер
npm run dev
```

### 📋 Доступные команды

- `npm run dev:fix` - Автоматическое исправление проблем
- `npm run dev:clean` - Запуск с очисткой кеша
- `npm run cache:clear` - Очистка кеша Next.js
- `npm run deps:reinstall` - Переустановка зависимостей

### 📚 Подробная документация

См. [`docs/nextjs-server-startup-fix.md`](docs/nextjs-server-startup-fix.md)

### 🆘 Если ничего не помогает

1. Проверьте версии: `node --version` (>= 18.0.0)
2. Проверьте порты: `netstat -tlnp | grep :3000`
3. Запустите с отладкой: `DEBUG=next:* npm run dev`
4. Обратитесь к документации в `docs/`

---

**Последнее обновление**: 30.05.2025
