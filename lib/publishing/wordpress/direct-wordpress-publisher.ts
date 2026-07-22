import "server-only";
import * as cheerio from "cheerio";
import { z } from "zod";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import { contentHash } from "@/lib/publishing/shopify-values";
import type { PublishArticleInput, PublishingProvider, PublishResult, RemotePublicationStatus, TestConnectionResult } from "@/lib/publishing/types";
import { disconnectWordPress, getWordPressClientForConnection, refreshWordPressConnection } from "./wordpress-connections";
import { safeWordPressRemoteUrl, wordpressAdminUrl } from "./wordpress-url";
import { logWordPressOperation } from "./wordpress-log";

export const WORDPRESS_TEST_DRAFT_IDEMPOTENCY_KEY = "wordpress-connection-test-v1";

const draftSchema = z.object({
  contentItemId: z.string().uuid().nullish(),
  idempotencyKey: z.string().min(3).max(160).regex(/^[a-z0-9_.:-]+$/),
  title: z.string().trim().min(1).max(300),
  bodyHtml: z.string().min(1).max(150_000),
  excerpt: z.string().max(5_000).optional(),
  slug: z.string().trim().max(200).regex(/^[a-z0-9-]*$/).optional(),
});

export function sanitiseWordPressHtml(input: string) {
  const $ = cheerio.load(input, null, false);
  $("script,iframe,object,embed,form,style,link,meta").remove();
  $("*").each((_, element) => {
    const attributes = { ...(element.type === "tag" ? element.attribs : {}) };
    for (const [name, value] of Object.entries(attributes)) {
      if (/^on/i.test(name) || name === "srcdoc" || ((name === "href" || name === "src") && /^\s*(?:javascript|data:text\/html):/i.test(value))) {
        $(element).removeAttr(name);
      }
    }
  });
  const html = $.root().html()?.trim() || "";
  if (!html) throw new PublishingIntegrationError("invalid_draft_html", "The article does not contain publishable HTML.", 400);
  return html;
}

