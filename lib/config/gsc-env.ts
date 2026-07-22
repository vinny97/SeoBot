import { z } from "zod";

const schema=z.object({GOOGLE_GSC_CLIENT_ID:z.string().min(10),GOOGLE_GSC_CLIENT_SECRET:z.string().min(10),GOOGLE_GSC_REDIRECT_URI:z.string().url(),GSC_TOKEN_ENCRYPTION_KEY:z.string().min(43)});
export type GscServerEnv=z.infer<typeof schema>;
export function getGscServerEnv(env:NodeJS.ProcessEnv=process.env):GscServerEnv|null{const result=schema.safeParse(env);return result.success?result.data:null}
export function requireGscServerEnv(env:NodeJS.ProcessEnv=process.env):GscServerEnv{const value=getGscServerEnv(env);if(!value)throw new Error("Google Search Console is not configured. Add the Google OAuth credentials, redirect URI and token encryption key.");return value}
