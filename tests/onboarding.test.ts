import { describe,expect,it } from "vitest";
import { businessProfileSchema,goalsStepSchema,websiteStepSchema } from "@/lib/validation/onboarding";
import { restoreProjectState } from "@/lib/data/local-project";

describe("onboarding validation and persistence",()=>{
  it("accepts a valid website step",()=>expect(websiteStepSchema.safeParse({url:"example.com",businessName:"Acme",location:"Bristol",audience:"national"}).success).toBe(true));
  it("requires meaningful business context",()=>expect(businessProfileSchema.safeParse({name:"Acme",description:"short",industry:"Consulting",services:"",customer:"Owners",locations:"UK",model:"Service business",tone:"Clear",conversion:"Contact",audience:"national"}).success).toBe(false));
  it("limits goals to three",()=>expect(goalsStepSchema.safeParse({goals:["1","2","3","4"],approvalPreference:"review_all"}).success).toBe(false));
  it("restores the saved onboarding step without losing defaults",()=>{const restored=restoreProjectState(JSON.stringify({onboardingStep:6,website:{domain:"example.com"}}));expect(restored.onboardingStep).toBe(6);expect(restored.website.domain).toBe("example.com");expect(restored.metadata.status).toBe("idle")});
  it("falls back safely when stored progress is corrupt",()=>expect(restoreProjectState("not-json").onboardingStep).toBe(1));
});
