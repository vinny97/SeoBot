import "server-only";
import { Composio } from "@composio/core";
import { requirePublishingServerEnv } from "@/lib/config/publishing-env";
import { SHOPIFY_TOOLKIT_VERSION } from "@/lib/composio/constants";

let client: Composio | null = null;

export function getComposioClient(): Composio {
  if (client) return client;
  const env = requirePublishingServerEnv();
  client = new Composio({
    apiKey: env.COMPOSIO_API_KEY,
    allowTracking: false,
    dangerouslyAllowAutoUploadDownloadFiles: false,
    toolkitVersions: { shopify: SHOPIFY_TOOLKIT_VERSION },
  });
  return client;
}
