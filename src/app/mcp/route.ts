import { createPublicMcpEndpoint } from "@/lib/public-mcp.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = createPublicMcpEndpoint(process.env.SITE_URL);

export function POST(request: Request) {
  return endpoint.fetch(request);
}
export function GET(request: Request) {
  return endpoint.fetch(request);
}
export function DELETE(request: Request) {
  return endpoint.fetch(request);
}
