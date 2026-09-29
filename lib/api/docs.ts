export const apiEndpoints = [
  { method: "GET", path: "/api/apps", description: "List published apps." },
  { method: "GET", path: "/api/apps/[id]", description: "Get one published app by id or slug." },
  { method: "GET", path: "/api/apps/[id]/plans", description: "List active plans for an app." },
  { method: "GET", path: "/api/apps/popular", description: "List most popular apps." },
  { method: "GET", path: "/api/apps/new-releases", description: "List latest new releases." },
  { method: "GET", path: "/api/public/apps", description: "Public app directory (no auth)." },
  { method: "GET", path: "/api/apps/[id]/tutorial", description: "Get tutorial for an app." },
  { method: "GET", path: "/api/payment/methods", description: "List active payment methods (filtered HEALTHY)." },
  { method: "POST", path: "/api/payment/request", description: "Create a pending payment request." },
  { method: "GET", path: "/api/payment/status/[id]", description: "Read the authenticated payment status." },
  { method: "GET", path: "/api/payment/history", description: "List authenticated payment history." },
  { method: "GET", path: "/api/user/profile", description: "Read the authenticated user profile." },
  { method: "GET", path: "/api/user/subscriptions", description: "List the authenticated user's subscriptions." },
  { method: "POST", path: "/api/feedback", description: "Submit a user report (bug/suggestion/feature/rating)." },
  { method: "GET", path: "/api/feedback", description: "List the authenticated user's feedback." },
  { method: "GET", path: "/api/system-config", description: "Get public branding & system config." },
  { method: "GET", path: "/api/update-guidelines", description: "Get latest update guidelines." },
  { method: "GET", path: "/api/health", description: "Health check — keep-alive (no auth)." },
  { method: "GET", path: "/api/ping", description: "Ping — keep-alive alias (no auth)." },
];

export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "KWL-NEXUS API", version: "1.0.0", description: "App store APIs authenticated with an x-api-key header." },
  servers: [{ url: "http://localhost:3000" }],
  security: [{ ApiKeyAuth: [] }],
  components: { securitySchemes: { ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" } } },
  paths: Object.fromEntries(apiEndpoints.map((endpoint) => {
    const path = endpoint.path.replace(/\[id\]/g, "{id}");
    return [path, { [endpoint.method.toLowerCase()]: { summary: endpoint.description, responses: { "200": { description: "Successful response" }, "401": { description: "Authentication required" }, "429": { description: "Rate limit exceeded" } } } }];
  })),
};

export const postmanCollection = { info: { name: "KWL-NEXUS API", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" }, variable: [{ key: "baseUrl", value: "http://localhost:3000" }, { key: "apiKey", value: "" }], item: apiEndpoints.map((endpoint) => ({ name: endpoint.path, request: { method: endpoint.method, header: [{ key: "x-api-key", value: "{{apiKey}}" }], url: { raw: "{{baseUrl}}" + endpoint.path.replace("[id]", "YOUR_ID") } } })) };
