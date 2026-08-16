import {
  createHash,
} from "node:crypto";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import {
  redeemEmailVerification,
} from "@/features/auth/email-verification-state";

function redirectResult(
  request: NextRequest,
  status:
    | "baglanti-gecersiz"
    | "email-dogrulandi",
) {
  const destination =
    request.nextUrl.clone();

  destination.pathname =
    "/giris";

  destination.search = "";

  destination.searchParams.set(
    "durum",
    status,
  );

  return NextResponse.redirect(
    destination,
  );
}

export async function GET(
  request: NextRequest,
) {
  const token =
    request.nextUrl.searchParams
      .get("token")
      ?.trim();

  if (!token) {
    return redirectResult(
      request,
      "baglanti-gecersiz",
    );
  }

  const tokenHash =
    createHash("sha256")
      .update(token)
      .digest("hex");

  try {
    const result =
      await redeemEmailVerification({
        tokenHash,
      });

    if (result.status !== "verified") {
      return redirectResult(
        request,
        "baglanti-gecersiz",
      );
    }
  } catch {
    return redirectResult(
      request,
      "baglanti-gecersiz",
    );
  }

  return redirectResult(
    request,
    "email-dogrulandi",
  );
}
