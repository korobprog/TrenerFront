@echo off
echo Создание и применение миграции для моделей мок-собеседований...
npx prisma migrate dev --name add_mock_interviews

echo.
echo Проверка статуса миграций...
npx prisma migrate status

echo.
echo Перезапуск приложения...
npm run dev