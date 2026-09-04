import { detectPlatform, githubFetch } from "./client";

test.each([["release.apk", "Android"], ["setup.exe", "Windows"], ["package.deb", "Linux"], ["notes.txt", "Other"]])("detects %s as %s", (filename, platform) => {
  expect(detectPlatform(filename)).toBe(platform);
});

test("githubFetch sends the expected authentication headers", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) }) as jest.Mock;
  await githubFetch("/user/repos", "token");
  expect(fetch).toHaveBeenCalledWith("https://api.github.com/user/repos", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token" }) }));
});
