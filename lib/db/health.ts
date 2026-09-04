import { performance } from "node:perf_hooks";
import type { Connection } from "mongoose";

export async function pingDatabase(connection: Connection) {
  const started = performance.now();
  await connection.db?.command({ ping: 1 });
  return Math.max(0, Math.round(performance.now() - started));
}

export async function getDatabaseStats(connection: Connection) {
  const stats = await connection.db?.command({ dbStats: 1 });
  return { storageBytes: Number(stats?.storageSize ?? 0), usedBytes: Number(stats?.dataSize ?? 0) + Number(stats?.indexSize ?? 0), collectionCount: Number(stats?.collections ?? 0) };
}