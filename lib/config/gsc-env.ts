import { z } from "zod";

const schema=z.object({APP_URL:z.string().url(),COMPOSIO_API_KEY:z.string().min(20),COMPOSIO_GSC_AUTH_CONFIG_ID:z.string().startsWith("ac_")});
export type GscServerEnv=z.infer<typeof schema>;
export function getGscServerEnv(env:NodeJS.ProcessEnv=process.env):GscServerEnv|null{const result=schema.safeParse({APP_URL:env.APP_URL||env.NEXT_PUBLIC_APP_URL,COMPOSIO_API_KEY:env.COMPOSIO_API_KEY,COMPOSIO_GSC_AUTH_CONFIG_ID:env.COMPOSIO_GSC_AUTH_CONFIG_ID});return result.success?result.data:null}
export function requireGscServerEnv(env:NodeJS.ProcessEnv=process.env):GscServerEnv{const value=getGscServerEnv(env);if(!value)throw new Error("Google Search Console is not configured. Add APP_URL, COMPOSIO_API_KEY and COMPOSIO_GSC_AUTH_CONFIG_ID.");return value}
