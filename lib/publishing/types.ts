export type PublishingConnectionStatus =
  | "pending"
  | "connected"
  | "needs_reauthentication"
  | "error"
  | "disconnected"
  | "revoked";

export type SafePublishingConnection = {
  id: string;
  provider: "shopify";
  status: PublishingConnectionStatus;
  storeName: string | null;
  storeUrl: string | null;
  connectedAt: string | null;
  lastCheckedAt: string | null;
  lastUsedAt: string | null;
  errorMessage: string | null;
  testDraftStatus: string | null;
  testDraftUrl: string | null;
  testDraftAdminUrl: string | null;
};

export type TestConnectionResult = {
  ok: boolean;
  status: PublishingConnectionStatus;
  storeName: string | null;
  storeUrl: string | null;
};

export type PublishArticleInput = {
  contentItemId?: string | null;
  idempotencyKey: string;
  blogId: string;
  title: string;
  bodyHtml: string;
  tags?: string;
};

export type PublishResult = {
  publicationId: string;
  remoteArticleId: string;
  status: "draft";
  remoteUrl: string | null;
  remoteAdminUrl: string | null;
  reused: boolean;
};

export type RemotePublicationStatus = {
  remoteId: string;
  status: "draft" | "published" | "deleted" | "unknown";
};

export interface PublishingProvider {
  testConnection(connectionId: string): Promise<TestConnectionResult>;
  createDraft(connectionId: string, input: PublishArticleInput): Promise<PublishResult>;
  getStatus(connectionId: string, remoteId: string): Promise<RemotePublicationStatus>;
  disconnect(connectionId: string): Promise<void>;
}
