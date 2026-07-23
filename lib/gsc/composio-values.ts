import type { GscProperty } from "./oauth.js";

type JsonRecord = Record<string, unknown>;
export type GscSearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walkRecords(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 6) return [];
  if (Array.isArray(value)) return value.flatMap((item) => walkRecords(item, depth + 1));
  if (!isRecord(value)) return [];
  return [value, ...Object.values(value).flatMap((item) => walkRecords(item, depth + 1))];
}

function stringValue(record: JsonRecord, keys: string[]) {
  for (const key of keys) if (typeof record[key] === "string" && record[key]) return record[key] as string;
  return null;
}

function numberValue(record: JsonRecord, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export function mapGscComposioStatus(status: string) {
  if (status === "ACTIVE") return "connected" as const;
  if (status === "EXPIRED" || status === "INACTIVE") return "needs_reauthentication" as const;
  if (status === "REVOKED") return "disconnected" as const;
  if (status === "FAILED") return "error" as const;
  return "pending" as const;
}

export function extractGscProperties(data: unknown): GscProperty[] {
  const allowed = new Set(["siteOwner", "siteFullUser", "siteRestrictedUser"]);
  const properties = walkRecords(data)
    .map((record) => ({ siteUrl: stringValue(record, ["siteUrl", "site_url"]), permissionLevel: stringValue(record, ["permissionLevel", "permission_level"]) }))
    .filter((item): item is GscProperty => Boolean(item.siteUrl && item.permissionLevel && allowed.has(item.permissionLevel)));
  return [...new Map(properties.map((item) => [item.siteUrl, item])).values()];
}

export function extractGscSearchRows(data: unknown): GscSearchRow[] {
  const container = walkRecords(data).find((record) => Array.isArray(record.rows));
  if (!container || !Array.isArray(container.rows)) return [];
  return container.rows.flatMap((value) => {
    if (!isRecord(value)) return [];
    const keys = Array.isArray(value.keys) ? value.keys.filter((key): key is string => typeof key === "string") : undefined;
    return [{ ...(keys ? { keys } : {}), clicks: numberValue(value, "clicks"), impressions: numberValue(value, "impressions"), ctr: numberValue(value, "ctr"), position: numberValue(value, "position") }];
  });
}
