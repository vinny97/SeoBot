import { Composio } from "@composio/core";
import { z } from "zod";
import { GSC_TOOLKIT_VERSION, SHOPIFY_TOOLKIT_VERSION, WIX_TOOLKIT_VERSION } from "./constants.js";

let client: Composio | null = null;

export function getWorkerComposioClient(): Composio {
  if (client) return client;
  const apiKey = z.string().min(20).parse(process.env.COMPOSIO_API_KEY);
  client = new Composio({
    apiKey,
    allowTracking: false,
    dangerouslyAllowAutoUploadDownloadFiles: false,
    toolkitVersions: {
      shopify: SHOPIFY_TOOLKIT_VERSION,
      wix: WIX_TOOLKIT_VERSION,
      google_search_console: GSC_TOOLKIT_VERSION,
    },
  });
  return client;
}
