import { getWorkerComposioClient } from "../composio/client-worker.js";
import { GSC_SEARCH_ANALYTICS_ACTION, GSC_TOOLKIT_VERSION } from "../composio/constants.js";
import { extractGscSearchRows, mapGscComposioStatus, type GscSearchRow } from "./composio-values.js";

type JsonRecord = Record<string, unknown>;
export type ComposioGscIdentity = { userId: string; connectedAccountId: string; authConfigId: string };

export class GscComposioError extends Error {
  constructor(public code:string,message:string,public status=502){super(message);this.name="GscComposioError"}
}

export async function getVerifiedGscAccount(identity:ComposioGscIdentity){const result=await getWorkerComposioClient().connectedAccounts.list({userIds:[identity.userId],authConfigIds:[identity.authConfigId],toolkitSlugs:["google_search_console"],limit:100},{signal:AbortSignal.timeout(15_000)});const account=result.items.find((item)=>item.id===identity.connectedAccountId);if(!account||account.toolkit.slug.toLowerCase()!=="google_search_console"||account.authConfig.id!==identity.authConfigId)throw new GscComposioError("connection_identity_mismatch","Search Console could not verify this connection.",403);return{account,status:mapGscComposioStatus(account.status)}}

async function executeGscAction(identity:ComposioGscIdentity,arguments_:JsonRecord){const result=await getWorkerComposioClient().tools.execute(GSC_SEARCH_ANALYTICS_ACTION,{userId:identity.userId,connectedAccountId:identity.connectedAccountId,version:GSC_TOOLKIT_VERSION,arguments:arguments_},{signal:AbortSignal.timeout(60_000)});if(!result.successful)throw new GscComposioError("gsc_action_failed",result.error||"Google Search Console did not complete the request.");return result.data}

export async function queryGscSearchAnalytics(identity:ComposioGscIdentity,input:{siteUrl:string;startDate:string;endDate:string;dimensions:string[];startRow:number;rowLimit:number}){const data=await executeGscAction(identity,{site_url:input.siteUrl,start_date:input.startDate,end_date:input.endDate,dimensions:input.dimensions,start_row:input.startRow,row_limit:input.rowLimit,search_type:"web",data_state:"final",aggregation_type:"auto"});return extractGscSearchRows(data)}

export type { GscSearchRow };
