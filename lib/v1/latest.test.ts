/** @jest-environment node */
import { compareVersions, resolveAsset } from "./latest";

test("compareVersions handles v-prefix and suffixes", () => {
  expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
  expect(compareVersions("1.2.3", "1.3.0")).toBe(-1);
  expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1);
  expect(compareVersions("1.2", "1.2.0")).toBe(0);
});

test("resolveAsset prefers exact platform+arch", () => {
  const assets = [
    { name: "a.apk", platform: "Android", arch: "arm64" },
    { name: "w-x64.exe", platform: "Windows", arch: "x64" },
    { name: "w-arm.exe", platform: "Windows", arch: "arm64" },
  ];
  expect(resolveAsset(assets, "windows", "arm64")?.name).toBe("w-arm.exe");
  expect(resolveAsset(assets, "windows", "mips")?.name).toBe("w-x64.exe");
  expect(resolveAsset(assets, "macos", null)).toBeNull();
  expect(resolveAsset([], "windows", null)).toBeNull();
});
