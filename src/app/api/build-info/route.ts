import { runtimeInfrastructureManifest } from "@/features/system-map/runtime-manifest.generated";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      commitSha: runtimeInfrastructureManifest.buildIdentity.commitSha,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
