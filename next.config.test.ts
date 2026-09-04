import nextConfig from "./next.config";

test("configures baseline security headers", async () => {
  const headers = await nextConfig.headers();
  const names = headers[0].headers.map((header: { key: string }) => header.key);
  expect(names).toEqual(expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]));
});
