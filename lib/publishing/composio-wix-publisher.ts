import "server-only";
import { z } from "zod";
import { getComposioClient } from "@/lib/composio/client";
import {
  WIX_CREATE_DRAFT_ENDPOINT,
  WIX_LIST_DRAFTS_ENDPOINT,
  WIX_LIST_POSTS_ENDPOINT,
  WIX_RICOS_CONVERT_ENDPOINT,
  WIX_TEST_DRAFT_IDEMPOTENCY_KEY,
} from "@/lib/composio/constants";
import {
  disconnectWixConnection,
  getOwnedWixPublishingConnection,
  getVerifiedWixRemoteAccount,
  refreshWixConnectionStatus,
} from "@/lib/publishing/wix-connections";
import { PublishingIntegrationError } from "@/lib/publishing/errors";
import { contentHash } from "@/lib/publishing/shopify-values";
import {
  extractWixAuthorMemberId,
  extractWixDraft,
  extractWixRicosDocument,
  parseWixHashtags,
} from "@/lib/publishing/wix-values";
import type {
  PublishArticleInput,
  PublishingProvider,
  PublishResult,
  RemotePublicationStatus,
  TestConnectionResult,
} from "@/lib/publishing/types";

const wixDraftSchema = z.object({
  contentItemId: z.string().uuid().nullish(),
  idempotencyKey: z.string().min(3).max(160).regex(/^[a-z0-9_.:-]+$/),
  authorMemberId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(30_000),
  tags: z.string().max(1_000).optional(),
});

function wixMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function wixProxy(
  connectedAccountId: string,
  input: {
    endpoint: string;
    method: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    parameters?: Array<{ in: "query" | "header"; name: string; value: string | number }>;
  },
  timeoutMs = 20_000,
) {
  return getComposioClient().tools.proxyExecute({
    ...input,
    connectedAccountId,
  }, { signal: AbortSignal.timeout(timeoutMs) });
}

async function discoverWixAuthorMemberId(connectedAccountId: string) {
  for (const endpoint of [WIX_LIST_DRAFTS_ENDPOINT, WIX_LIST_POSTS_ENDPOINT]) {
    const response = await wixProxy(connectedAccountId, {
      endpoint,
      method: "GET",
      parameters: [{ in: "query", name: "paging.limit", value: 1 }],
    });
    if (response.status >= 200 && response.status < 300) {
      const memberId = extractWixAuthorMemberId(response.data);
      if (memberId) return memberId;
    }
  }
  return null;
}

async function convertHtmlToWixRicos(connectedAccountId: string, html: string) {
  const response = await wixProxy(connectedAccountId, {
    endpoint: WIX_RICOS_CONVERT_ENDPOINT,
    method: "POST",
    body: {
      html,
      options: {
        plugins: ["heading", "link", "image", "codeBlock", "table", "divider"],
      },
    },
  });
  if (response.status < 200 || response.status >= 300) {
    throw new PublishingIntegrationError(
      "wix_ricos_conversion_failed",
      "Wix could not prepare the article formatting. Confirm the app has Manage Ricos Document permission, then reconnect.",
      response.status === 403 ? 403 : 502,
    );
  }
  const document = extractWixRicosDocument(response.data);
  if (!document) throw new PublishingIntegrationError("wix_ricos_conversion_failed", "Wix returned an invalid formatted article.", 502);
  return document;
}

