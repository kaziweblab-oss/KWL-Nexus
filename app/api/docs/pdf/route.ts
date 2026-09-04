const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 169>>stream
BT /F1 20 Tf 72 720 Td (KWL-NEXUS API Documentation) Tj /F1 11 Tf 0 -36 Td (Use the x-api-key header. Rate limit: 1000 requests per hour.) Tj 0 -24 Td (See the online documentation for endpoint parameters and examples.) Tj ET
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;

// A dependency-free printable PDF starter keeps documentation downloadable in every environment.
export function GET() {
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=kwl-nexus-api.pdf" } });
}
