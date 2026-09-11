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

export function isSameOriginRequest(request: Request) {
  const suppliedOrigin = normalizedOrigin(request.headers.get("origin"));
  const suppliedRefererOrigin = normalizedOrigin(request.headers.get("referer"));
  const browserOrigin = suppliedOrigin ?? suppliedRefererOrigin;
  if (!browserOrigin) return false;

  const allowedOrigins = new Set<string>();
  const requestOrigin = normalizedOrigin(request.url);
  if (requestOrigin) allowedOrigins.add(requestOrigin);

  const configuredPublicOrigin = normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredPublicOrigin) allowedOrigins.add(configuredPublicOrigin);

  const configuredServerOrigin = normalizedOrigin(process.env.SITE_URL);
  if (configuredServerOrigin) allowedOrigins.add(configuredServerOrigin);

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const requestProtocol = (() => {
    try {
      return new URL(request.url).protocol.replace(/:$/, "");
    } catch {
      return "https";
    }
  })();
  const protocol = forwardedProto ?? requestProtocol;

  if (host) {
    const forwardedOrigin = normalizedOrigin(`${protocol}://${host}`);
    if (forwardedOrigin) allowedOrigins.add(forwardedOrigin);
  }

  return allowedOrigins.has(browserOrigin);
}
