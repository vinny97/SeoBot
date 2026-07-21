import { Composio } from "@composio/core";

const name = "Searchhand Shopify OAuth";
const scopes = "write_files,read_content,write_content";
const oauthRedirectUri = "https://backend.composio.dev/api/v1/auth-apps/add";
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

const credentials = {
  client_id: clientId,
  client_secret: clientSecret,
  oauth_redirect_uri: oauthRedirectUri,
  scopes,
};

let authConfigId: string;
if (match) {
  authConfigId = match.id;
  await composio.authConfigs.update(authConfigId, {
    type: "custom",
    credentials,
  });
} else {
  const createdAuthConfig = await composio.authConfigs.create("shopify", {
    type: "use_custom_auth",
    authScheme: "OAUTH2",
    credentials,
    name,
  });
  authConfigId = createdAuthConfig.id;
}

if (!authConfigId.startsWith("ac_")) {
  throw new Error("Composio returned an unexpected auth-config ID.");
}

const verified = await composio.authConfigs.get(authConfigId);
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
  scopes,
  created: !match,
}));
