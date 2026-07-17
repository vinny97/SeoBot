import { z } from "zod";
import { businessSchema, competitorSchema, goalsSchema, websiteSchema } from "@/lib/onboarding/schema";
export const onboardingDraftSchema=z.object({
  websiteUrl:websiteSchema.shape.websiteUrl,businessName:websiteSchema.shape.businessName,location:z.string().trim().max(200),
  businessDescription:businessSchema.shape.businessDescription.or(z.literal("")),industry:businessSchema.shape.industry.or(z.literal("")),services:z.array(z.string().trim().min(1)).max(20),targetCustomer:businessSchema.shape.targetCustomer.or(z.literal("")),
  audienceScope:businessSchema.shape.audienceScope,primaryConversion:z.string().min(1),brandTone:businessSchema.shape.brandTone,
  selectedGoals:z.array(z.string()).max(3),approvalPreference:goalsSchema.shape.approvalPreference,
  competitors:z.array(competitorSchema.extend({id:z.string().max(200),addedAt:z.string().optional()}).transform(item=>({...item,addedAt:item.addedAt||new Date(0).toISOString()}))).max(5),
  currentStep:z.number().int().min(0).max(7),completed:z.boolean(),
}).strict();
export const onboardingPayloadSchema=onboardingDraftSchema.extend({
  businessDescription:businessSchema.shape.businessDescription,
  industry:businessSchema.shape.industry,
  services:z.array(z.string().trim().min(1)).min(1).max(20),
  targetCustomer:businessSchema.shape.targetCustomer,
  selectedGoals:goalsSchema.shape.selectedGoals,
});
export type BackendOnboardingPayload=z.infer<typeof onboardingPayloadSchema>;
