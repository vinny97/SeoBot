import { z } from "zod";

function publicWebsite(value: string) {
  try {
    const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && host.includes(".") && host !== "localhost" && !host.endsWith(".localhost") && host !== "127.0.0.1" && host !== "0.0.0.0";
  } catch { return false; }
}

export function normaliseWebsite(value: string) {
  return new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`).toString();
}

export const websiteSchema = z.object({
  websiteUrl: z.string().trim().min(1, "Website URL is required.").refine(publicWebsite, "Enter a valid public website, such as screenfizz.com."),
  businessName: z.string().trim().min(2, "Business name is required."),
  location: z.string().trim(),
});

export const businessSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required."),
  businessDescription: z.string().trim().min(20, "Add a short description so future work stays relevant."),
  industry: z.string().trim().min(2, "Industry is required."),
  servicesText: z.string().trim().min(2, "Add at least one product or service."),
  targetCustomer: z.string().trim().min(2, "Target customer is required."),
  location: z.string().trim(),
  audienceScope: z.enum(["local", "national", "international"]),
  primaryConversion: z.string().min(1),
  brandTone: z.enum(["Professional", "Friendly", "Expert", "Direct", "Premium", "Approachable"]),
});

export const goalsSchema = z.object({
  selectedGoals: z.array(z.string()).min(1, "Choose at least one goal.").max(3, "Choose up to three goals."),
  approvalPreference: z.enum(["review_all", "review_important", "agreed_rules"]),
});

export const competitorSchema = z.object({
  name: z.string().trim().min(2, "Competitor name is required."),
  websiteUrl: z.string().trim().min(1, "Website URL is required.").refine(publicWebsite, "Enter a valid public website."),
  note: z.string().trim(),
});
