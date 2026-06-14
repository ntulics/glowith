import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SERVER_CAPACITY_BYTES = 128 * 1024 * 1024 * 1024; // 128 GB provisioned on thutong-server

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<Array<{ db_bytes: bigint; server_used_bytes: bigint }>>`
    SELECT
      pg_database_size(current_database()) AS db_bytes,
      (SELECT sum(pg_database_size(datname)) FROM pg_database WHERE datname NOT IN ('azure_maintenance','azure_sys','template0','template1')) AS server_used_bytes
  `;

  const dbBytes = Number(rows[0].db_bytes);
  const serverUsedBytes = Number(rows[0].server_used_bytes);
  const remainingBytes = SERVER_CAPACITY_BYTES - serverUsedBytes;

  function fmt(bytes: number) {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return NextResponse.json({
    glowithDb: { bytes: dbBytes, formatted: fmt(dbBytes) },
    serverUsed: { bytes: serverUsedBytes, formatted: fmt(serverUsedBytes) },
    serverCapacity: { bytes: SERVER_CAPACITY_BYTES, formatted: fmt(SERVER_CAPACITY_BYTES) },
    serverRemaining: { bytes: remainingBytes, formatted: fmt(remainingBytes) },
    usagePercent: Math.round((serverUsedBytes / SERVER_CAPACITY_BYTES) * 100),
  });
}
