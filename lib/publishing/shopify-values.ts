import { createHash } from "node:crypto";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walkRecords(value: unknown, depth = 0): RecordValue[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) return value.flatMap((item) => walkRecords(item, depth + 1));
  if (!isRecord(value)) return [];
  return [value, ...Object.values(value).flatMap((item) => walkRecords(item, depth + 1))];
}

function stringValue(record: RecordValue, keys: string[]) {
  for (const key of keys) if (typeof record[key] === "string" && record[key]) return record[key] as string;
  return null;
}

export function mapComposioStatus(status: string) {
  if (status === "ACTIVE") return "connected" as const;
  if (status === "EXPIRED" || status === "INACTIVE") return "needs_reauthentication" as const;
  if (status === "REVOKED") return "disconnected" as const;
  if (status === "FAILED") return "error" as const;
  return "pending" as const;
}

export function extractShopifyShop(data: unknown) {
  const records = walkRecords(data);
  const shop = records.find((item) =>
    ["myshopifyDomain", "myshopify_domain", "primaryDomain", "primary_domain"].some((key) => key in item),
  ) || records.find((item) => "name" in item && "id" in item);
  if (!shop) return { id: null, name: null, url: null };
  const domain = stringValue(shop, ["myshopifyDomain", "myshopify_domain", "domain"]);
  const primary = isRecord(shop.primaryDomain) ? shop.primaryDomain : isRecord(shop.primary_domain) ? shop.primary_domain : null;
  const url = (primary && stringValue(primary, ["url"])) || stringValue(shop, ["url", "onlineStoreUrl", "online_store_url"]) || (domain ? `https://${domain}` : null);
  return {
    id: stringValue(shop, ["id", "shop_id"]),
    name: stringValue(shop, ["name", "shop_name"]),
    url,
  };
}

export function extractShopifyArticle(data: unknown) {
  const records = walkRecords(data);
  const article = records.find((item) => "article" in item && isRecord(item.article))?.article as RecordValue | undefined
    || records.find((item) => "id" in item && ("title" in item || "handle" in item));
  if (!article) return { id: null, url: null, adminUrl: null, published: false };
  return {
    id: stringValue(article, ["id", "article_id", "admin_graphql_api_id"]),
    url: stringValue(article, ["url", "public_url"]),
    adminUrl: stringValue(article, ["admin_url", "adminUrl", "preview_url", "previewUrl"]),
    published: Boolean(article.published_at || article.publishedAt || article.published === true),
  };
}

export function buildShopifyDraftArguments(input: {
  blogId: string;
  title: string;
  bodyHtml: string;
  tags?: string;
}) {
  return {
    blog_id: input.blogId,
    title: input.title,
    body_html: input.bodyHtml,
    published: false,
    ...(input.tags ? { tags: input.tags } : {}),
  };
}

export function contentHash(title: string, bodyHtml: string) {
  return createHash("sha256").update(`${title}\n${bodyHtml}`).digest("hex");
}
