import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { PublishingIntegrationError } from "@/lib/publishing/errors";

const blockedV4 = ["0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4"].map((value) => ipaddr.parseCIDR(value));
const blockedV6 = ["::/128", "::1/128", "64:ff9b::/96", "64:ff9b:1::/48", "100::/64", "2001::/32", "2001:2::/48", "2001:db8::/32", "2001:10::/28", "2002::/16", "fc00::/7", "fe80::/10", "ff00::/8"].map((value) => ipaddr.parseCIDR(value));

export function isBlockedWordPressAddress(address: string) {
  try {
    let parsed = ipaddr.parse(address);
    if (parsed.kind() === "ipv6") {
      const ipv6 = parsed as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) parsed = ipv6.toIPv4Address();
    }
    const ranges = parsed.kind() === "ipv4" ? blockedV4 : blockedV6;
    return ranges.some((range) => parsed.match(range));
  } catch { return true; }
}

export function validateWordPressHostname(hostname: string) {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  if (lower === "localhost" || [".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid"].some((suffix) => lower.endsWith(suffix)) || lower === "metadata.google.internal") {
    throw new PublishingIntegrationError("private_wordpress_url", "Only public WordPress website domains can be connected.", 400);
  }
  if (isIP(lower)) {
    const message = isBlockedWordPressAddress(lower) ? "Private and reserved addresses cannot be connected." : "Use a public domain name rather than an IP address.";
    throw new PublishingIntegrationError("private_wordpress_url", message, 400);
  }
}

export async function resolveWordPressPublicAddresses(hostname: string): Promise<LookupAddress[]> {
  validateWordPressHostname(hostname);
  let records: LookupAddress[];
  try { records = await lookup(hostname, { all: true, verbatim: true }); }
  catch { throw new PublishingIntegrationError("wordpress_dns_failed", "The WordPress website domain could not be resolved.", 502); }
  if (!records.length || records.some((record) => isBlockedWordPressAddress(record.address))) {
    throw new PublishingIntegrationError("private_wordpress_url", "The WordPress website resolves to a private or reserved address.", 400);
  }
  return records;
}