export class DirectWordPressPublisher implements PublishingProvider {
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    return refreshWordPressConnection(connectionId);
  }

  async createDraft(connectionId: string, input: PublishArticleInput): Promise<PublishResult> {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) throw new PublishingIntegrationError("invalid_draft", "Check the WordPress draft title and content.", 400);
    const { row, project, admin, client } = await getWordPressClientForConnection(connectionId);
    if (row.status !== "connected") throw new PublishingIntegrationError("connection_not_active", "Reconnect WordPress before creating a draft.", 409);
    if (parsed.data.contentItemId) {
      const { data: content } = await admin.from("content_items").select("id").eq("id", parsed.data.contentItemId).eq("project_id", project.id).maybeSingle();
      if (!content) throw new PublishingIntegrationError("content_not_found", "The approved content item is unavailable.", 404);
    }
    const html = sanitiseWordPressHtml(parsed.data.bodyHtml);
    const hash = contentHash(parsed.data.title, html);
    const { data: claimed, error: claimError } = await admin.from("article_publications").insert({
      content_item_id: parsed.data.contentItemId || null,
      publishing_connection_id: row.id,
      provider: "wordpress",
      publication_kind: parsed.data.contentItemId ? "content" : "connection_test",
      remote_status: "creating",
      idempotency_key: parsed.data.idempotencyKey,
      content_hash: hash,
      metadata: {},
    }).select("id,remote_article_id,remote_url,remote_admin_url,remote_status").single();
    if (claimError) {
      if (claimError.code !== "23505") throw new PublishingIntegrationError("publication_claim_failed", "The WordPress draft could not be reserved.", 500);
      const { data: existing } = await admin.from("article_publications")
        .select("id,remote_article_id,remote_url,remote_admin_url,remote_status")
        .eq("publishing_connection_id", row.id).eq("idempotency_key", parsed.data.idempotencyKey).maybeSingle();
      if (existing?.remote_article_id) {
        return { publicationId: existing.id, remoteArticleId: existing.remote_article_id, status: "draft", remoteUrl: existing.remote_url, remoteAdminUrl: existing.remote_admin_url, reused: true };
      }
      throw new PublishingIntegrationError("wordpress_draft_uncertain", "A WordPress draft request is already being checked. Searchhand stopped to prevent a duplicate.", 409);
    }
    try {
      const post = await client.createDraft({ title: parsed.data.title, content: html, excerpt: parsed.data.excerpt, slug: parsed.data.slug });
      if (post.status !== "draft") throw new PublishingIntegrationError("wordpress_draft_status_invalid", "WordPress did not confirm draft status, so Searchhand stopped safely.", 502);
      const remoteId = String(post.id);
      const remoteUrl = safeWordPressRemoteUrl(post.link, row.external_site_url!);
      const remoteAdminUrl = wordpressAdminUrl(row.external_site_url!, post.id);
      const now = new Date().toISOString();
      await admin.from("article_publications").update({
        remote_article_id: remoteId,
        remote_url: remoteUrl,
        remote_admin_url: remoteAdminUrl,
        remote_status: "draft",
        last_synced_hash: hash,
        last_synced_at: now,
        last_error_code: null,
        last_error_message: null,
      }).eq("id", claimed.id);
      await admin.from("publishing_connections").update({ last_used_at: now }).eq("id", row.id);
      logWordPressOperation({ operation: "create_draft", connectionId: row.id, projectId: project.id, remotePostId: remoteId });
      return { publicationId: claimed.id, remoteArticleId: remoteId, status: "draft", remoteUrl, remoteAdminUrl, reused: false };
    } catch (error) {
      const safe = error instanceof PublishingIntegrationError ? error : new PublishingIntegrationError("wordpress_draft_failed", "WordPress could not create the draft.", 502);
      await admin.from("article_publications").update({ remote_status: "error", last_error_code: safe.code, last_error_message: safe.message }).eq("id", claimed.id);
      throw safe;
    }
  }

  async updateDraft(connectionId: string, remoteId: string, input: PublishArticleInput): Promise<PublishResult> {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) throw new PublishingIntegrationError("invalid_draft", "Check the WordPress draft title and content.", 400);
    const { row, admin, client } = await getWordPressClientForConnection(connectionId);
    if (row.status !== "connected") throw new PublishingIntegrationError("connection_not_active", "Reconnect WordPress before updating a draft.", 409);
    const { data: publication } = await admin.from("article_publications").select("id,remote_article_id,content_item_id")
      .eq("publishing_connection_id", row.id).eq("provider", "wordpress").eq("remote_article_id", remoteId).maybeSingle();
    if (!publication) throw new PublishingIntegrationError("publication_not_found", "That WordPress draft is unavailable.", 404);
    if ((publication.content_item_id || null) !== (parsed.data.contentItemId || null)) throw new PublishingIntegrationError("publication_mismatch", "That WordPress draft belongs to different content.", 403);
    const html = sanitiseWordPressHtml(parsed.data.bodyHtml);
    const hash = contentHash(parsed.data.title, html);
    const post = await client.updateDraft(remoteId, { title: parsed.data.title, content: html, excerpt: parsed.data.excerpt, slug: parsed.data.slug });
    const remoteUrl = safeWordPressRemoteUrl(post.link, row.external_site_url!);
    const remoteAdminUrl = wordpressAdminUrl(row.external_site_url!, post.id);
    const now = new Date().toISOString();
    await admin.from("article_publications").update({ remote_status: "draft", remote_url: remoteUrl, remote_admin_url: remoteAdminUrl, content_hash: hash, last_synced_hash: hash, last_synced_at: now, last_error_code: null, last_error_message: null }).eq("id", publication.id);
    await admin.from("publishing_connections").update({ last_used_at: now }).eq("id", row.id);
    logWordPressOperation({ operation: "update_draft", connectionId: row.id, projectId: row.project_id, remotePostId: String(post.id) });
    return { publicationId: publication.id, remoteArticleId: String(post.id), status: "draft", remoteUrl, remoteAdminUrl, reused: true };
  }

  async getStatus(connectionId: string, remoteId: string): Promise<RemotePublicationStatus> {
    const { row, admin, client } = await getWordPressClientForConnection(connectionId);
    try {
      const post = await client.getPost(remoteId);
      const status = post.status === "draft" ? "draft" : post.status === "publish" ? "published" : "unknown";
      await admin.from("article_publications").update({ remote_status: status, last_synced_at: new Date().toISOString() }).eq("publishing_connection_id", row.id).eq("remote_article_id", remoteId);
      return { remoteId, status };
    } catch (error) {
      if (error instanceof PublishingIntegrationError && error.code === "wordpress_post_missing") {
        await admin.from("article_publications").update({ remote_status: "deleted", last_synced_at: new Date().toISOString() }).eq("publishing_connection_id", row.id).eq("remote_article_id", remoteId);
        return { remoteId, status: "deleted" };
      }
      throw error;
    }
  }

  async disconnect(connectionId: string) { await disconnectWordPress(connectionId); }
}

const testDraftInput = {
  contentItemId: null,
  idempotencyKey: WORDPRESS_TEST_DRAFT_IDEMPOTENCY_KEY,
  title: "Searchhand connection test",
  bodyHtml: "<p>This draft confirms that Searchhand is connected to your WordPress website. It is not intended for publication.</p>",
  slug: "searchhand-connection-test",
};

export async function createWordPressConnectionTestDraft(connectionId: string) {
  return new DirectWordPressPublisher().createDraft(connectionId, testDraftInput);
}

export async function updateWordPressConnectionTestDraft(connectionId: string) {
  const { row, admin } = await getWordPressClientForConnection(connectionId);
  const { data } = await admin.from("article_publications").select("remote_article_id")
    .eq("publishing_connection_id", row.id).eq("idempotency_key", WORDPRESS_TEST_DRAFT_IDEMPOTENCY_KEY).maybeSingle();
  if (!data?.remote_article_id) throw new PublishingIntegrationError("publication_not_found", "Create the WordPress test draft before updating it.", 404);
  return new DirectWordPressPublisher().updateDraft(connectionId, data.remote_article_id, testDraftInput);
}
