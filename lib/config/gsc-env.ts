import { z } from "zod";

const schema=z.object({
  APP_URL:z.string().url(),
  GOOGLE_GSC_CLIENT_ID:z.string().min(10),
  GOOGLE_GSC_CLIENT_SECRET:z.string().min(10),
  GOOGLE_GSC_REDIRECT_URI:z.string().url(),
  GSC_TOKEN_ENCRYPTION_KEY:z.string().min(43),
  // Read only for legacy records created before direct OAuth was introduced.
  COMPOSIO_GSC_AUTH_CONFIG_ID:z.string().startsWith("ac_").optional(),
});
export type GscServerEnv=z.infer<typeof schema>;
export function getGscServerEnv(env:NodeJS.ProcessEnv=process.env):GscServerEnv|null{const result=schema.safeParse({APP_URL:env.APP_URL||env.NEXT_PUBLIC_APP_URL,GOOGLE_GSC_CLIENT_ID:env.GOOGLE_GSC_CLIENT_ID,GOOGLE_GSC_CLIENT_SECRET:env.GOOGLE_GSC_CLIENT_SECRET,GOOGLE_GSC_REDIRECT_URI:env.GOOGLE_GSC_REDIRECT_URI, GSC_TOKEN_ENCRYPTION_KEY:env.GSC_TOKEN_ENCRYPTION_KEY||env.CREDENTIAL_ENCRYPTION_KEY,COMPOSIO_GSC_AUTH_CONFIG_ID:env.COMPOSIO_GSC_AUTH_CONFIG_ID});return result.success?result.data:null}
export function requireGscServerEnv(env:NodeJS.ProcessEnv=process.env):GscServerEnv{const value=getGscServerEnv(env);if(!value)throw new Error("Google Search Console is not configured. Add GOOGLE_GSC_CLIENT_ID, GOOGLE_GSC_CLIENT_SECRET, GOOGLE_GSC_REDIRECT_URI and GSC_TOKEN_ENCRYPTION_KEY.");return value}
