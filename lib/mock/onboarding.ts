import type { OnboardingData } from "@/lib/onboarding/types";

type ProfilePreset = Pick<OnboardingData, "businessDescription" | "industry" | "services" | "targetCustomer" | "primaryConversion" | "brandTone">;

const presets: Array<{ terms: string[]; profile: ProfilePreset }> = [
  { terms: ["sign", "screen", "display"], profile: { businessDescription: "We help businesses communicate clearly using managed digital displays and practical signage software.", industry: "Digital signage", services: ["Managed digital signage", "Digital menu boards", "Window displays"], targetCustomer: "Multi-location businesses and customer-facing teams", primaryConversion: "Book a call", brandTone: "Expert" } },
  { terms: ["restaurant", "cafe", "dining"], profile: { businessDescription: "We welcome local customers with thoughtfully prepared food, friendly service and a comfortable dining experience.", industry: "Hospitality", services: ["Dining", "Private events", "Reservations"], targetCustomer: "Local diners and visiting families", primaryConversion: "Make a reservation", brandTone: "Friendly" } },
  { terms: ["marketing", "agency", "creative"], profile: { businessDescription: "We help growing businesses clarify their message and turn practical marketing into sustainable customer demand.", industry: "Marketing services", services: ["Marketing strategy", "Campaign delivery", "Content support"], targetCustomer: "Growing small and medium-sized businesses", primaryConversion: "Book a call", brandTone: "Approachable" } },
  { terms: ["software", "app", "saas"], profile: { businessDescription: "We provide practical software that helps teams complete important work with less manual effort.", industry: "Business software", services: ["Software platform", "Team onboarding", "Customer support"], targetCustomer: "Operations and growth teams", primaryConversion: "Start a trial", brandTone: "Direct" } },
  { terms: ["plumb", "heating", "boiler"], profile: { businessDescription: "We provide reliable plumbing and heating services for homes and businesses in the local area.", industry: "Plumbing and heating", services: ["Emergency plumbing", "Boiler servicing", "Heating repairs"], targetCustomer: "Local homeowners and property managers", primaryConversion: "Request a quote", brandTone: "Professional" } },
  { terms: ["dental", "dentist", "smile"], profile: { businessDescription: "We help patients look after their oral health with calm, clear and considerate dental care.", industry: "Dental care", services: ["General dentistry", "Dental hygiene", "Cosmetic treatments"], targetCustomer: "Patients and families in the local area", primaryConversion: "Contact the business", brandTone: "Approachable" } },
  { terms: ["fitness", "gym", "training"], profile: { businessDescription: "We help people build sustainable fitness through supportive coaching and practical training programmes.", industry: "Fitness and wellbeing", services: ["Personal training", "Group classes", "Fitness coaching"], targetCustomer: "People looking for structured fitness support", primaryConversion: "Book a call", brandTone: "Friendly" } },
];

export function inferBusinessProfile(data: OnboardingData): ProfilePreset {
  const context = `${data.websiteUrl} ${data.businessName}`.toLowerCase();
  return presets.find(item => item.terms.some(term => context.includes(term)))?.profile ?? {
    businessDescription: `${data.businessName || "This business"} helps customers choose and use its main products or services with confidence.`,
    industry: "Business services",
    services: ["Primary service", "Customer support", "Specialist advice"],
    targetCustomer: "Customers looking for a trusted specialist",
    primaryConversion: "Request a quote",
    brandTone: "Professional",
  };
}

export const discoveryItems = [
  { label: "Homepage found", status: "Detected" },
  { label: "Services identified", status: "Needs confirmation" },
  { label: "Pricing page checked", status: "Not yet connected" },
  { label: "Blog detected", status: "Detected" },
  { label: "Contact page found", status: "Detected" },
  { label: "Sitemap checked", status: "Demonstration" },
  { label: "Page titles reviewed", status: "Demonstration" },
  { label: "Website structure prepared", status: "Ready" },
] as const;

export function createSearchQueries(data: OnboardingData) {
  const service = data.services[0] || "trusted business service";
  const second = data.services[1] || `${service} advice`;
  return data.audienceScope === "local" && data.location
    ? [`${service} in ${data.location}`, `${second} near ${data.location}`, `trusted ${data.industry || "specialist"} ${data.location}`]
    : [service, second, `${data.industry || "specialist"} for ${data.targetCustomer || "growing businesses"}`];
}

export function createCompetitorSuggestions(data: OnboardingData) {
  const label = data.industry || "specialist";
  return [
    { id: "suggestion-1", name: `Northfield ${label}`, websiteUrl: "https://northfield-example.com/", note: "Example suggestion based on the business profile." },
    { id: "suggestion-2", name: `Clearway ${label}`, websiteUrl: "https://clearway-example.com/", note: "Example suggestion for manual confirmation." },
    { id: "suggestion-3", name: `Bright Oak ${label}`, websiteUrl: "https://brightoak-example.com/", note: "Example suggestion only — not discovered online." },
  ];
}
