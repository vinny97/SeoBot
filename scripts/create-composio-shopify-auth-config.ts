import { Composio } from "@composio/core";

const name = "Searchhand Shopify OAuth";
const apiKey = process.env.COMPOSIO_API_KEY;
const clientId = process.env.COMPOSIO_SHOPIFY_CLIENT_ID;
const clientSecret = process.env.COMPOSIO_SHOPIFY_CLIENT_SECRET;

if (!apiKey) {
  throw new Error("COMPOSIO_API_KEY is required.");
}
if (!clientId || !clientSecret) {
  throw new Error(
    "COMPOSIO_SHOPIFY_CLIENT_ID and COMPOSIO_SHOPIFY_CLIENT_SECRET are required.",
  );
}

const composio = new Composio({
  apiKey,
  allowTracking: false,
  dangerouslyAllowAutoUploadDownloadFiles: false,
});

const existing = await composio.authConfigs.list({
  toolkit: "shopify",
  isComposioManaged: false,
  search: name,
  limit: 20,
});
const match = existing.items.find(
  (item) => item.name === name && item.toolkit.slug === "shopify",
);

const authConfig = match || await composio.authConfigs.create("shopify", {
  type: "use_custom_auth",
  authScheme: "OAUTH2",
  credentials: {
    client_id: clientId,
    client_secret: clientSecret,
  },
  name,
});

if (!authConfig.id.startsWith("ac_")) {
  throw new Error("Composio returned an unexpected auth-config ID.");
}

const verified = await composio.authConfigs.get(authConfig.id);
if (
  verified.toolkit.slug !== "shopify" ||
  verified.isComposioManaged ||
  verified.authScheme !== "OAUTH2"
) {
  throw new Error("The created auth config is not custom Shopify OAuth.");
}

console.log(JSON.stringify({
  id: verified.id,
  name: verified.name,
  toolkit: verified.toolkit.slug,
  managed: verified.isComposioManaged,
  authScheme: verified.authScheme,
  created: !match,
}));
