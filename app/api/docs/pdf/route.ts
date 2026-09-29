import { apiEndpoints } from "@/lib/api/docs";

// Always render fresh (never serve a stale prerendered copy).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dependency-free modern PDF: KWL-NEXUS App Integration Guide.
// Brand styling (indigo accents, cover page, code cards) with a correct xref table.

function esc(text: string) {
  const ascii = text
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
  return ascii.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const INK: [number, number, number] = [0.09, 0.09, 0.18];
const GRAY: [number, number, number] = [0.38, 0.38, 0.45];
const PRIMARY: [number, number, number] = [0.42, 0.39, 1.0];
const CARD_BG: [number, number, number] = [0.95, 0.95, 0.98];

type Item = { text: string; size: number; bold: boolean; h: number; color: [number, number, number]; bg: boolean };

const body = (text: string, h = 19): Item => ({ text, size: 11, bold: false, h, color: INK, bg: false });
const code = (text: string): Item => ({ text, size: 9.5, bold: false, h: 17, color: INK, bg: true });
const title = (text: string): Item => ({ text, size: 15, bold: true, h: 44, color: PRIMARY, bg: false });

function buildPdf(): string {
  const W = 612;
  const H = 792;
  const M = 64;
  const B = 64;

  const flow: Item[] = [
    { text: "KWL-NEXUS", size: 13, bold: true, h: 24, color: PRIMARY, bg: false },
    { text: "App Integration Guide", size: 30, bold: true, h: 40, color: INK, bg: false },
    { text: "For new app developers", size: 15, bold: false, h: 24, color: GRAY, bg: false },
    { text: "Connect reports, tutorials, catalog and plans. Version 1.0.", size: 11, bold: false, h: 30, color: GRAY, bg: false },
    title("1. Connect your app in 4 steps"),
    body("Step 1 - Ask the Nexus admin for two things: (a) an API key"),
    body("(starts with kn_live_) and (b) your appId (Mongo ObjectId).", 24),
    body("Step 2 - Send the key on every request in the x-api-key header.", 24),
    body("Step 3 - Implement Reports (section 3) so users can send feedback.", 24),
    body("Step 4 - Implement Help/Tutorial (section 4) using cached content.", 24),
    body("Base URL is your Nexus domain, e.g. https://kwl-nexus.onrender.com"),
    body("Keep the API key secret: ship it as a build secret, never in chat."),
    title("2. Authentication and limits"),
    body("Header: x-api-key: kn_live_...  (Authorization: Bearer also works)", 24),
    body("Rate limit: 1000 requests per hour per key (shared by all installs).", 24),
    body("401 = missing/invalid/revoked key. 429 = slow down and retry later.", 24),
    body("404 on /apps/<id>/... usually means a wrong appId or unpublished app."),
    title("3. Reports API - POST /api/feedback"),
    body("Send user reports (errors, suggestions, feature requests, ratings).", 24),
    body("Required: appId, type, title (3-160 chars), description (5-5000)."),
    body("type is one of: bug_report | suggestion | feature_request | rating"),
    body("Optional: link (problem URL, max 2000), contactEmail, rating 1-5,"),
    body("screenshot (base64/text, max about 1.5MB).", 24),
    code('Example: {"appId":"<ObjectId>","type":"bug_report",'),
    code('"title":"Crash on export","description":"Steps: ...",'),
    code('"link":"https://...","contactEmail":"user@mail.com"}'),
    body("201 returns { data: { id, status } }. Anything else: queue locally", 24),
    body("and retry later - never lose a user report."),
    title("4. Tutorial API - GET /api/apps/<id>/tutorial"),
    body("Public endpoint (no key needed). Powers the in-app Help view.", 24),
    body("Response data: title, description, videoUrl/videoType (optional),"),
    body("sections: [{ heading, bodyMarkdown }] (optional), appName, appSlug.", 24),
    body("Cache the response on device and show the cached copy offline."),
    body("Refresh in background when online. 404 = no tutorial published yet."),
    title("5. Endpoint reference"),
    ...apiEndpoints.map(
      (e): Item => ({ text: `${e.method}  ${e.path}  -  ${e.description}`, size: 9.5, bold: false, h: 17, color: INK, bg: false }),
    ),
    title("6. Support"),
    body("Lost key? The admin revokes it and generates a new one in seconds:"),
    body("Admin panel > Settings > Project integrations > API keys.", 24),
    body("Full interactive docs: <domain>/docs (admin) + test console."),
    body("Machine-readable spec: /api/docs/openapi and /api/docs/postman."),
  ];

  // Paginate with generous leading so nothing ever overlaps.
  const pages: Item[][] = [];
  let cur: Item[] = [];
  let y = H - 110;
  for (const item of flow) {
    if (y - item.h < B) {
      pages.push(cur);
      cur = [];
      y = H - 72;
    }
    cur.push(item);
    y -= item.h;
  }
  pages.push(cur);

  const col = (c: [number, number, number]) => `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)}`;

  // Object numbers: 1 Catalog, 2 Pages, 3 Helvetica, 4 Helvetica-Bold,
  // then per page: 5,7,9... dicts and 6,8,10... streams.
  const kidRefs = pages.map((_, pi) => `${5 + pi * 2} 0 R`);
  const finalObjs: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${kidRefs.join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((lines, pi) => {
    const cNo = 5 + pi * 2 + 1;
    finalObjs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cNo} 0 R >>`,
    );
    // Top accent bar + footer rule on every page.
    let ops = `${col(PRIMARY)} rg 0 ${H - 10} ${W} 10 re f ${col(PRIMARY)} rg ${M} 46 ${W - M * 2} 1.5 re f`;
    ops += ` 0.55 0.55 0.65 rg /F1 9 Tf 1 0 0 1 ${M} 30 Tm (KWL-NEXUS Integration Guide  -  Page ${pi + 1} of ${pages.length}) Tj`;
    ops += " BT";
    let yy = pi === 0 ? H - 110 : H - 72;
    for (const item of lines) {
      const top = yy;
      if (item.bg) {
        ops += ` ${col(CARD_BG)} rg ${M - 8} ${(top - item.h + 4).toFixed(1)} ${W - M * 2 + 16} ${(item.h - 2).toFixed(1)} re f`;
      }
      const font = item.bold ? "/F2" : "/F1";
      // Baseline sits ~72% down the line box: no ascender/descender collisions.
      const baseline = top - item.h + Math.max(4, item.h - item.size - 3);
      ops += ` ${col(item.color)} rg ${font} ${item.size} Tf 1 0 0 1 ${M} ${baseline.toFixed(1)} Tm (${esc(item.text)}) Tj`;
      yy -= item.h;
    }
    ops += " ET";
    finalObjs.push(`<< /Length ${Buffer.byteLength(ops, "utf8")} >>\nstream\n${ops}\nendstream`);
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  finalObjs.forEach((objBody, i) => {
    offsets.push(Buffer.byteLength(out, "utf8"));
    out += `${i + 1} 0 obj\n${objBody}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(out, "utf8");
  out += `xref\n0 ${finalObjs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${finalObjs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return out;
}

export function GET() {
  const pdf = buildPdf();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=kwl-nexus-integration-guide.pdf",
    },
  });
}
