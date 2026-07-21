import type { Metadata } from "next";
import "./globals.css";
import { productConfig } from "@/lib/config/product";
import { DemoProvider } from "@/components/demo-provider";
import { getAppUrl, isDemoMode } from "@/lib/config/env";

export const metadata: Metadata = {
  ...productConfig.metadata,
  metadataBase: new URL(getAppUrl()),
  openGraph: {
    title: "Searchhand — Set the destination. We’ll handle the route.",
    description: productConfig.metadata.description,
    type: "website",
    siteName: "Searchhand",
  },
  twitter: {
    card: "summary_large_image",
    title: "Searchhand — Your SEO is being handled",
    description: productConfig.metadata.description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><DemoProvider demoMode={isDemoMode()}>{children}</DemoProvider></body></html>;
}
