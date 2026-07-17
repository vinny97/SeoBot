const allowedPrefixes = ["/app","/onboarding","/update-password"];

export function safeRelativePath(value: string | null | undefined, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value,"http://local.invalid");
    if (parsed.origin !== "http://local.invalid" || !allowedPrefixes.some(prefix => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { return fallback; }
}

export function requestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/,"");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost)) return `${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}`;
  return new URL(request.url).origin;
}
