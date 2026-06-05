import { PrismaClient } from "@prisma/client";

// Make Postgres BIGINT (Prisma BigInt) values JSON-serializable. Our values are
// well within Number.MAX_SAFE_INTEGER, so Number() is safe.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
