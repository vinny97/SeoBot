type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walkRecords(value: unknown, depth = 0): RecordValue[] {
  if (depth > 6) return [];
  if (Array.isArray(value)) return value.flatMap((item) => walkRecords(item, depth + 1));
  if (!isRecord(value)) return [];
  return [value, ...Object.values(value).flatMap((item) => walkRecords(item, depth + 1))];
}

function stringValue(record: RecordValue | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stringArray(record: RecordValue | null | undefined, keys: string[]) {
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export function mapWixComposioStatus(status: string) {
  if (status === "ACTIVE") return "connected" as const;
  if (status === "EXPIRED" || status === "INACTIVE") return "needs_reauthentication" as const;
  if (status === "REVOKED") return "disconnected" as const;
  if (status === "FAILED") return "error" as const;
  return "pending" as const;
}

export function extractWixSite(data: unknown) {
  const records = walkRecords(data);
  const instance = records.find((item) => "instance_id" in item || "instanceId" in item) || null;
  const site = records.find((item) => "site_display_name" in item || "siteDisplayName" in item) || null;
  return {
    id: stringValue(instance, ["instance_id", "instanceId"]),
    name: stringValue(site, ["site_display_name", "siteDisplayName"]),
    url: stringValue(site, ["site_url", "siteUrl", "url"]),
    locale: stringValue(site, ["locale"]),
    permissions: stringArray(instance, ["permissions"]),
  };
}

export function extractWixRicosDocument(data: unknown): RecordValue | null {
  const records = walkRecords(data);
  for (const record of records) {
    if (isRecord(record.document) && Array.isArray(record.document.nodes)) return record.document;
  }
  return records.find((record) => Array.isArray(record.nodes) && isRecord(record.metadata)) || null;
}

function wixUrl(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (!isRecord(value)) return null;
  const base = stringValue(value, ["base"]);
  const path = stringValue(value, ["path"]);
  if (!base) return null;
  try {
    return new URL(path || "/", base).toString();
  } catch {
    return null;
  }
}

export function extractWixDraft(data: unknown) {
  const records = walkRecords(data);
  const draft = records.find((item) =>
    ("memberId" in item || "member_id" in item) &&
    ("title" in item || "richContent" in item || "rich_content" in item),
  ) || null;
  const status = stringValue(draft, ["status"]);
  return {
    id: stringValue(draft, ["id", "_id", "draftPostId", "draft_post_id"]),
    url: wixUrl(draft?.url),
    published: status === "PUBLISHED" || Boolean(draft?.firstPublishedDate || draft?.first_published_date),
  };
}

export function extractWixAuthorMemberId(data: unknown) {
  for (const record of walkRecords(data)) {
    const memberId = stringValue(record, ["memberId", "member_id"]);
    if (memberId) return memberId;
  }
  return null;
}

export function parseWixHashtags(tags?: string) {
  if (!tags) return [];
  return [...new Set(tags.split(",").map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean))].slice(0, 100);
}
