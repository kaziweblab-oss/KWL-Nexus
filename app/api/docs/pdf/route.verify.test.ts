/** @jest-environment node */
import { GET } from "./route";

test("pdf guide is a valid multi-page document", async () => {
  const res = GET();
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("application/pdf");
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString("utf8");
  expect(text.startsWith("%PDF-1.4")).toBe(true);
  expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  const count = Number(/\/Count (\d+)/.exec(text)?.[1]);
  const pages = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
  expect(count).toBe(pages);
  expect(count).toBeGreaterThan(1);
  // xref offsets are BYTE offsets — verify against raw bytes.
  const xrefAt = Number(/startxref\n(\d+)/.exec(text)?.[1]);
  expect(buf.slice(xrefAt, xrefAt + 4).toString()).toBe("xref");
  for (const m of text.matchAll(/(\d{10}) 00000 n /g)) {
    const off = Number(m[1]);
    if (off === 0) continue;
    expect(buf.slice(off, off + 20).toString()).toMatch(/^\d+ 0 obj/);
  }
  for (const needle of ["Integration Guide", "/api/feedback", "x-api-key", "/api/apps"]) {
    expect(text).toContain(needle);
  }
  // No multibyte chars: WinAnsi Helvetica would misrender them.
  expect(/[\u0080-\uFFFF]/.test(text)).toBe(false);
});
