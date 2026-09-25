import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Configure SQLite for WAL mode and foreign keys
export async function initializeDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    console.log('[DB] SQLite WAL mode and foreign keys enabled');
  } catch (error) {
    console.warn('[DB] Failed to configure PRAGMAs:', error);
  }
}
