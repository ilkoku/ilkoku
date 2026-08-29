import { NextResponse } from "next/server";

import { provisionDemoCore } from "@/features/demo-showcase/core-provision";
import { provisionDemoShowcase } from "@/features/demo-showcase/provision";
import { getScopedDemoShowcaseStatus } from "@/features/demo-showcase/status";
import { provisionDemoWriterLevels } from "@/features/demo-showcase/writer-levels";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const token = request.headers.get("x-demo-core-ci-token");
  if (!process.env.DEMO_CORE_CI_TOKEN || token !== process.env.DEMO_CORE_CI_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let admin = await prisma.user.findUnique({
    where: { email: "demo-core-ci-admin@ilkoku.com" },
    select: { id: true },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "demo-core-ci-admin@ilkoku.com",
        emailVerified: new Date(),
        fullName: "Demo Core CI Admin",
        passwordHash: "ci-only-not-a-login-hash",
        publicId: "IKO-U-2099-999999",
        role: "admin",
        status: "active",
        termsAcceptedAt: new Date(),
        username: "demo-core-ci-admin",
      },
      select: { id: true },
    });
  }

  const password = "IlkOkuDemo-CI-2026!9";

  try {
    const core = await provisionDemoCore({ actorId: admin.id, password });
    await provisionDemoShowcase({ actorId: admin.id, password });
    await provisionDemoWriterLevels({ actorId: admin.id, password });
    const status = await getScopedDemoShowcaseStatus();

    return NextResponse.json({ core, status });
  } catch (error) {
    console.error("DEMO_CORE_CI_PROBE_FAILED", error);
    return NextResponse.json(
      {
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "UNKNOWN")
            : "UNKNOWN",
        message: error instanceof Error ? error.message : String(error),
        ok: false,
      },
      { status: 500 },
    );
  }
}
