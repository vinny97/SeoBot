import "server-only";
import { z } from "zod";
import { getComposioClient } from "@/lib/composio/client";
import {
  SHOPIFY_CREATE_ARTICLE_ACTION,
  SHOPIFY_GET_ARTICLE_ACTION,
  SHOPIFY_TEST_DRAFT_IDEMPOTENCY_KEY,
  SHOPIFY_TOOLKIT_VERSION,
} from "@/lib/composio/constants";
import {
  disconnectShopifyConnection,
  getOwnedPublishingConnection,
  refreshShopifyConnectionStatus,
} from "@/lib/publishing/connections";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import {
  buildShopifyDraftArguments,
  contentHash,
  extractShopifyArticle,
} from "@/lib/publishing/shopify-values";
import type {
  PublishArticleInput,
  PublishingProvider,
  PublishResult,
  RemotePublicationStatus,
  TestConnectionResult,
} from "@/lib/publishing/types";

const draftSchema = z.object({
  contentItemId: z.string().uuid().nullish(),
  idempotencyKey: z.string().min(3).max(160).regex(/^[a-z0-9_.:-]+$/),
  blogId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(255),
  bodyHtml: z.string().min(1).max(500_000),
  tags: z.string().max(500).optional(),
});

export class ComposioShopifyPublisher implements PublishingProvider {
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    return refreshShopifyConnectionStatus(connectionId);
  }

  async createDraft(connectionId: string, input: PublishArticleInput): Promise<PublishResult> {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) throw new PublishingIntegrationError("invalid_draft", "Check the Shopify blog and draft details.", 400);
    const { row, project, admin } = await getOwnedPublishingConnection(connectionId);
    if (row.status !== "connected" || !row.composio_connected_account_id) {
      throw new PublishingIntegrationError("connection_not_active", "Reconnect Shopify before creating a draft.", 409);
    }
    if (parsed.data.contentItemId) {
      const { data: content } = await admin.from("content_items").select("id").eq("id", parsed.data.contentItemId).eq("project_id", project.id).maybeSingle();
      if (!content) throw new PublishingIntegrationError("content_not_found", "The approved content item is unavailable.", 404);
    }

    const hash = contentHash(parsed.data.title, parsed.data.bodyHtml);
    const { data: claimed, error: claimError } = await admin.from("article_publications").insert({
      content_item_id: parsed.data.contentItemId || null,
      publishing_connection_id: row.id,
      provider: "shopify",
      publication_kind: parsed.data.contentItemId ? "content" : "connection_test",
      remote_status: "creating",
      idempotency_key: parsed.data.idempotencyKey,
      content_hash: hash,
      metadata: { blogId: parsed.data.blogId },
    }).select("id,remote_article_id,remote_url,remote_admin_url,remote_status").single();

    if (claimError) {
      if (claimError.code !== "23505") throw new PublishingIntegrationError("publication_claim_failed", "The Shopify draft could not be reserved.", 500);
      const { data: existing } = await admin.from("article_publications")
        .select("id,remote_article_id,remote_url,remote_admin_url,remote_status")
        .eq("publishing_connection_id", row.id)
        .eq("idempotency_key", parsed.data.idempotencyKey)
        .maybeSingle();
      if (existing?.remote_article_id && existing.remote_status === "draft") {
        return {
          publicationId: existing.id,
          remoteArticleId: existing.remote_article_id,
          remoteUrl: existing.remote_url,
          remoteAdminUrl: existing.remote_admin_url,
          status: "draft",
          reused: true,
        };
      }
      throw new PublishingIntegrationError(
        "publication_already_attempted",
        "This draft was already attempted. Check Shopify before trying another connection test.",
        409,
      );
    }

    try {
      const result = await getComposioClient().tools.execute(SHOPIFY_CREATE_ARTICLE_ACTION, {
        userId: row.composio_user_id,
        connectedAccountId: row.composio_connected_account_id,
        version: SHOPIFY_TOOLKIT_VERSION,
        arguments: buildShopifyDraftArguments(parsed.data),
      }, { signal: AbortSignal.timeout(25_000) });
      if (!result.successful) throw new Error("Shopify action failed");
      const remote = extractShopifyArticle(result.data);
      if (!remote.id) throw new Error("Shopify did not return an article ID");
      const now = new Date().toISOString();
      await Promise.all([
        admin.from("article_publications").update({
          remote_article_id: remote.id,
          remote_url: remote.url,
          remote_admin_url: remote.adminUrl,
          remote_status: "draft",
          last_synced_at: now,
          last_synced_hash: hash,
          last_error_code: null,
          last_error_message: null,
        }).eq("id", claimed.id),
        admin.from("publishing_connections").update({ last_used_at: now }).eq("id", row.id),
      ]);
      return {
        publicationId: claimed.id,
        remoteArticleId: remote.id,
        remoteUrl: remote.url,
        remoteAdminUrl: remote.adminUrl,
        status: "draft",
        reused: false,
      };
    } catch {
      await admin.from("article_publications").update({
        remote_status: "unknown",
        last_error_code: "shopify_create_draft_uncertain",
        last_error_message: "The result is uncertain. Check Shopify before attempting another draft.",
      }).eq("id", claimed.id);
      throw new PublishingIntegrationError(
        "shopify_create_draft_uncertain",
        "The draft result is uncertain. Check Shopify before attempting another draft.",
        502,
      );
    }
  }

  async getStatus(connectionId: string, remoteId: string): Promise<RemotePublicationStatus> {
    const { row, admin } = await getOwnedPublishingConnection(connectionId);
    if (row.status !== "connected" || !row.composio_connected_account_id) {
      throw new PublishingIntegrationError("connection_not_active", "Reconnect Shopify before checking this draft.", 409);
    }
    const { data: publication } = await admin.from("article_publications")
      .select("id,metadata")
      .eq("publishing_connection_id", row.id)
      .eq("remote_article_id", remoteId)
      .maybeSingle();
    const metadata = publication?.metadata && typeof publication.metadata === "object" && !Array.isArray(publication.metadata) ? publication.metadata : null;
    const blogId = metadata && typeof metadata.blogId === "string" ? metadata.blogId : null;
    if (!publication || !blogId) throw new PublishingIntegrationError("publication_not_found", "That Shopify draft is unavailable.", 404);
    const result = await getComposioClient().tools.execute(SHOPIFY_GET_ARTICLE_ACTION, {
      userId: row.composio_user_id,
      connectedAccountId: row.composio_connected_account_id,
      version: SHOPIFY_TOOLKIT_VERSION,
      arguments: { blog_id: blogId, article_id: remoteId, fields: "id,title,published_at" },
    }, { signal: AbortSignal.timeout(15_000) });
    if (!result.successful) return { remoteId, status: "unknown" };
    const article = extractShopifyArticle(result.data);
    const status = article.published ? "published" : "draft";
    await admin.from("article_publications").update({ remote_status: status, last_synced_at: new Date().toISOString() }).eq("id", publication.id);
    return { remoteId, status };
  }

  async disconnect(connectionId: string): Promise<void> {
    await disconnectShopifyConnection(connectionId);
  }
}

export async function createShopifyConnectionTestDraft(connectionId: string, blogId: string) {
  const publisher = new ComposioShopifyPublisher();
  return publisher.createDraft(connectionId, {
    contentItemId: null,
    idempotencyKey: SHOPIFY_TEST_DRAFT_IDEMPOTENCY_KEY,
    blogId,
    title: "Searchhand connection test",
    bodyHtml: "<p>This unpublished draft confirms that Searchhand can prepare a Shopify blog article after your explicit approval.</p><p>You can delete this test draft manually in Shopify.</p>",
    tags: "searchhand-connection-test",
  });
}
