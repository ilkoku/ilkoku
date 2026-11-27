import card from "@/lib/public-mcp-card.json";

export const dynamic = "force-static";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, follow",
};

export function GET() {
  return new Response(JSON.stringify(card), { headers });
}

export function HEAD() {
  return new Response(null, { headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}
