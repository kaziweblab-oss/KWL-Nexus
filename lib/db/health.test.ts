import { getDatabaseStats, pingDatabase } from "./health";

describe("database health helpers", () => {
  it("pings a database and returns integer latency", async () => {
    const command = jest.fn().mockResolvedValue({ ok: 1 });
    const latency = await pingDatabase({ db: { command } } as never);
    expect(command).toHaveBeenCalledWith({ ping: 1 });
    expect(Number.isInteger(latency)).toBe(true);
    expect(latency).toBeGreaterThanOrEqual(0);
  });

  it("maps dbStats to sanitized storage metrics", async () => {
    const command = jest.fn().mockResolvedValue({ storageSize: 120, dataSize: 80, indexSize: 20, collections: 3 });
    await expect(getDatabaseStats({ db: { command } } as never)).resolves.toEqual({ storageBytes: 120, usedBytes: 100, collectionCount: 3 });
    expect(command).toHaveBeenCalledWith({ dbStats: 1 });
  });

  it("propagates ping failures for the API to handle", async () => {
    await expect(pingDatabase({ db: { command: jest.fn().mockRejectedValue(new Error("unreachable")) } } as never)).rejects.toThrow("unreachable");
  });
});
