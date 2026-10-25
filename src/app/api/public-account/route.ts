import { NextResponse } from "next/server";

import { authContent } from "@/content";
import { getWorkspaceDestination } from "@/features/auth/data";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Vary: "Cookie",
} as const;

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json(
      { signedIn: false },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  const navigation = await getRoleNavigation(profile).catch((error) => {
    console.error("PUBLIC_ACCOUNT_NAVIGATION_LOOKUP_FAILED", error);

    return {
      hasPendingRequest: profile.role === "editor_pending",
      pendingRequest: null,
      workspaceHref: getWorkspaceDestination(profile.role),
    };
  });

  const pendingRole =
    navigation.pendingRequest?.requestedRole ??
    (profile.role === "editor_pending" ? "editor" : null);

  const pendingLabel = navigation.hasPendingRequest
    ? pendingRole
      ? `${authContent.roles[pendingRole]} başvurunuz inceleniyor`
      : "Başvurunuz inceleniyor"
    : null;

  return NextResponse.json(
    {
      signedIn: true,
      fullName: profile.fullName,
      roleLabel: authContent.roles[profile.role],
      workspaceHref: navigation.workspaceHref,
      pendingLabel,
    },
    { headers: PRIVATE_NO_STORE_HEADERS },
  );
}
