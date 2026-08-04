import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const destination = request.nextUrl.clone();
  destination.pathname = "/giris";
  destination.search = "";
  destination.searchParams.set("durum", "baglanti-gecersiz");

  return NextResponse.redirect(destination);
}
