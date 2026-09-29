import { apiEndpoints } from "@/lib/api/docs";

// Dependency-free multi-page PDF: KWL-NEXUS App Integration Guide for new app developers.
// Tiny in-file PDF writer with a correct xref table; no external packages.

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

type Item = { text: string; size: number; bold: boolean; h: number };

function buildPdf(): string {
  const W = 612;
  const H = 792;
  const M = 64;
  const B = 64;

  const flow: Item[] = [
    { text: "KWL-NEXUS", size: 13, bold: true, h: 22 },
    { text: "App Integration Guide (for new app developers)", size: 20, bold: true, h: 30 },
    { text: "Connect reports, tutorials, catalog and plans. Version 1.0.", size: 11, bold: false, h: 26 },
    { text: "1. Connect your app in 4 steps", size: 14, bold: true, h: 26 },
    { text: "Step 1 - Ask the Nexus admin for two things: (a) an API key", size: 11, bold: false, h: 15 },
    { text: "(starts with kn_live_) and (b) your appId (Mongo ObjectId).", size: 11, bold: false, h: 21 },
    { text: "Step 2 - Send the key on every request in the x-api-key header.", size: 11, bold: false, h: 21 },
    { text: "Step 3 - Implement Reports (section 3) so users can send feedback.", size: 11, bold: false, h: 21 },
    { text: "Step 4 - Implement Help/Tutorial (section 4) using cached content.", size: 11, bold: false, h: 21 },
    { text: "Base URL is your Nexus domain, e.g. https://kwl-nexus.onrender.com", size: 11, bold: false, h: 15 },
    { text: "Keep the API key secret: ship it as a build secret, never in chat.", size: 11, bold: false, h: 11 },
    { text: "2. Authentication and limits", size: 14, bold: true, h: 26 },
    { text: "Header: x-api-key: kn_live_...  (Authorization: Bearer also works)", size: 11, bold: false, h: 21 },
    { text: "Rate limit: 1000 requests per hour per key (shared by all installs).", size: 11, bold: false, h: 21 },
    { text: "401 = missing/invalid/revoked key. 429 = slow down and retry later.", size: 11, bold: false, h: 21 },
    { text: "404 on /apps/<id>/... usually means a wrong appId or unpublished app.", size: 11, bold: false, h: 11 },
    { text: "3. Reports API - POST /api/feedback", size: 14, bold: true, h: 26 },
    { text: "Send user reports (errors, suggestions, feature requests, ratings).", size: 11, bold: false, h: 21 },
    { text: "Required: appId, type, title (3-160 chars), description (5-5000).", size: 11, bold: false, h: 15 },
    { text: "type is one of: bug_report | suggestion | feature_request | rating", size: 11, bold: false, h: 15 },
    { text: "Optional: link (problem URL, max 2000), contactEmail, rating 1-5,", size: 11, bold: false, h: 15 },
    { text: "screenshot (base64/text, max about 1.5MB).", size: 11, bold: false, h: 21 },
    { text: 'Example: {"appId":"<ObjectId>","type":"bug_report",', size: 10, bold: false, h: 14 },
    { text: '"title":"Crash on export","description":"Steps: ...",', size: 10, bold: false, h: 14 },
    { text: '"link":"https://...","contactEmail":"user@mail.com"}', size: 10, bold: false, h: 21 },
    { text: "201 returns { data: { id, status } }. Anything else: queue locally", size: 11, bold: false, h: 15 },
    { text: "and retry later - never lose a user report.", size: 11, bold: false, h: 11 },
    { text: "4. Tutorial API - GET /api/apps/<id>/tutorial", size: 14, bold: true, h: 26 },
    { text: "Public endpoint (no key needed). Powers the in-app Help view.", size: 11, bold: false, h: 21 },
    { text: "Response data: title, description, videoUrl/videoType (optional),", size: 11, bold: false, h: 15 },
    { text: "sections: [{ heading, bodyMarkdown }] (optional), appName, appSlug.", size: 11, bold: false, h: 21 },
    { text: "Cache the response on device and show the cached copy offline.", size: 11, bold: false, h: 15 },
    { text: "Refresh in background when online. 404 = no tutorial published yet.", size: 11, bold: false, h: 11 },
    { text: "5. Endpoint reference", size: 14, bold: true, h: 26 },
    ...apiEndpoints.map((e): Item => ({ text: `${e.method}  ${e.path}  -  ${e.description}`, size: 9.5, bold: false, h: 14.5 })),
    { text: "6. Support", size: 14, bold: true, h: 26 },
    { text: "Lost key? The admin revokes it and generates a new one in seconds:", size: 11, bold: false, h: 15 },
    { text: "Admin panel > Settings > Project integrations > API keys.", size: 11, bold: false, h: 21 },
    { text: "Full interactive docs: <domain>/docs (admin) + test console.", size: 11, bold: false, h: 15 },
    { text: "Machine-readable spec: /api/docs/openapi and /api/docs/postman.", size: 11, bold: false, h: 11 },
  ];

  // Paginate.
  const pages: Item[][] = [];
  let cur: Item[] = [];
  let y = H - 96;
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

  // Object numbers: 1 Catalog, 2 Pages, 3 Helvetica, 4 Helvetica-Bold,
  // then per page: 5,7,9... page dicts and 6,8,10... content streams.
  const kidRefs: string[] = pages.map((_, pi) => `${5 + pi * 2} 0 R`);

  // Simpler: construct final object list directly.
  const finalObjs: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${kidRefs.join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  for (let pi = 0; pi < pages.length; pi++) {
    const pNo = 5 + pi * 2;
    const cNo = pNo + 1;
    finalObjs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cNo} 0 R >>`,
    );
    let yy = pi === 0 ? H - 96 : H - 72;
    let ops = "BT";
    for (const item of pages[pi]) {
      const font = item.bold ? "/F2" : "/F1";
      ops += ` ${font} ${item.size} Tf 1 0 0 1 ${M} ${yy.toFixed(1)} Tm (${esc(item.text)}) Tj`;
      yy -= item.h;
    }
    ops += ` /F1 9 Tf 1 0 0 1 ${M} 36 Tm (Page ${pi + 1} of ${pages.length}) Tj ET`;
    finalObjs.push(`<< /Length ${Buffer.byteLength(ops, "utf8")} >>\nstream\n${ops}\nendstream`);
  }

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  finalObjs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "utf8"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
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
