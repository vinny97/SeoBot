import { getComposioClient } from "../composio/client-core";
import { GSC_LIST_SITES_ACTION, GSC_SEARCH_ANALYTICS_ACTION, GSC_TOOLKIT_VERSION } from "../composio/constants";
import { extractGscProperties, extractGscSearchRows, mapGscComposioStatus } from "./composio-values";

type JsonRecord = Record<string, unknown>;
export type ComposioGscIdentity = { userId: string; connectedAccountId: string; authConfigId: string };

export class GscComposioError extends Error {
  constructor(public code:string,message:string,public status=502){super(message);this.name="GscComposioError"}
}

export async function getVerifiedGscAccount(identity:ComposioGscIdentity){const result=await getComposioClient().connectedAccounts.list({userIds:[identity.userId],authConfigIds:[identity.authConfigId],toolkitSlugs:["google_search_console"],limit:100},{signal:AbortSignal.timeout(15_000)});const account=result.items.find((item)=>item.id===identity.connectedAccountId);if(!account||account.toolkit.slug.toLowerCase()!=="google_search_console"||account.authConfig.id!==identity.authConfigId)throw new GscComposioError("connection_identity_mismatch","Search Console could not verify this connection.",403);return{account,status:mapGscComposioStatus(account.status)}}

async function executeGscAction(identity:ComposioGscIdentity,slug:string,arguments_:JsonRecord){const result=await getComposioClient().tools.execute(slug,{userId:identity.userId,connectedAccountId:identity.connectedAccountId,version:GSC_TOOLKIT_VERSION,arguments:arguments_},{signal:AbortSignal.timeout(60_000)});if(!result.successful)throw new GscComposioError("gsc_action_failed",result.error||"Google Search Console did not complete the request.");return result.data}

export async function listGscProperties(identity:ComposioGscIdentity){const{status}=await getVerifiedGscAccount(identity);if(status!=="connected")throw new GscComposioError("connection_not_active","Google Search Console authorization is not active.",409);return extractGscProperties(await executeGscAction(identity,GSC_LIST_SITES_ACTION,{}))}

export async function queryGscSearchAnalytics(identity:ComposioGscIdentity,input:{siteUrl:string;startDate:string;endDate:string;dimensions:string[];startRow:number;rowLimit:number}){const data=await executeGscAction(identity,GSC_SEARCH_ANALYTICS_ACTION,{site_url:input.siteUrl,start_date:input.startDate,end_date:input.endDate,dimensions:input.dimensions,start_row:input.startRow,row_limit:input.rowLimit,search_type:"web",data_state:"final",aggregation_type:"auto"});return extractGscSearchRows(data)}

export type { GscSearchRow } from "./composio-values";
