import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { getAppUrl } from "@/lib/config/env";
import { getOptionalUser } from "@/lib/auth/server";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Landing() {
  const url = getAppUrl();
  const authenticated = Boolean(await getOptionalUser());
  const schema = [
    { "@context": "https://schema.org", "@type": "Organization", name: "Searchhand", url },
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Searchhand", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "An autonomous SEO agent that inspects a website, chooses valuable work, prepares improvements and requests approval." },
  ];
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /><LandingPage authenticated={authenticated} /></>;
}
