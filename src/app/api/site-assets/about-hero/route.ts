export function GET(request: Request) {
  const heroUrl = new URL("/about/about-collaboration-hero.jpg?v=20260827-final", request.url);
  return Response.redirect(heroUrl, 307);
}
