import { describe,expect,it } from "vitest";
import { buildOpportunities } from "@/lib/demo/seed";
import { updateOpportunityStatus } from "@/lib/data/opportunities";
import { websiteAnalysisFallback } from "@/lib/services/website-analysis";

describe("V1 workflows",()=>{
  it("plans an opportunity without mutating the original list",()=>{const items=buildOpportunities("Acme","Consulting");const updated=updateOpportunityStatus(items,items[0].id,"Planned");expect(updated[0].status).toBe("Planned");expect(items[0].status).toBe("New")});
  it("preserves collected metadata when website analysis fails",()=>{const result=websiteAnalysisFallback({title:"Known title",headings:[],sitemap:"unknown",robots:"unknown",status:"analysing",source:"website"},new Error("Timed out"));expect(result).toMatchObject({title:"Known title",status:"failed",source:"manual",error:"Timed out"})});
});
