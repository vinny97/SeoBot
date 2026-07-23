import { PageHeader } from "@/components/ui";
import { GscConnection } from "@/components/integrations/gsc-connection";
export default async function GscPage({searchParams}:{searchParams:Promise<{session?:string;error?:string}>}){const params=await searchParams;return<><PageHeader eyebrow="Search data connection" title="Google Search Console" description="Read-only access to verified Google search performance. Composio manages authorization, and Searchhand never receives your Google tokens."/><GscConnection sessionId={params.session} errorCode={params.error}/></>}
