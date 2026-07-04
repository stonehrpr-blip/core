// Singleton Prisma client.
//
// Why a singleton: Next.js hot-reloads modules in dev and serverless functions
// spin up fresh contexts on every request in production. Without this pattern
// each route creates a new PrismaClient → exhausts the database connection pool.
// We attach to globalThis so HMR reuses the same instance.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
