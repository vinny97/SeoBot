import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
loadEnvConfig(process.cwd());
const websiteId=process.argv[2];if(!websiteId)throw new Error("Usage: npm run siteone:enqueue -- <website-id>");
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!secret)throw new Error("Supabase URL and server secret are required locally.");
const client=createClient(url,secret,{auth:{persistSession:false}});const {data,error}=await client.rpc("enqueue_internal_siteone_crawl",{target_website_id:websiteId});if(error)throw error;console.log(`SiteOne crawl queued: ${data}`);
