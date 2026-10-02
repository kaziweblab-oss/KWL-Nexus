import nextConfig from "./next.config";

test("configures baseline security headers", async () => {
  const headers = await nextConfig.headers();
  const global = headers.find((h: { source: string }) => h.source === "/(.*)");
  const names = global.headers.map((header: { key: string }) => header.key);
  expect(names).toEqual(expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]));
});

test("marks private APIs as no-store", async () => {
  const headers = await nextConfig.headers();
  for (const source of ["/api/payment/:path*", "/api/user/:path*", "/api/admin/:path*", "/api/auth/:path*"]) {
    const entry = headers.find((h: { source: string }) => h.source === source);
    expect(entry).toBeDefined();
    expect(entry.headers).toContainEqual({ key: "Cache-Control", value: "private, no-store" });
  }
});
