/**
 * lib/prisma.ts — Prisma client singleton (Prisma 7 driver-adapter based).
 *
 * Prisma 7's default client requires a driver adapter. We use the libSQL
 * adapter, which speaks SQLite: it works with a local `file:` database in
 * development and with a hosted Turso (`libsql://…`) database in production —
 * same code, only the DATABASE_URL (and optional auth token) differ.
 *
 * A single client is reused across hot reloads / serverless invocations.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN; // required for remote Turso
  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
