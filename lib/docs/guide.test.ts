/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";
import { buildGuidePdf } from "@/lib/docs/guide";

test("guide pdf is valid and emitted to public + docs", () => {
  const pdf = buildGuidePdf();
  const buf = Buffer.from(pdf, "utf8");
  const text = buf.toString("utf8");
  expect(text.startsWith("%PDF-1.4")).toBe(true);
  expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  const count = Number(/\/Count (\d+)/.exec(text)?.[1]);
  const pages = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
  expect(count).toBe(pages);
  expect(count).toBeGreaterThan(1);
  const xrefAt = Number(/startxref\n(\d+)/.exec(text)?.[1]);
  expect(buf.slice(xrefAt, xrefAt + 4).toString()).toBe("xref");
  for (const m of Array.from(text.matchAll(/(\d{10}) 00000 n /g))) {
    const off = Number(m[1]);
    if (off === 0) continue;
    expect(buf.slice(off, off + 20).toString()).toMatch(/^\d+ 0 obj/);
  }
  for (const needle of ["Integration Guide", "/api/feedback", "x-api-key", "ping", "One key = one app"]) {
    expect(text).toContain(needle);
  }
  expect(/[\u0080-\uFFFF]/.test(text)).toBe(false);
  for (const dest of ["public/kwl-nexus-integration-guide.pdf", "docs/kwl-nexus-integration-guide.pdf"]) {
    const out = path.join(process.cwd(), dest);
    fs.writeFileSync(out, buf);
  }
});
