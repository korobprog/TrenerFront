import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Импортируем withPrisma из CommonJS модуля
const {
  withPrisma,
  withPrismaTimeout,
  checkPrismaConnection,
  cleanupConnections,
} = require('./prismaCommonJS');

export default prisma;
export {
  withPrisma,
  withPrismaTimeout,
  checkPrismaConnection,
  cleanupConnections,
};
