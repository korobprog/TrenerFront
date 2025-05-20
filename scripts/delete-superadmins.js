// Скрипт для удаления всех супер-администраторов
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteSuperAdmins() {
  try {
    // Находим всех пользователей с ролью superadmin
    const superAdmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
    });

    if (superAdmins.length === 0) {
      console.log('Супер-администраторы не найдены');
      return;
    }

    // Удаляем всех супер-администраторов
    for (const admin of superAdmins) {
      await prisma.user.delete({
        where: { id: admin.id },
      });
      console.log(`Удален супер-администратор: ${admin.email}`);
    }

    console.log(`Всего удалено супер-администраторов: ${superAdmins.length}`);
  } catch (error) {
    console.error('Ошибка при удалении супер-администраторов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Вызываем функцию удаления супер-администраторов
deleteSuperAdmins().catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
});
