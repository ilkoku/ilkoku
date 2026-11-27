import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const origin = "https://ilkoku.com";
const publicPaths = [
  "/", "/hakkimizda", "/nasil-calisir", "/editoryal-standartlar",
  "/yazarlar-icin", "/okurlar-icin", "/editorler-icin", "/yayinevleri-icin",
  "/iletisim", "/yasal/kullanim-sartlari", "/yasal/gizlilik-politikasi",
  "/yasal/kvkk", "/llms.txt", "/agent/home.md",
];
const config = {
  inputSchema: z.strictObject({}),
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};
const result = (value) => ({ content: [{ type: "text", text: JSON.stringify(value) }] });

// The factory has no database, network, user-session, cookie or credential access.
export function createPublicMcpServer() {
  const server = new McpServer({ name: "ilkoku-public", version: "1.0.0" });
  server.registerTool("ilkoku_get_platform_info", {
    ...config,
    description: "Public purpose and user roles of İlkOku, the Turkish digital writing platform.",
  }, async () => result({
    name: "İlkOku",
    description: "Yazarları, okurları, editörleri ve yayınevlerini buluşturan dijital platform",
    roles: ["yazar", "okur", "editör", "yayınevi"],
    language: "tr-TR",
    url: origin + "/",
  }));
  server.registerTool("ilkoku_list_public_resources", {
    ...config,
    description: "Official public information, guidance, legal and agent resource links.",
  }, async () => result({ resources: publicPaths.map(path => origin + path) }));
  return server;
}

// The SDK owns JSON-RPC and version handling.
export function createPublicMcpHandler() {
  return createMcpHandler(createPublicMcpServer, {
    legacy: "stateless",
    responseMode: "json",
    maxRequestBodySize: 8192,
    maxSubscriptions: 1,
  });
}


const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
function reject(status, message, extra = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...noStoreHeaders, "Content-Type": "application/json", ...extra },
  });
}

// The bare SDK fetch handler does not enforce Host/Origin itself.
// Permit only canonical production host; explicitly configured local CI may
// use loopback. Never derive authority from X-Forwarded-Host or Origin.
export function createPublicMcpEndpoint(localUrl) {
  const allowedHosts = new Set(["ilkoku.com"]);
  const allowedOrigins = new Set([origin]);
  try {
    const local = new URL(localUrl || "");
    if (["localhost", "127.0.0.1", "[::1]"].includes(local.hostname) &&
        local.protocol === "http:") {
      allowedHosts.add(local.host);
      allowedOrigins.add(local.origin);
    }
  } catch { /* production defaults remain strict */ }
  const handler = createPublicMcpHandler();
  return {
    close: () => handler.close(),
    async fetch(request) {
      const host = request.headers.get("host");
      const requestOrigin = request.headers.get("origin");
      if (!host || !allowedHosts.has(host.toLowerCase())) return reject(403, "Invalid Host");
      if (requestOrigin !== null && !allowedOrigins.has(requestOrigin)) return reject(403, "Invalid Origin");
      if (request.method !== "POST") return reject(405, "POST required", { Allow: "POST" });
      if (request.headers.has("content-encoding") &&
          request.headers.get("content-encoding") !== "identity") return reject(415, "Unsupported content encoding");
      const length = request.headers.get("content-length");
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > 8192)) return reject(413, "Request too large");
      // The SDK additionally enforces the actual body size for chunked requests.
      const response = await handler.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(noStoreHeaders)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    },
  };
}
