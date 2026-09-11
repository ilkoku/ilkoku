import "server-only";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizedOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function browserOrigin(request: Request) {
  return normalizedOrigin(request.headers.get("origin"))
    ?? normalizedOrigin(request.headers.get("referer"));
}

function forwardedOrigin(request: Request) {
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
  if (!host) return null;

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const requestProtocol = (() => {
    try {
      return new URL(request.url).protocol.replace(/:$/, "");
    } catch {
      return "https";
    }
  })();
  const protocol = forwardedProto ?? requestProtocol;
  return normalizedOrigin(`${protocol}://${host}`);
}

function allowedOrigins(request: Request) {
  const origins = new Set<string>();
  const requestOrigin = normalizedOrigin(request.url);
  if (requestOrigin) origins.add(requestOrigin);

  const configuredPublicOrigin = normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredPublicOrigin) origins.add(configuredPublicOrigin);

  const configuredServerOrigin = normalizedOrigin(process.env.SITE_URL);
  if (configuredServerOrigin) origins.add(configuredServerOrigin);

  const proxyOrigin = forwardedOrigin(request);
  if (proxyOrigin) origins.add(proxyOrigin);

  return origins;
}

export function isSameOriginRequest(request: Request) {
  const suppliedBrowserOrigin = browserOrigin(request);
  if (!suppliedBrowserOrigin) return false;
  return allowedOrigins(request).has(suppliedBrowserOrigin);
}

export function sameOriginRequestUrl(request: Request, path: string) {
  const suppliedBrowserOrigin = browserOrigin(request);
  if (suppliedBrowserOrigin && allowedOrigins(request).has(suppliedBrowserOrigin)) {
    return new URL(path, `${suppliedBrowserOrigin}/`);
  }

  const fallbackOrigin = normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    ?? normalizedOrigin(process.env.SITE_URL)
    ?? forwardedOrigin(request)
    ?? normalizedOrigin(request.url);

  if (!fallbackOrigin) throw new Error("Request origin could not be resolved");
  return new URL(path, `${fallbackOrigin}/`);
}