export class ComposioWixPublisher implements PublishingProvider {
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    return refreshWixConnectionStatus(connectionId);
  }

  async createDraft(connectionId: string, input: PublishArticleInput): Promise<PublishResult> {
    const parsed = wixDraftSchema.safeParse(input);
    if (!parsed.success) throw new PublishingIntegrationError("invalid_draft", "Check the Wix author and draft details.", 400);
    const { row, project, admin } = await getOwnedWixPublishingConnection(connectionId);
    if (row.status !== "connected" || !row.composio_connected_account_id) {
      throw new PublishingIntegrationError("connection_not_active", "Reconnect Wix before creating a draft.", 409);
    }
    await getVerifiedWixRemoteAccount(row);
    if (parsed.data.contentItemId) {
      const { data: content } = await admin.from("content_items")
        .select("id")
        .eq("id", parsed.data.contentItemId)
        .eq("project_id", project.id)
        .maybeSingle();
      if (!content) throw new PublishingIntegrationError("content_not_found", "The approved content item is unavailable.", 404);
    }

    const metadata = wixMetadata(row.metadata);
    const savedAuthorMemberId = typeof metadata.authorMemberId === "string" ? metadata.authorMemberId : null;
    const authorMemberId = parsed.data.authorMemberId
      || savedAuthorMemberId
      || await discoverWixAuthorMemberId(row.composio_connected_account_id);
    if (!authorMemberId) {
      throw new PublishingIntegrationError(
        "wix_author_required",
        "Wix requires an author member ID. Create one Wix blog post manually first, or enter its author member ID.",
        400,
      );
    }

    const richContent = await convertHtmlToWixRicos(row.composio_connected_account_id, parsed.data.bodyHtml);
    const hash = contentHash(parsed.data.title, parsed.data.bodyHtml);
    const { data: claimed, error: claimError } = await admin.from("article_publications").insert({
      content_item_id: parsed.data.contentItemId || null,
      publishing_connection_id: row.id,
      provider: "wix",
      publication_kind: parsed.data.contentItemId ? "content" : "connection_test",
      remote_status: "creating",
      idempotency_key: parsed.data.idempotencyKey,
      content_hash: hash,
      metadata: { authorMemberId },
    }).select("id,remote_article_id,remote_url,remote_admin_url,remote_status").single();

    if (claimError) {
      if (claimError.code !== "23505") throw new PublishingIntegrationError("publication_claim_failed", "The Wix draft could not be reserved.", 500);
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
        "This draft was already attempted. Check Wix before trying another connection test.",
        409,
      );
    }

    try {
      const response = await wixProxy(row.composio_connected_account_id, {
        endpoint: WIX_CREATE_DRAFT_ENDPOINT,
        method: "POST",
        body: {
          draftPost: {
            title: parsed.data.title,
            memberId: authorMemberId,
            richContent,
            hashtags: parseWixHashtags(parsed.data.tags),
            commentingEnabled: false,
          },
          fieldsets: ["URL", "RICH_CONTENT"],
          publish: false,
        },
      }, 25_000);
      if (response.status < 200 || response.status >= 300) throw new Error(`Wix returned ${response.status}`);
      const remote = extractWixDraft(response.data);
      if (!remote.id) throw new Error("Wix did not return a draft ID");
      const now = new Date().toISOString();
      await Promise.all([
        admin.from("article_publications").update({
          remote_article_id: remote.id,
          remote_url: remote.url,
          remote_admin_url: null,
          remote_status: "draft",
          last_synced_at: now,
          last_synced_hash: hash,
          last_error_code: null,
          last_error_message: null,
        }).eq("id", claimed.id),
        admin.from("publishing_connections").update({
          last_used_at: now,
          metadata: { ...metadata, authorMemberId },
        }).eq("id", row.id),
      ]);
      return {
        publicationId: claimed.id,
        remoteArticleId: remote.id,
        remoteUrl: remote.url,
        remoteAdminUrl: null,
        status: "draft",
        reused: false,
      };
    } catch {
      await admin.from("article_publications").update({
        remote_status: "unknown",
        last_error_code: "wix_create_draft_uncertain",
        last_error_message: "The result is uncertain. Check Wix before attempting another draft.",
      }).eq("id", claimed.id);
      throw new PublishingIntegrationError(
        "wix_create_draft_uncertain",
        "The draft result is uncertain. Check Wix before attempting another draft.",
        502,
      );
    }
  }

  async getStatus(connectionId: string, remoteId: string): Promise<RemotePublicationStatus> {
    const { row, admin } = await getOwnedWixPublishingConnection(connectionId);
    if (row.status !== "connected" || !row.composio_connected_account_id) {
      throw new PublishingIntegrationError("connection_not_active", "Reconnect Wix before checking this draft.", 409);
    }
    const { data: publication } = await admin.from("article_publications")
      .select("id")
      .eq("publishing_connection_id", row.id)
      .eq("remote_article_id", remoteId)
      .maybeSingle();
    if (!publication) throw new PublishingIntegrationError("publication_not_found", "That Wix draft is unavailable.", 404);
    const response = await wixProxy(row.composio_connected_account_id, {
      endpoint: `${WIX_CREATE_DRAFT_ENDPOINT}/${encodeURIComponent(remoteId)}`,
      method: "GET",
      parameters: [{ in: "query", name: "fieldsets", value: "URL" }],
    });
    if (response.status === 404) {
      await admin.from("article_publications").update({ remote_status: "deleted", last_synced_at: new Date().toISOString() }).eq("id", publication.id);
      return { remoteId, status: "deleted" };
    }
    if (response.status < 200 || response.status >= 300) return { remoteId, status: "unknown" };
    const draft = extractWixDraft(response.data);
    const status = draft.published ? "published" : "draft";
    await admin.from("article_publications").update({ remote_status: status, last_synced_at: new Date().toISOString() }).eq("id", publication.id);
    return { remoteId, status };
  }

  async disconnect(connectionId: string): Promise<void> {
    await disconnectWixConnection(connectionId);
  }
}

export async function createWixConnectionTestDraft(connectionId: string, authorMemberId?: string) {
  const publisher = new ComposioWixPublisher();
  return publisher.createDraft(connectionId, {
    contentItemId: null,
    idempotencyKey: WIX_TEST_DRAFT_IDEMPOTENCY_KEY,
    authorMemberId: authorMemberId || undefined,
    title: "Searchhand connection test",
    bodyHtml: "<p>This unpublished draft confirms that Searchhand can prepare a Wix blog article after your explicit approval.</p><p>You can delete this test draft manually in Wix.</p>",
    tags: "searchhand-connection-test",
  });
}
