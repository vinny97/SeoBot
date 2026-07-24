import { PageHeader } from "@/components/ui";
import { GoogleAnalyticsConnection } from "@/components/integrations/google-analytics-connection";
export default async function GoogleAnalyticsPage({searchParams}:{searchParams:Promise<{error?:string}>}){const params=await searchParams;return <><PageHeader eyebrow="Analytics connection" title="Google Analytics" description="Connect a GA4 property through Composio. Google credentials and token refresh remain managed by Composio."/><GoogleAnalyticsConnection errorCode={params.error}/></>}
