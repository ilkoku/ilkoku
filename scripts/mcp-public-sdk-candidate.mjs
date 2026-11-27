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

// Candidate only: not mounted as a public Next.js route until the SDK lockfile
// and protocol/security tests pass. The SDK owns JSON-RPC and version handling.
export function createPublicMcpHandler() {
  return createMcpHandler(createPublicMcpServer, {
    legacy: "stateless",
    responseMode: "json",
    maxRequestBodySize: 8192,
    maxSubscriptions: 1,
  });
}
