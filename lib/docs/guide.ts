import { apiEndpoints } from "@/lib/api/docs";

// Dependency-free modern PDF builder for the KWL-NEXUS App Integration Guide.
// Emitted to public/ + docs/ via a temp test script (no runtime route).
// Pure ASCII (WinAnsi Helvetica); byte-accurate xref table.

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

export function buildGuidePdf(): string {
  const W = 612;
  const H = 792;
  const M = 64;
  const B = 64;

  const flow: Item[] = [
    { text: "KWL-NEXUS", size: 13, bold: true, h: 24, color: PRIMARY, bg: false },
    { text: "App Integration Guide", size: 30, bold: true, h: 40, color: INK, bg: false },
    { text: "For new app developers", size: 15, bold: false, h: 24, color: GRAY, bg: false },
    { text: "Connect reports, tutorials, catalog and plans. Version 2.0.", size: 11, bold: false, h: 30, color: GRAY, bg: false },
    title("1. Connect your app (admin + developer)"),
    body("Step 1 - Admin imports the repo, picks a release, saves details, Publishes."),
    body("Note the app slug, e.g. kaziweblab-oss-kwl-video-downloader.", 24),
    body("Step 2 - Admin creates an API key scoped to that app, copies it once,", 24),
    body("and delivers it over a secure channel only (never plain chat).", 24),
    body("Step 3 - Developer configures baseUrl + apiKey + appId in the app.", 24),
    body("Step 4 - App pings POST /api/apps/<id>/ping on startup and syncs.", 24),
    title("2. Authentication, scope and limits"),
    body("Header: x-api-key: kn_live_...  (Authorization: Bearer also works)", 24),
    body("One key = one app: scoped keys work only for their app (403 otherwise).", 24),
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
    body("and retry later - never lose a user report.", 24),
    body("Replies: poll GET /api/feedback (on Help open) and render adminReply", 24),
    body("and status (pending / replied / resolved / ignored) to the user."),
    title("4. Features + tutorial sync"),
    body("POST /api/apps/<id>/features with { features: [...] } (max 50).", 24),
    body("Replace semantics: what the app sends becomes the master list.", 24),
    body("PUT /api/admin/apps/<id>/tutorial with videoUrl/sections (same auth).", 24),
    body("The tutorial video doubles as the storefront preview video.", 24),
    body("Push on install/update; GET the current list first to compare.", 24),
    body("Tutorial API - GET /api/apps/<id>/tutorial is public (no key).", 24),
    body("Cache on device, show cached copy offline, refresh when online."),
    title("5. Endpoint reference"),
    ...apiEndpoints.map(
      (e): Item => ({ text: `${e.method}  ${e.path}  -  ${e.description}`, size: 9.5, bold: false, h: 17, color: INK, bg: false }),
    ),
    title("6. Keys, leaks and support"),
    body("Lost/leaked key? Admin revokes it and generates a new one in seconds:", 24),
    body("Admin panel > Settings > Project integrations > API keys.", 24),
    body("Full interactive docs: <domain>/docs (admin) + test console.", 24),
    body("Machine-readable spec: /api/docs/openapi and /api/docs/postman."),
  ];

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
