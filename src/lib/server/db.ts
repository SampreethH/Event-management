import "server-only";
import { PrismaClient, type Prisma, type Role } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Prisma.TransactionClient;

/**
 * Superusers and BYPASSRLS roles skip row-level security entirely. When the
 * connection user is privileged (common on managed Postgres), APP_DB_ROLE names
 * a restricted role to drop into for every scoped transaction, so RLS always applies.
 */
const APP_DB_ROLE = process.env.APP_DB_ROLE;
if (APP_DB_ROLE && !/^[a-z_][a-z0-9_]*$/.test(APP_DB_ROLE)) throw new Error("APP_DB_ROLE must be a plain Postgres identifier");

async function scoped<T>(userId: string, role: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Identifier validated above; SET can't take a bind parameter.
    if (APP_DB_ROLE) await tx.$executeRawUnsafe(`SET LOCAL ROLE "${APP_DB_ROLE}"`);
    // `true` = transaction-local, so the setting can't leak across pooled connections.
    await tx.$queryRaw`SELECT set_config('app.user_id', ${userId}, true), set_config('app.role', ${role}, true)`;
    return fn(tx);
  });
}

/** Run queries as a signed-in user. Postgres RLS (prisma/sql/rls.sql) enforces ownership. */
export function withUser<T>(user: { id: string; role: Role }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return scoped(user.id, user.role, fn);
}

/** Trusted server context: webhooks, OTP login, split-pay token resolution. Keep usage narrow. */
export function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return scoped("", "SYSTEM", fn);
}
