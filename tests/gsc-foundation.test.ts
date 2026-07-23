import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { getGscServerEnv } from "../lib/config/gsc-env";
import { extractGscProperties,extractGscSearchRows,mapGscComposioStatus } from "../lib/gsc/composio-values";
import { createGscOAuthProof,verifyState } from "../lib/gsc/oauth";
import { propertyMatchesWebsite } from "../lib/gsc/property-match";
import { matchGscUrl } from "../lib/gsc/url-match";
import { gscSyncWindow } from "../lib/gsc/sync-window";

const migration=readFileSync(new URL("../supabase/migrations/202607220005_gsc_composio.sql",import.meta.url),"utf8");
const importer=readFileSync(new URL("../lib/gsc/importer.ts",import.meta.url),"utf8");

describe("GSC security and matching",()=>{
  it("validates one-time callback state and rejects a fabricated value",()=>{const proof=createGscOAuthProof();expect(verifyState(proof.state,proof.stateHash)).toBe(true);expect(verifyState("fabricated",proof.stateHash)).toBe(false)});
  it("requires the shared Composio key and pinned GSC auth config",()=>{expect(getGscServerEnv({NODE_ENV:"test",NEXT_PUBLIC_APP_URL:"https://app.searchhand.test",COMPOSIO_API_KEY:"x".repeat(24),COMPOSIO_GSC_AUTH_CONFIG_ID:"ac_2d-b3WRSIFhr"})).toMatchObject({APP_URL:"https://app.searchhand.test",COMPOSIO_GSC_AUTH_CONFIG_ID:"ac_2d-b3WRSIFhr"});expect(getGscServerEnv({NODE_ENV:"test"})).toBeNull()});
  it("stores Composio references while leaving the legacy token field unused",()=>{expect(migration).toContain("composio_connected_account_id");expect(migration).toContain("composio_auth_config_id");expect(migration).toContain("Must remain null for Composio-managed GSC connections");expect(importer).not.toContain("decryptGscRefreshToken");expect(importer).toContain("getVerifiedGscAccount")});
  it("maps Composio account states conservatively",()=>{expect(mapGscComposioStatus("ACTIVE")).toBe("connected");expect(mapGscComposioStatus("EXPIRED")).toBe("needs_reauthentication");expect(mapGscComposioStatus("REVOKED")).toBe("disconnected");expect(mapGscComposioStatus("FAILED")).toBe("error")});
  it("extracts only usable verified Search Console properties",()=>{const properties=extractGscProperties({siteEntry:[{siteUrl:"sc-domain:example.com",permissionLevel:"siteOwner"},{siteUrl:"https://example.com/",permissionLevel:"siteFullUser"},{siteUrl:"sc-domain:unverified.test",permissionLevel:"siteUnverifiedUser"}]});expect(properties).toEqual([{siteUrl:"sc-domain:example.com",permissionLevel:"siteOwner"},{siteUrl:"https://example.com/",permissionLevel:"siteFullUser"}])});
  it("normalizes Composio Search Analytics row payloads",()=>{expect(extractGscSearchRows({response:{rows:[{keys:["2026-07-20","pricing"],clicks:"3",impressions:100,ctr:0.03,position:8.4}]}})).toEqual([{keys:["2026-07-20","pricing"],clicks:3,impressions:100,ctr:0.03,position:8.4}]);expect(extractGscSearchRows({responseAggregationType:"auto"})).toEqual([])});
  it("accepts matching domain and URL-prefix properties only",()=>{expect(propertyMatchesWebsite("sc-domain:example.com","https://www.example.com/")).toBe(true);expect(propertyMatchesWebsite("https://www.example.com/","https://www.example.com/pricing")).toBe(true);expect(propertyMatchesWebsite("sc-domain:unrelated.test","https://www.example.com/")).toBe(false)});
  it("matches canonical and justified host variants while retaining unmatched query URLs",()=>{const pages=[{id:"page-1",normalised_url:"https://www.example.com/pricing",final_url:null,latest_canonical_url:"https://example.com/pricing"}];expect(matchGscUrl("https://example.com/pricing/",pages).pageId).toBe("page-1");const unmatched=matchGscUrl("https://example.com/pricing?currency=gbp",pages);expect(unmatched.pageId).toBeNull();expect(unmatched.normalised).toContain("currency=gbp")});
  it("uses a 90-day initial window and a 10-day overlapping daily window",()=>{const now=new Date("2026-07-22T12:00:00Z");expect(gscSyncWindow("initial",now)).toEqual({startDate:"2026-04-23",endDate:"2026-07-21"});expect(gscSyncWindow("daily",now)).toEqual({startDate:"2026-07-12",endDate:"2026-07-21"})});
});
